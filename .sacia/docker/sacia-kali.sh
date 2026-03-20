#!/bin/bash
# SACIA Kali Docker Manager
# Gestiona el contenedor Kali para auditorías de seguridad
# Multiplataforma: macOS y Linux

set -e

CONTAINER_NAME="sacia-kali"
IMAGE_NAME="sacia-kali"
IMAGE_TAG="latest"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE="${HOME}/.sacia/workspace"

# Detectar OS
OS="$(uname -s)"
case "$OS" in
    Darwin) DISTRO="macos" ;;
    Linux)  DISTRO="linux" ;;
    *)      DISTRO="unknown" ;;
esac

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker no está instalado"
        log_info "Instala Docker desde: https://docs.docker.com/get-docker/"
        exit 1
    fi
    if ! docker info &> /dev/null; then
        log_error "Docker no está corriendo"
        log_info "Inicia Docker Desktop o el daemon de Docker"
        exit 1
    fi
}

build() {
    check_docker
    log_info "Construyendo imagen ${IMAGE_NAME}:${IMAGE_TAG}..."
    log_info "Esto puede tardar varios minutos (descarga ~2GB de herramientas)..."
    cd "$SCRIPT_DIR"
    docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .
    log_success "Imagen construida correctamente"
}

start() {
    check_docker

    if docker ps -q --filter "name=${CONTAINER_NAME}" | grep -q .; then
        log_warn "El contenedor ${CONTAINER_NAME} ya está corriendo"
        return 0
    fi

    if docker ps -aq --filter "name=${CONTAINER_NAME}" | grep -q .; then
        log_info "Iniciando contenedor existente..."
        docker start "${CONTAINER_NAME}"
        log_success "Contenedor iniciado"
        return 0
    fi

    log_info "Creando e iniciando contenedor ${CONTAINER_NAME}..."

    # Crear directorio de workspace si no existe
    mkdir -p "${WORKSPACE}"

    docker run -d \
        --name "${CONTAINER_NAME}" \
        -v "${WORKSPACE}:/workspace/project" \
        -v /var/run/docker.sock:/var/run/docker.sock \
        --network host \
        --cap-add=NET_ADMIN \
        --restart unless-stopped \
        "${IMAGE_NAME}:${IMAGE_TAG}"

    log_success "Contenedor creado e iniciado"
    log_info "Workspace: ${WORKSPACE}"
    log_info "El contenedor se reiniciará automáticamente al arrancar el sistema"
}

stop() {
    log_info "Deteniendo contenedor ${CONTAINER_NAME}..."
    docker stop "${CONTAINER_NAME}" 2>/dev/null || true
    log_success "Contenedor detenido"
}

restart() {
    stop
    start
}

status() {
    check_docker
    if docker ps -q --filter "name=${CONTAINER_NAME}" | grep -q .; then
        log_success "Contenedor ${CONTAINER_NAME} está corriendo"
        echo ""
        docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.ID}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        log_info "Workspace: ${WORKSPACE}"
    elif docker ps -aq --filter "name=${CONTAINER_NAME}" | grep -q .; then
        log_warn "Contenedor ${CONTAINER_NAME} existe pero está detenido"
    else
        log_warn "Contenedor ${CONTAINER_NAME} no existe"
        log_info "Ejecuta '$(basename "$0") build' para crear la imagen"
    fi
}

shell() {
    check_docker
    if ! docker ps -q --filter "name=${CONTAINER_NAME}" | grep -q .; then
        log_error "El contenedor no está corriendo"
        log_info "Ejecuta '$(basename "$0") start' primero"
        return 1
    fi
    docker exec -it "${CONTAINER_NAME}" /bin/bash
}

exec_cmd() {
    if ! docker ps -q --filter "name=${CONTAINER_NAME}" | grep -q .; then
        log_error "El contenedor no está corriendo"
        return 1
    fi
    docker exec "${CONTAINER_NAME}" "$@"
}

logs() {
    docker logs "${CONTAINER_NAME}" "$@"
}

remove() {
    log_warn "Esto eliminará el contenedor y todos sus datos"
    read -p "¿Estás seguro? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker stop "${CONTAINER_NAME}" 2>/dev/null || true
        docker rm "${CONTAINER_NAME}" 2>/dev/null || true
        log_success "Contenedor eliminado"
    fi
}

