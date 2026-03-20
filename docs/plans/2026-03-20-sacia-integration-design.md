# Diseño de Integración: SACIA Skills en OpenCode

**Fecha:** 2026-03-20
**Versión:** 1.0.0
**Estado:** Aprobado

---

## Resumen Ejecutivo

Integrar los skills de ciberseguridad de SACIA (Sistema de Auditoría de Ciberseguridad Asistido por IA) en el proyecto opencode, manteniendo el branding SACIA y la compatibilidad con el entorno Kali Linux dockerizado.

**Enfoque seleccionado:** Minimalista - Copiar skills sin modificar el core de opencode.

---

## Decisiones de Diseño

| Aspecto | Decisión | Rationale |
|---------|----------|-----------|
| Branding | Mantener SACIA | Preservar identidad del sistema de auditoría |
| Skills | Los 12 skills completos | Funcionalidad completa de auditoría |
| Entorno Kali | Docker Kali (mismo Dockerfile SACIA) | Compatibilidad con herramientas de seguridad |
| Sistema RAG | No incluir | Mantener integración simple |
| Ubicación | `.sacia/skills/` | Separación clara de responsabilidades |

---

## Estructura de Directorios

```
opencode/
├── .sacia/
│   ├── skills/
│   │   ├── full-audit/SKILL.md
│   │   ├── recon-only/SKILL.md
│   │   ├── web-audit/SKILL.md
│   │   ├── api-security/SKILL.md
│   │   ├── exploit/SKILL.md
│   │   ├── bug-bounty/SKILL.md
│   │   ├── ctf/SKILL.md
│   │   ├── container-security/SKILL.md
│   │   ├── active-directory/SKILL.md
│   │   ├── network-audit/SKILL.md
│   │   ├── professional-report/SKILL.md
│   │   └── memory_analysis/SKILL.md
│   └── README.md
└── [resto de opencode sin cambios]
```

---

## Skills a Integrar

| Skill | Descripción | Tipo |
|-------|-------------|------|
| **full-audit** | Auditoría de seguridad integral con ejecución autónoma | Principal |
| **recon-only** | Reconocimiento pasivo sin escaneo invasivo | Principal |
| **web-audit** | Auditoría de seguridad web (auth, input validation, APIs) | Principal |
| **api-security** | Seguridad REST/GraphQL/API | Principal |
| **exploit** | Verificación ética de vulnerabilidades confirmadas | Principal |
| **bug-bounty** | Caza de vulnerabilidades para programas bug bounty | Principal |
| **ctf** | Resolución autónoma de retos CTF (HTB, THM) | Principal |
| **container-security** | Seguridad Docker/Kubernetes | Especializado |
| **active-directory** | Auditoría AD (users, groups, BloodHound, GPOs) | Especializado |
| **network-audit** | Auditoría de infraestructura de red | Especializado |
| **professional-report** | Generación de reportes ejecutivos y técnicos | Soporte |
| **memory_analysis** | Análisis forense de memoria | Especializado |

---

## Adaptaciones a los Skills

Los skills se copiarán con adaptaciones mínimas:

**Sin cambios:**
- Frontmatter (name, description)
- Metodología "Needle in the Haystack"
- Comandos de Kali Docker (`/workspace/project`)
- Función de captura de screenshots (`capture_screenshot()`)
- Estructura de evidencias (`$SACIA_OUTPUT/`, `$SACIA_WORKSPACE/`)
- Patrones de detección de vulnerabilidades
- Templates de reportes

**Sin cambios adicionales:**
- Chromium headless corre dentro del contenedor Kali Docker
- Se usará el mismo Dockerfile de SACIA-TEST

---

## Uso de los Skills

Los skills se invocarán como comandos slash desde opencode:

```
/full-audit example.com
/recon-only example.com
/bug-bounty https://target.com
/ctf 10.10.10.10
/exploit target.com:443 --vuln "CVE-2024-XXXX"
/api-security https://api.target.com
/container-security --image nginx:latest
/active-directory --domain corp.local
/network-audit 192.168.1.0/24
/professional-report --session-dir ./evidence
/memory_analysis --dump memory.dmp
```

### Requisitos Previos

1. **Contenedor Kali Docker:**
   - Usar el mismo Dockerfile de SACIA-TEST
   - WORKDIR=/workspace
   - Host mapeado a /workspace/project

2. **Herramientas en Kali:**
   - nmap, nuclei, httpx, ffuf, sqlmap
   - Chromium headless para screenshots
   - enum4linux-ng, nxc, impacket (para AD)
   - LinPEAS, WinPEAS (para CTF)

---

## Plan de Implementación

### Paso 1: Preparación del Entorno
- Copiar Dockerfile de SACIA-TEST a opencode
- Verificar configuración del contenedor Kali

### Paso 2: Crear Estructura
- Crear directorio `.sacia/skills/`

### Paso 3: Copiar Skills (12 skills)
- Copiar cada skill desde SACIA-TEST/.agents/skills/ a .sacia/skills/

### Paso 4: Documentación
- Crear `.sacia/README.md`
- Actualizar README principal con referencia a SACIA

### Paso 5: Verificación
- Verificar reconocimiento de skills
- Probar invocación de skills

---

## Fuente

**Proyecto SACIA-TEST:** `/Users/victorgonzalezllorente/Hacking/projects/SACIA-TEST/`
**Skills originales:** `SACIA-TEST/.agents/skills/`

---

## Aprobación

**Diseño aprobado por:** Usuario
**Fecha de aprobación:** 2026-03-20
