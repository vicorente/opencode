# SACIA Skills Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrar los 12 skills de ciberseguridad de SACIA en opencode manteniendo branding y compatibilidad con Kali Docker.

**Architecture:** Copiar skills de SACIA-TEST a .sacia/skills/ sin modificar el core de opencode. Los skills se invocan como comandos slash y ejecutan en el contenedor Kali Docker existente.

**Tech Stack:** Markdown skills, Docker/Kali Linux, Bash scripts, Chromium headless

---

## Prerequisites

- Acceso a proyecto SACIA-TEST en `/Users/victorgonzalezllorente/Hacking/projects/SACIA-TEST/`
- Contenedor Kali Docker configurado (usar Dockerfile de SACIA-TEST)
- opencode funcional

---

## Task 1: Crear Estructura de Directorios

**Files:**
- Create: `.sacia/`
- Create: `.sacia/skills/`

**Step 1: Crear directorio base de SACIA**

```bash
mkdir -p /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills
```

Run: `ls -la /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/`
Expected: Directorio `skills/` creado

**Step 2: Commit estructura vacía**

```bash
cd /Users/victorgonzalezllorente/Hacking/projects/opencode
git add .sacia/
git commit -m "chore: create .sacia directory structure for security skills"
```

---

## Task 2: Copiar Skill full-audit

**Files:**
- Copy: `SACIA-TEST/.agents/skills/full-audit/` → `.sacia/skills/full-audit/`

**Step 1: Copiar skill full-audit**

```bash
cp -r /Users/victorgonzalezllorente/Hacking/projects/SACIA-TEST/.agents/skills/full-audit /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills/
```

Run: `ls -la /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills/full-audit/`
Expected: `SKILL.md` presente

**Step 2: Verificar contenido del skill**

```bash
head -10 /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills/full-audit/SKILL.md
```

Expected: Frontmatter con `name: full-audit`

**Step 3: Commit**

```bash
cd /Users/victorgonzalezllorente/Hacking/projects/opencode
git add .sacia/skills/full-audit/
git commit -m "feat(sacia): add full-audit skill for comprehensive security audits"
```

---

## Task 3: Copiar Skill recon-only

**Files:**
- Copy: `SACIA-TEST/.agents/skills/recon-only/` → `.sacia/skills/recon-only/`

**Step 1: Copiar skill recon-only**

```bash
cp -r /Users/victorgonzalezllorente/Hacking/projects/SACIA-TEST/.agents/skills/recon-only /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills/
```

**Step 2: Commit**

```bash
cd /Users/victorgonzalezllorente/Hacking/projects/opencode
git add .sacia/skills/recon-only/
git commit -m "feat(sacia): add recon-only skill for passive reconnaissance"
```

---

## Task 4: Copiar Skill web-audit

**Files:**
- Copy: `SACIA-TEST/.agents/skills/web-audit/` → `.sacia/skills/web-audit/`

**Step 1: Copiar skill web-audit**

```bash
cp -r /Users/victorgonzalezllorente/Hacking/projects/SACIA-TEST/.agents/skills/web-audit /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills/
```

**Step 2: Commit**

```bash
cd /Users/victorgonzalezllorente/Hacking/projects/opencode
git add .sacia/skills/web-audit/
git commit -m "feat(sacia): add web-audit skill for web application security"
```

---

## Task 5: Copiar Skill api-security

**Files:**
- Copy: `SACIA-TEST/.agents/skills/api-security/` → `.sacia/skills/api-security/`

**Step 1: Copiar skill api-security**

```bash
cp -r /Users/victorgonzalezllorente/Hacking/projects/SACIA-TEST/.agents/skills/api-security /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills/
```

**Step 2: Commit**

```bash
cd /Users/victorgonzalezllorente/Hacking/projects/opencode
git add .sacia/skills/api-security/
git commit -m "feat(sacia): add api-security skill for REST/GraphQL security testing"
```

---

## Task 6: Copiar Skill exploit

**Files:**
- Copy: `SACIA-TEST/.agents/skills/exploit/` → `.sacia/skills/exploit/`

**Step 1: Copiar skill exploit**

```bash
cp -r /Users/victorgonzalezllorente/Hacking/projects/SACIA-TEST/.agents/skills/exploit /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills/
```

**Step 2: Commit**

```bash
cd /Users/victorgonzalezllorente/Hacking/projects/opencode
git add .sacia/skills/exploit/
git commit -m "feat(sacia): add exploit skill for ethical vulnerability verification"
```

---

## Task 7: Copiar Skill bug-bounty

**Files:**
- Copy: `SACIA-TEST/.agents/skills/bug-bounty/` → `.sacia/skills/bug-bounty/`