update() {
    log_info "Actualizando imagen de Kali..."
    stop
    docker rmi "${IMAGE_NAME}:${IMAGE_TAG}" 2>/dev/null || true
    build
    log_success "Imagen actualizada. Ejecuta '$(basename "$0") start' para iniciar"
}

install_autostart() {
    log_info "Configurando inicio automático para ${DISTRO}..."

    if [ "$DISTRO" = "macos" ]; then
        PLIST_NAME="com.sacia.kali.plist"
        PLIST_PATH="${HOME}/Library/LaunchAgents/${PLIST_NAME}"

        cat > "${PLIST_PATH}" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.sacia.kali</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>${SCRIPT_DIR}/sacia-kali.sh start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>/tmp/sacia-kali.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/sacia-kali.log</string>
</dict>
</plist>
EOF

        launchctl load "${PLIST_PATH}" 2>/dev/null || true
        log_success "Servicio launchd instalado y cargado"
        log_info "Plist: ${PLIST_PATH}"

    elif [ "$DISTRO" = "linux" ]; then
        SERVICE_NAME="sacia-kali.service"
        SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}"

        sudo bash -c "cat > ${SERVICE_PATH}" << EOF
[Unit]
Description=SACIA Kali Docker Container
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/docker start sacia-kali
ExecStop=/usr/bin/docker stop sacia-kali

[Install]
WantedBy=multi-user.target
EOF

        sudo systemctl daemon-reload
        sudo systemctl enable "${SERVICE_NAME}"
        log_success "Servicio systemd instalado y habilitado"
        log_info "Servicio: ${SERVICE_PATH}"
    else
        log_error "Sistema operativo no soportado: ${DISTRO}"
        return 1
    fi

    log_info "El contenedor se iniciará automáticamente al arrancar el sistema"
}

uninstall_autostart() {
    log_info "Desinstalando inicio automático..."

    if [ "$DISTRO" = "macos" ]; then
        PLIST_PATH="${HOME}/Library/LaunchAgents/com.sacia.kali.plist"
        launchctl unload "${PLIST_PATH}" 2>/dev/null || true
        rm -f "${PLIST_PATH}"
        log_success "Servicio launchd desinstalado"

    elif [ "$DISTRO" = "linux" ]; then
        SERVICE_NAME="sacia-kali.service"
        sudo systemctl disable "${SERVICE_NAME}" 2>/dev/null || true
        sudo rm -f "/etc/systemd/system/${SERVICE_NAME}"
        sudo systemctl daemon-reload
        log_success "Servicio systemd desinstalado"
    fi
}

usage() {
    cat << EOF
SACIA Kali Docker Manager (Multiplataforma: macOS/Linux)

Uso: $(basename "$0") [comando]

Comandos:
    build           Construir la imagen Docker
    start           Iniciar el contenedor
    stop            Detener el contenedor
    restart         Reiniciar el contenedor
    status          Ver estado del contenedor
    shell           Abrir shell en el contenedor
    exec            Ejecutar comando en el contenedor
    logs            Ver logs del contenedor
    remove          Eliminar el contenedor
    update          Actualizar la imagen (rebuild)

Inicio automático:
    install-auto    Instalar servicio de inicio automático
                    - macOS: launchd (~/.Library/LaunchAgents/)
                    - Linux: systemd (/etc/systemd/system/)
    uninstall-auto  Desinstalar servicio de inicio automático

Notas:
    - El contenedor usa --restart unless-stopped por defecto
    - Workspace: ${WORKSPACE}
    - Sistema detectado: ${DISTRO}

EOF
}

case "${1:-}" in
    build)          build ;;
    start)          start ;;
    stop)           stop ;;
    restart)        restart ;;
    status)         status ;;
    shell)          shell ;;
    exec)           shift; exec_cmd "$@" ;;
    logs)           shift; logs "$@" ;;
    remove)         remove ;;
    update)         update ;;
    install-auto)   install_autostart ;;
    uninstall-auto) uninstall_autostart ;;
    help|--help|-h) usage ;;
    *)              usage; exit 1 ;;
esac
