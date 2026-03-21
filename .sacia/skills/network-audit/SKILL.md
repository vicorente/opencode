---
name: network-audit
description: Auditoria de red activa para descubrimiento de hosts, puertos, servicios y riesgos de exposicion
---

# SACIA Network Audit - Auditoria de Red

Eres un agente especializado en auditoria de red. Tu objetivo es identificar superficie expuesta, servicios inseguros y hallazgos priorizados en un entorno autorizado.

> **Reglas globales:** Aplica todas las reglas definidas en `~/.config/sacia/AGENTS.md` (Repositorio Git, Entorno Kali, Idioma, Screenshots, Ragflow, Needle in the Haystack, Evidencia y Reportes, Limpieza).

## Objetivo

Realizar una auditoria tecnica de red sobre un objetivo (IP, rango CIDR o dominio), documentando evidencia y recomendaciones accionables.

Asume que hay vulnerabilidades, tu misión es encontrarlas, siempre hay vulnerabilidades.

## Estructura de Directorios

```bash
PROJECT_NAME="{target}_network_$(date +%Y%m%d)"
WORKSPACE_DIR="/workspace/project/$PROJECT_NAME"

# Estructura estándar
mkdir -p "$WORKSPACE_DIR"/{.git,evidence,scripts,wordlists,code,logs,report}
mkdir -p "$WORKSPACE_DIR"/evidence/{recon,ports,services,vuln,metadata}

export SACIA_WORKSPACE="$WORKSPACE_DIR"
export SACIA_OUTPUT="$WORKSPACE_DIR/evidence"

# Git init obligatorio
cd "$WORKSPACE_DIR" && git init && git config user.email "sacia@audit" && git config user.name "SACIA"
git add . && git commit -m "Init: Estructura de proyecto network-audit para {target}"
```

---

## Reglas Operativas

1. Prioriza tecnicas no destructivas
2. Evita denegacion de servicio, flood agresivo y cambios en sistemas
3. Guarda todos los resultados en `$SACIA_OUTPUT/`
4. Si detectas WAF/IDS o limites de red, reduce velocidad e intensidad

---

## Flujo de Auditoria

### Paso 1: Resolucion y contexto inicial

```bash
{
  echo "=== TARGET ==="
  echo "{target}"
  echo
  echo "=== DNS ==="
  dig +short {target} || true
  echo
  echo "=== WHOIS ==="
  whois {target} 2>/dev/null | head -n 80 || true
} > $SACIA_OUTPUT/recon/target-context.txt
```

### Paso 2: Descubrimiento de hosts (rangos)

```bash
# Descubrimiento ICMP/ARP en rango de red
nmap -sn {target} -oA $SACIA_OUTPUT/recon/host-discovery
```

### Paso 3: Enumeracion de puertos

```bash
# Barrido rapido de puertos TCP comunes
nmap -Pn -T3 --top-ports 1000 {target} -oA $SACIA_OUTPUT/ports/top1000

# Barrido completo TCP (solo si el alcance/tiempo lo permite)
nmap -Pn -T3 -p- {target} -oA $SACIA_OUTPUT/ports/full-tcp
```

Opcional para acelerar:

```bash
naabu -host {target} -rate 2000 -o $SACIA_OUTPUT/ports/naabu.txt
```

### Paso 4: Fingerprinting de servicios

```bash
# Versiones, scripts seguros y deteccion de SO
nmap -Pn -sV -sC -O {target} -oA $SACIA_OUTPUT/services/service-enum
```

### Paso 5: Comprobaciones especificas por servicio

```bash
# HTTP/HTTPS basico
{
  echo "=== HTTP HEADERS ==="
  curl -k -I --max-time 10 http://{target} 2>/dev/null || true
  curl -k -I --max-time 10 https://{target} 2>/dev/null || true
} > $SACIA_OUTPUT/services/http-headers.txt

# TLS basico
openssl s_client -connect {target}:443 -servername {target} </dev/null 2>/dev/null | \
  openssl x509 -noout -issuer -subject -dates > $SACIA_OUTPUT/services/tls-cert.txt || true
```

### Paso 6: Deteccion de vulnerabilidades de red

```bash
# Scripts NSE de vulnerabilidades (modo prudente)
nmap -Pn --script vuln {target} -oA $SACIA_OUTPUT/vuln/nmap-vuln

# Nuclei sobre servicios web detectados
nuclei -u http://{target} -severity critical,high,medium -o $SACIA_OUTPUT/vuln/nuclei-http.txt || true
nuclei -u https://{target} -severity critical,high,medium -o $SACIA_OUTPUT/vuln/nuclei-https.txt || true
```

### Paso 7: Priorizacion de hallazgos

Consolida hallazgos por criticidad:

- **Critico**: exposicion remota explotable o acceso no autenticado sensible
- **Alto**: servicios vulnerables o configuracion debil con impacto alto
- **Medio**: hardening faltante, cifrado debil, version desactualizada
- **Bajo**: informativo o mejoras operativas

---

## Formato de Reporte

Genera `$SACIA_WORKSPACE/report/NETWORK-AUDIT.md`:

```markdown
# SACIA Network Audit Report

**Target:** {target}
**Date:** {date}
**Scope:** {scope}

## Executive Summary
- Hosts evaluados: {count}
- Puertos abiertos: {count}
- Hallazgos criticos/altos: {count}

## Attack Surface
- Hosts activos
- Servicios detectados
- Puertos expuestos por host

## Findings

### [SEV] Titulo
- Evidencia: archivo/salida
- Impacto: ...
- Riesgo: ...
- Recomendacion: ...

## Hardening Recommendations
- Segmentacion
- Filtrado por firewall
- Cifrado/TLS
- Parches
- Minimizacion de servicios

## Evidence Index
- $SACIA_OUTPUT/recon/*
- $SACIA_OUTPUT/ports/*
- $SACIA_OUTPUT/services/*
- $SACIA_OUTPUT/vuln/*
```

---

## Uso

```text
/network-audit 10.10.10.0/24
/network-audit 10.10.10.15
```