**Step 1: Copiar skill bug-bounty**

```bash
cp -r /Users/victorgonzalezllorente/Hacking/projects/SACIA-TEST/.agents/skills/bug-bounty /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills/
```

**Step 2: Commit**

```bash
cd /Users/victorgonzalezllorente/Hacking/projects/opencode
git add .sacia/skills/bug-bounty/
git commit -m "feat(sacia): add bug-bounty skill for vulnerability hunting"
```

---

## Task 8: Copiar Skill ctf

**Files:**
- Copy: `SACIA-TEST/.agents/skills/ctf/` → `.sacia/skills/ctf/`

**Step 1: Copiar skill ctf**

```bash
cp -r /Users/victorgonzalezllorente/Hacking/projects/SACIA-TEST/.agents/skills/ctf /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills/
```

**Step 2: Commit**

```bash
cd /Users/victorgonzalezllorente/Hacking/projects/opencode
git add .sacia/skills/ctf/
git commit -m "feat(sacia): add ctf skill for Capture The Flag challenges"
```

---

## Task 9: Copiar Skill container-security

**Files:**
- Copy: `SACIA-TEST/.agents/skills/container-security/` → `.sacia/skills/container-security/`

**Step 1: Copiar skill container-security**

```bash
cp -r /Users/victorgonzalezllorente/Hacking/projects/SACIA-TEST/.agents/skills/container-security /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills/
```

**Step 2: Commit**

```bash
cd /Users/victorgonzalezllorente/Hacking/projects/opencode
git add .sacia/skills/container-security/
git commit -m "feat(sacia): add container-security skill for Docker/K8s auditing"
```

---

## Task 10: Copiar Skill active-directory

**Files:**
- Copy: `SACIA-TEST/.agents/skills/active-directory/` → `.sacia/skills/active-directory/`

**Step 1: Copiar skill active-directory**

```bash
cp -r /Users/victorgonzalezllorente/Hacking/projects/SACIA-TEST/.agents/skills/active-directory /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills/
```

**Step 2: Commit**

```bash
cd /Users/victorgonzalezllorente/Hacking/projects/opencode
git add .sacia/skills/active-directory/
git commit -m "feat(sacia): add active-directory skill for AD security auditing"
```

---

## Task 11: Copiar Skill network-audit

**Files:**
- Copy: `SACIA-TEST/.agents/skills/network-audit/` → `.sacia/skills/network-audit/`

**Step 1: Copiar skill network-audit**

```bash
cp -r /Users/victorgonzalezllorente/Hacking/projects/SACIA-TEST/.agents/skills/network-audit /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills/
```

**Step 2: Commit**

```bash
cd /Users/victorgonzalezllorente/Hacking/projects/opencode
git add .sacia/skills/network-audit/
git commit -m "feat(sacia): add network-audit skill for infrastructure security"
```

---

## Task 12: Copiar Skill professional-report

**Files:**
- Copy: `SACIA-TEST/.agents/skills/professional-report/` → `.sacia/skills/professional-report/`

**Step 1: Copiar skill professional-report**

```bash
cp -r /Users/victorgonzalezllorente/Hacking/projects/SACIA-TEST/.agents/skills/professional-report /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills/
```

**Step 2: Commit**

```bash
cd /Users/victorgonzalezllorente/Hacking/projects/opencode
git add .sacia/skills/professional-report/
git commit -m "feat(sacia): add professional-report skill for security documentation"
```

---

## Task 13: Copiar Skill memory_analysis

**Files:**
- Copy: `SACIA-TEST/.agents/skills/memory_analysis/` → `.sacia/skills/memory_analysis/`

**Step 1: Copiar skill memory_analysis**

```bash
cp -r /Users/victorgonzalezllorente/Hacking/projects/SACIA-TEST/.agents/skills/memory_analysis /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills/
```

**Step 2: Commit**

```bash
cd /Users/victorgonzalezllorente/Hacking/projects/opencode
git add .sacia/skills/memory_analysis/
git commit -m "feat(sacia): add memory_analysis skill for forensic analysis"
```

---

## Task 14: Crear README de SACIA

**Files:**
- Create: `.sacia/README.md`

**Step 1: Crear documentación de SACIA**

