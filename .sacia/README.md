# SACIA - Sistema de Auditoria de Ciberseguridad Asistido por IA

Skills de ciberseguridad integrados en opencode para auditoria de seguridad automatizada.

## Skills Disponibles

| Skill | Descripcion | Uso |
|-------|-------------|-----|
| `full-audit` | Auditoria de seguridad integral con ejecucion autonoma | `/full-audit example.com` |
| `recon-only` | Reconocimiento pasivo sin escaneo invasivo | `/recon-only example.com` |
| `web-audit` | Auditoria de seguridad web (auth, input validation, APIs) | `/web-audit https://target.com` |
| `api-security` | Seguridad REST/GraphQL/API | `/api-security https://api.target.com` |
| `exploit` | Verificacion etica de vulnerabilidades confirmadas | `/exploit target:443 --vuln CVE-XXXX` |
| `bug-bounty` | Bug bounty hunting y caza de vulnerabilidades | `/bug-bounty https://target.com` |
| `ctf` | Resolucion autonoma de retos CTF (HTB, THM) | `/ctf 10.10.10.10` |
| `container-security` | Seguridad Docker/Kubernetes | `/container-security --image nginx` |
| `active-directory` | Auditoria AD (users, groups, BloodHound, GPOs) | `/active-directory --domain corp.local` |
| `network-audit` | Auditoria de infraestructura de red | `/network-audit 192.168.1.0/24` |
| `professional-report` | Generacion de reportes ejecutivos y tecnicos | `/professional-report --session-dir ./evidence` |
| `memory_analysis` | Analisis forense de memoria | `/memory_analysis --dump memory.dmp` |

## Instalación

### 1. Construir e Iniciar el Contenedor Kali

El script de gestión está en `.sacia/docker/sacia-kali.sh`:

```bash
cd /path/to/opencode/.sacia/docker

# Construir la imagen (solo la primera vez, ~15 min)
./sacia-kali.sh build

# Iniciar el contenedor
./sacia-kali.sh start

# Verificar estado
./sacia-kali.sh status

# Abrir shell en Kali
./sacia-kali.sh shell
```

### 2. Inicio Automático al Arrancar el Sistema

El contenedor se puede configurar para iniciarse automáticamente:

```bash
# Instalar servicio de inicio automático
./sacia-kali.sh install-auto

# Verificar que el contenedor se inicia automáticamente
# - macOS: launchd (~/.Library/LaunchAgents/com.sacia.kali.plist)
# - Linux: systemd (/etc/systemd/system/sacia-kali.service)
```

Para desinstalar el inicio automático:
```bash
./sacia-kali.sh uninstall-auto
```

### 3. Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `./sacia-kali.sh build` | Construir la imagen Docker |
| `./sacia-kali.sh start` | Iniciar el contenedor |
| `./sacia-kali.sh stop` | Detener el contenedor |
| `./sacia-kali.sh status` | Ver estado |
| `./sacia-kali.sh shell` | Abrir shell en Kali |
| `./sacia-kali.sh exec <cmd>` | Ejecutar comando |
| `./sacia-kali.sh logs` | Ver logs |
| `./sacia-kali.sh update` | Actualizar imagen |
| `./sacia-kali.sh install-auto` | Instalar inicio automático |
| `./sacia-kali.sh uninstall-auto` | Desinstalar inicio automático |

### Requisitos

- **Docker** instalado y corriendo
- **~5GB** de espacio en disco (imagen + herramientas)

### Herramientas Incluidas

- **Reconocimiento:** nmap, rustscan, httpx, subfinder
- **Analisis de vulnerabilidades:** nuclei, nikto, sqlmap
- **Fuzzing:** ffuf, gobuster, wfuzz
- **Active Directory:** enum4linux-ng, nxc (netexec), impacket
- **Post-explotacion:** LinPEAS, WinPEAS
- **Screenshots:** Chromium headless

## Metodologia

Los skills siguen la metodologia **Needle in the Haystack**:

1. **Scaffolding minimo** - contexto persistente corto, accionable y actualizado
2. **Threat model corto y editable** - atacante, activos expuestas y fronteras publicas
3. **Slices finos** - dividir por superficie (auth, parsing, upload, boundary, sandbox)
4. **Invariantes explicitos** - reglas de seguridad verificables por slice
5. **Evidencia antes de conclusion** - hallazgos con pruebas concretas, no inferencias genericas
6. **Loop de verificacion** - reproducir, validar impacto y priorizar antes de reportar

## Estructura de Evidencias

```
{project}_audit_YYYYMMDD/
├── evidence/
│   ├── recon/
│   │   ├── subdomains/
│   │   ├── ips/
│   │   ├── ports/
│   │   └── http/
│   ├── fuzzing/
│   │   ├── dirs/
│   │   ├── params/
│   │   ├── api/
│   │   └── vulns/
│   ├── exploitation/
│   ├── post-exploit/
│   └── screenshots/
├── scripts/
│   ├── python/
│   ├── bash/
│   └── exploits/
├── wordlists/
│   ├── custom/
│   └── generated/
├── code/
│   ├── poc/
│   └── tools/
├── report/
└── audit.log
```

## Captura de Screenshots

Todos los skills incluyen captura automatica de screenshots con Chromium headless:

```bash
# Funcion de captura (integrada en skills)
capture_screenshot "https://target.com" "$SACIA_OUTPUT/screenshots"
```

Los screenshots se guardan con metadatos en `screenshots_index.csv`.

## Disclaimer

**IMPORTANTE:**

Esta herramienta debe usarse unicamente:
1. En sistemas de tu propiedad
2. Con autorizacion explicita por escrito
3. En cumplimiento de leyes locales e internacionales
4. Siguiendo principios de hacking etico

El uso no autorizado puede constituir un delito.

---

**SACIA** - Security Assessment Comprehensive Intelligent Agent
