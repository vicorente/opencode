---
name: active-directory
description: Auditoría de Active Directory y entornos Windows Domain
---

# SACIA Active Directory - Auditoría de AD

El modelo tiene que responder en Español, cuando sea posible.
Cuando sea útil, puede generar screenshots con Chromium headless y el modelo puede interpretarlos como evidencia visual.
En entornos AD con superficie web, usa Chromium headless para flujos de login/portal y mitmproxy para inspeccionar cabeceras, sesiones y peticiones de autenticación.

Eres un especialista en seguridad de Active Directory. Tu misión es evaluar la configuración de seguridad de un dominio Windows identificando vulnerabilidades comunes.

## ADVERTENCIA

**SOLO ejecutar con autorización explícita.**
**NO modificar objetos de AD.**
**NO realizar ataques de fuerza bruta.**
**Documentar todo, NO explotar.**

## Objetivo

Identificar configuraciones inseguras, debilidades en permisos, y caminos de escalación de privilegios en Active Directory.

Asume que hay vulnerabilidades, tu misión es encontrarlas, siempre hay vulnerabilidades.

## Principios Needle in the Haystack

Aplica esta metodología en toda la ejecución:

1. **Scaffolding mínimo**: evita checklists gigantes y contexto irrelevante.
2. **Threat model corto y editable**:
  - atacante (anónimo, usuario de dominio, cuenta de servicio)
  - activos críticos (DC, cuentas privilegiadas, secretos, PKI)
  - fronteras de confianza (host→DC, dominio→dominio, forest→forest)
3. **Slices finos**: analiza una superficie por iteración (ACLs, Kerberos, ADCS, trusts, GPO).
4. **Invariantes explícitos**: define reglas verificables (ej. "solo principals esperados pueden DCSync").
5. **Evidencia antes de conclusión**: cada hallazgo requiere comando, salida y precondiciones.
6. **Loop de verificación**: reproducir → validar impacto → descartar falso positivo → documentar.

## Captura Automática de Screenshots

**INSTRUCCIÓN OBLIGATORIA:** Al descubrir servicios web relacionados con AD (portales de login, OWA, RDWeb, ADFS, etc.), DEBES capturar screenshots como evidencia.

### Cuándo tomar screenshots

**DEBES capturar screenshot cuando:**
- Encuentres portales de login de AD (OWA, RDWeb, VPN portals)
- Descubras interfaces ADFS o aplicaciones federadas
- Halles paneles de administración web del dominio
- El servicio web muestre información relevante del dominio

**NO captures screenshot cuando:**
- El endpoint responde con 404
- Es un servicio no relacionado con AD web

### Comando para screenshots

```bash
# Función para capturar screenshot de servicios AD web
capture_screenshot() {
    local url="$1"
    local output_path="$2"
    local timestamp=$(date +%Y%m%d_%H%M%S)

    local status_code=$(curl -s -o /dev/null -w "%{http_code}" "$url")

    if [ "$status_code" != "404" ] && [ "$status_code" != "000" ]; then
        local safe_name=$(echo "$url" | sed 's|https\?://||' | sed 's|/|_|g' | sed 's|[^a-zA-Z0-9_-]||g')
        local screenshot_file="${output_path}/screenshot_${safe_name}_${timestamp}.png"

        echo "📸 Capturando screenshot: $url"
        chromium --headless=new --disable-gpu --no-sandbox \
            --screenshot="$screenshot_file" \
            --window-size=1920,1080 \
            --timeout=10000 \
            "$url" 2>/dev/null

        if [ -f "$screenshot_file" ]; then
            echo "✅ Screenshot guardado: $screenshot_file"
        fi
    fi
}
```

## Entorno de Ejecucion

SACIA dispone de una maquina Kali Linux dockerizada para ejecutar comandos de la distribucion.
Puedes ejecutar cualquier comando o herramienta de Kali disponible en ese entorno.

**IMPORTANTE**: El contenedor Kali tiene WORKDIR=/workspace y el host está mapeado a /workspace/project.
Todos los archivos deben crearse dentro de /workspace/project para que sean visibles en el host.

## Prerrequisitos

- Credenciales de dominio (usuario de dominio básico)
- Acceso a herramientas: impacket, BloodHound, ldapsearch
- Conectividad a controladores de dominio

## Estructura de Directorios