```markdown
# SACIA - Sistema de Auditoría de Ciberseguridad Asistido por IA

Skills de ciberseguridad integrados en opencode para auditoría de seguridad automatizada.

## Skills Disponibles

| Skill | Descripción | Uso |
|-------|-------------|-----|
| `full-audit` | Auditoría de seguridad integral | `/full-audit example.com` |
| `recon-only` | Reconocimiento pasivo | `/recon-only example.com` |
| `web-audit` | Auditoría web | `/web-audit https://target.com` |
| `api-security` | Seguridad de APIs | `/api-security https://api.target.com` |
| `exploit` | Verificación de vulnerabilidades | `/exploit target:443 --vuln CVE-XXXX` |
| `bug-bounty` | Bug bounty hunting | `/bug-bounty https://target.com` |
| `ctf` | Resolución de CTF | `/ctf 10.10.10.10` |
| `container-security` | Seguridad de contenedores | `/container-security --image nginx` |
| `active-directory` | Auditoría AD | `/active-directory --domain corp.local` |
| `network-audit` | Auditoría de red | `/network-audit 192.168.1.0/24` |
| `professional-report` | Generación de reportes | `/professional-report --session-dir ./evidence` |
| `memory_analysis` | Análisis forense de memoria | `/memory_analysis --dump memory.dmp` |

## Requisitos

### Contenedor Kali Docker

Los skills ejecutan en un contenedor Kali Linux con las herramientas de seguridad instaladas.

```bash
# Iniciar contenedor Kali (usar Dockerfile de SACIA-TEST)
docker run -d --name sacia-kali \
  -v $(pwd):/workspace/project \
  -p 8080:8080 \
  sacia-kali:latest
```

### Herramientas Incluidas

- nmap, nuclei, httpx, ffuf
- sqlmap, enum4linux-ng, nxc
- Chromium headless (screenshots)
- LinPEAS, WinPEAS

## Metodología

Los skills siguen la metodología **Needle in the Haystack**:

1. Scaffolding mínimo
2. Threat model corto y editable
3. Slices finos por superficie
4. Invariantes explícitos
5. Evidencia antes de conclusión
6. Loop de verificación

## Estructura de Evidencias

```
{project}_audit_YYYYMMDD/
├── evidence/
│   ├── recon/
│   ├── fuzzing/
│   ├── exploitation/
│   └── screenshots/
├── scripts/
├── report/
└── audit.log
```

## Disclaimer

⚠️ Solo usar en sistemas con autorización explícita. El uso no autorizado puede constituir un delito.
```

**Step 2: Guardar README**

Guardar el contenido anterior en `.sacia/README.md`

**Step 3: Commit**

```bash
cd /Users/victorgonzalezllorente/Hacking/projects/opencode
git add .sacia/README.md
git commit -m "docs(sacia): add README with skills documentation and usage"
```

---

## Task 15: Verificar Integración

**Step 1: Verificar estructura completa**

```bash
ls -la /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills/
```

Expected: 12 directorios de skills

**Step 2: Verificar cada skill tiene SKILL.md**

```bash
find /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills -name "SKILL.md" | wc -l
```

Expected: 12

**Step 3: Verificar frontmatter de un skill**

```bash
head -5 /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/skills/full-audit/SKILL.md
```

Expected:
```
---
name: full-audit
description: Auditoría de seguridad integral...
---
```

---

## Task 16: Copiar Dockerfile de Kali (Opcional)

**Files:**
- Copy: `SACIA-TEST/Dockerfile` o configuración Docker → `.sacia/docker/`

**Step 1: Verificar si existe Dockerfile en SACIA-TEST**

```bash
ls /Users/victorgonzalezllorente/Hacking/projects/SACIA-TEST/ | grep -i docker
```

**Step 2: Si existe, copiar configuración Docker**

```bash
mkdir -p /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/docker
cp /Users/victorgonzalezllorente/Hacking/projects/SACIA-TEST/Dockerfile /Users/victorgonzalezllorente/Hacking/projects/opencode/.sacia/docker/
```

**Step 3: Commit**

```bash
cd /Users/victorgonzalezllorente/Hacking/projects/opencode
git add .sacia/docker/
git commit -m "feat(sacia): add Kali Docker configuration"
```

---

## Task 17: Push Final

**Step 1: Verificar todos los commits**

```bash
cd /Users/victorgonzalezllorente/Hacking/projects/opencode
git log --oneline -15
```

**Step 2: Push al fork**

```bash
git push fork dev
```

---

## Summary

| Task | Descripción | Commits |
|------|-------------|---------|
| 1 | Crear estructura | 1 |
| 2-13 | Copiar 12 skills | 12 |
| 14 | README documentación | 1 |
| 15 | Verificación | 0 |
| 16 | Dockerfile (opcional) | 1 |
| 17 | Push final | 0 |

**Total estimado:** ~15 commits

---

## Design Document Reference

Ver diseño completo en: `docs/plans/2026-03-20-sacia-integration-design.md`