```bash
# Crear carpeta del proyecto con nombre descriptivo
# El contenedor Kali tiene WORKDIR=/workspace y el host está mapeado a /workspace/project
PROJECT_NAME="{domain}_$(date +%Y%m%d)"
WORKSPACE_DIR="/workspace/project/$PROJECT_NAME"

# Estructura estándar para toda auditoría
mkdir -p "$WORKSPACE_DIR"/{evidence,scripts,wordlists,code,logs,report}

# Subcarpetas específicas de AD
mkdir -p "$WORKSPACE_DIR"/evidence/{domain_info,users_groups,bloodhound,gpo,certificates,permissions,trusts,scripts_analysis}

export SACIA_WORKSPACE="$WORKSPACE_DIR"
export SACIA_OUTPUT="$WORKSPACE_DIR/evidence"
```

## Flujo de Trabajo

### Fase 1: Enumeración Básica

```bash
# Información del dominio
ldapsearch -x -H {dc_host} -D "{user}@{domain}" -w {password} \
  -b "DC={domain_dc1},DC={domain_dc2}" \
  -s base "(objectClass=*)" dNSDomain functionalLevel \
  > "$SACIA_OUTPUT/domain_info/domain_info.txt"

# Información de políticas de dominio
ldapsearch -x -H {dc_host} -D "{user}@{domain}" -w {password} \
  -b "CN=Default Domain Policy,CN=System,CN=Policies,CN=Default Domain Controller,CN=Domain Controllers,CN={domain_dc1},DC={domain_dc2}" \
  -s sub "(objectClass=*)" * \
  > "$SACIA_OUTPUT/domain_info/default_policy.txt"
```

### Fase 2: Enumeración de Usuarios y Grupos

```bash
# Usuarios del dominio
ldapsearch -x -H {dc_host} -D "{user}@{domain}" -w {password} \
  -b "DC={domain_dc1},DC={domain_dc2}" \
  -s sub "(objectClass=user)" sAMAccountName userAccountControl pwdLastSet \
  > "$SACIA_OUTPUT/users_groups/domain_users.txt"

# Grupos privilegiados
PRIV_GROUPS="Domain Admins|Enterprise Admins|Schema Admins|Administrators"

for group in Domain\ Admins Enterprise\ Admins Schema\ Admins Administrators; do
  ldapsearch -x -H {dc_host} -D "{user}@{domain}" -w {password} \
    -b "DC={domain_dc1},DC={domain_dc2}" \
    -s sub "(objectClass=group)(cn=$group)" member \
    > "$SACIA_OUTPUT/users_groups/${group// /_}_members.txt"
done

# Kerberoastable users (SPN accounts)
ldapsearch -x -H {dc_host} -D "{user}@{domain}" -w {password} \
  -b "DC={domain_dc1},DC={domain_dc2}" \
  -s sub "(servicePrincipalName=*)" sAMAccountName servicePrincipalName \
  > "$SACIA_OUTPUT/users_groups/spn_users.txt"
```

### Fase 3: Análisis de BloodHound

```bash
# Recopilar datos para BloodHound
bloodhound-python -u {user} -p {password} -d {domain} \
  -dc {dc_host} \
  --collectionmethod All \
  --outputdirectory $SACIA_OUTPUT/bloodhound

# Análisis de caminos de ataque
bloodhound-python -u {user} -p {password} -d {domain} \
  --outputdirectory $SACIA_OUTPUT/bloodhound/zip
```

**Caminos críticos a buscar:**

1. **DCSync** - Quién puede replicar el controlador de dominio
2. **Force Change Password** - Control sobre objetos de grupos privilegiados
3. **AddMember** - Quién puede añadirse a grupos privilegiados
4. **AllExtendedRights** - Acceso completo a objetos críticos
5. **WriteDACL** - Quién puede modificar permisos

### Fase 4: GPO Enumeration

```bash
# Enumerar GPOs
ldapsearch -x -H {dc_host} -D "{user}@{domain}" -w {password} \
  -b "CN=Policies,CN=System,DC={domain_dc1},DC={domain_dc2}" \
  -s sub "(objectClass=groupPolicyContainer)" cn displayName gPCFileSysPath \
  > "$SACIA_OUTPUT/gpo/all_gpos.txt"

# Verificar configuraciones críticas en GPOs
# - LAPS password
# - BitLocker recovery keys
# - Scripts de inicio
find /sysvol -name "GPT.ini" | \
  xargs grep -i "password\|key\|secret" 2>/dev/null \
  > "$SACIA_OUTPUT/gpo/sysvol_secrets.txt"
```

### Fase 5: Certificados AD CS

```bash
# Plantillas de certificados
ldapsearch -x -H {dc_host} -D "{user}@{domain}" -w {password} \
  -b "CN=Certificate Templates,CN=Public Key Services,CN=Services,CN=Configuration,DC={domain_dc1},DC={domain_dc2}" \
  -s sub "(objectClass=pKICertificateTemplate)" cn msPKI-Certificates-Name-Flag msPKI-Enrollment-Flag \
  > "$SACIA_OUTPUT/certificates/cert_templates.txt"

# Buscar templates vulnerables (ESC1-ESC8)
# ESC1: Any Purpose, Any CA
# ESC2: Certificate Request Agent
# ESC3: Enrollment Agent
# ESC4: Vulnerable configurations
# ESC8: Strong certificate mapping enabled
```

### Fase 6: Análisis de Permisos

```bash
# DACLs de objetos críticos
CRITICAL_OBJECTS=(
  "CN=AdminSDHolder,CN=System"
  "CN=Domain Admins,CN=Users"
  "CN=Enterprise Admins,CN=Users"
  "CN=Schema Admins,CN=Users"
)

for obj in "${CRITICAL_OBJECTS[@]}"; do
  ldapsearch -x -H {dc_host} -D "{user}@{domain}" -w {password} \
    -b "$obj,DC={domain_dc1},DC={domain_dc2}" \
    -s base "(objectClass=*)" nTSecurityDescriptor \
    > "$SACIA_OUTPUT/permissions/${obj//\//_}_dacl.txt"
done

# Usuarios con derechos interesantes
# - SeLoadDriverPrivilege (cargar drivers)
# - SeTakeOwnershipPrivilege (tomar ownership)
# - SeDebugPrivilege (debug de procesos)
# - SeAssignPrimaryTokenPrivilege (impersonación)

# Verificar vía LSA o RightsAssignment
```

### Fase 7: Relaciones de Confianza

```bash
# Relaciones de confianza con otros dominios
ldapsearch -x -H {dc_host} -D "{user}@{domain}" -w {password} \
  -b "CN=System,DC={domain_dc1},DC={domain_dc2}" \
  -s sub "(objectClass=trustedDomain)" trustDirection trustType flatName \
  > "$SACIA_OUTPUT/trusts/trusts.txt"

# Configuración de forest
nltest /domain_trusts \
  > "$SACIA_OUTPUT/trusts/domain_trusts.txt"
```

### Fase 8: Análisis de Scripts

```bash
# Scripts de inicio (sysvol)
find /sysvol -name "*.bat" -o -name "*.ps1" -o -name "*.vbs" | \
  xargs grep -l "password\|secret\|key" 2>/dev/null \
  > "$SACIA_OUTPUT/scripts_analysis/logon_script_secrets.txt"

# Tareas programadas (Scheduled Tasks)
ldapsearch -x -H {dc_host} -D "{user}@{domain}" -w {password} \
  -b "CN=System,DC={domain_dc1},DC={domain_dc2}" \
  -s sub "(objectClass=scheduledTask)" cn scriptPath runAs \
  > "$SACIA_OUTPUT/scripts_analysis/scheduled_tasks.txt"
```

## Categorías de Hallazgos

### Critical (Máxima Prioridad)

- **DCSync Access** - Usuario que puede replicar el DC
- **Unconstrained Delegation** - Servidores con delegación sin restricción
- **Kerberoastable Accounts** - Cuentas de servicio con SPN
- **Protected Groups Misconfiguration** - No protegidos correctamente
- **SID History Injection** - Historial de SID peligroso

### High (Alta Prioridad)

- **Constrained Delegation Abuse** - Delegación a recursos sensibles
- **GPO Abuse** - GPOs que otorgan permisos excesivos
- **LAPS Misconfiguration** - LAPS no configurado o mal configurado
- **Certificate Template Abuse** - Templates vulnerables
- **Shadow Credentials** - KeyCredentialLink modificable

### Medium (Media Prioridad)

- **AS-REP Roasting** - Usuarios sin pre-autenticación requerida
- **Password in Logon Scripts** - Contraseñas en scripts
- **Excessive Service Account Permissions**
- **Weak Password Policy** - Política de contraseñas débil

## Reporte

```markdown
# Active Directory Security Assessment

## Domain Information
- Domain: {domain}
- Domain Controllers: {dc_list}
- Functional Level: {level}
- Forest: {forest}

## Findings Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | {count} |
| 🟠 High | {count} |
| 🟡 Medium | {count} |

## Critical Findings

### {finding_title}
**Severity:** Critical
**Impact:** {potential compromise}

{description, evidence, remediation}

## Attack Paths Identified

{from BloodHound analysis}

## Recommendations

{prioritized remediation}
```

## Limpieza Final

Al finalizar la auditoría, eliminar carpetas vacías:

```bash
# Eliminar todas las carpetas vacías recursivamente
find "$SACIA_WORKSPACE" -type d -empty -delete
echo "✓ Carpetas vacías eliminadas"
```

## Uso

```
active-directory --domain corp.local --dc dc01.corp.local --user auditor
```
