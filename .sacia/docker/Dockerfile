FROM kalilinux/kali-rolling:latest

# Variables de entorno
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Etc/UTC
# PATH completo: Go tools, Python local packages, npm global, y paths del sistema
ENV PATH="/root/go/bin:/usr/local/bin:/root/.local/bin:${PATH}"
ENV GHIDRA_HOME=/usr/share/ghidra

# =============================================================================
# CORE SYSTEM - Utilidades esenciales
# =============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Python y herramientas de desarrollo
    python3 python3-pip python3-dev \
    default-mysql-client-core \
    default-mysql-client \
    sqlite3 \
    man-db \
    whois \
    # Utilidades de red
    curl wget git ca-certificates \
    build-essential \
    libpcap-dev \
    # Herramientas de red
    iputils-ping net-tools dnsutils traceroute \
    iproute2 netcat-traditional \
    # Editores
    vim nano \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# =============================================================================
# NETWORK ANALYSIS - Herramientas de análisis de red
# =============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Port scanning
    nmap \
    masscan \
    # Network monitoring
    tshark tcpdump \
    # SMB enumeration
    enum4linux smbclient \
    # SSH password authentication
    sshpass \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# =============================================================================
# WEB APPLICATION TESTING - Herramientas de testing web
# =============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Web vulnerability scanners
    nikto \
    # Directory enumeration
    gobuster dirb \
    # Web fuzzing
    ffuf \
    dnsrecon \
    dirsearch \
    wfuzz \
    feroxbuster \
    arjun \
    # SQL injection
    sqlmap \
    # CMS scanners
    wpscan \
    # HTTP tooling
    whatweb \
    sslscan \
    # Proxy tools
    zaproxy \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# =============================================================================
# BROWSER HEADLESS - Chromium para navegación/captura sin GUI
# =============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && chromium --headless=new --disable-gpu --version

# =============================================================================
# MITMPROXY - Proxy HTTP/HTTPS para auditoría web
# =============================================================================
RUN pip3 install --no-cache-dir --break-system-packages --ignore-installed pyparsing mitmproxy && \
    echo "✓ Mitmproxy installed" && \
    mitmproxy --version

# =============================================================================
# NSS TOOLS - Certutil para gestión de certificados en NSSDB (Chromium)
# =============================================================================
RUN apt-get update && \
    apt-get install -y --no-install-recommends libnss3-tools && \
    apt-get clean && rm -rf /var/lib/apt/lists/* && \
    which certutil && certutil -V 2>&1 | head -1 || \
    (echo "certutil not found, trying alternative..." && \
     apt-get update && \
     apt-get install -y --no-install-recommends nss && \
     apt-get clean && rm -rf /var/lib/apt/lists/*)

# =============================================================================
# MITMPROXY CA - Generar e instalar certificado CA
# =============================================================================
RUN echo "=== Generando e instalando CA para mitmproxy ===" && \
    mkdir -p /usr/local/share/mitmproxy-ca && \
    mitmproxy --set confdir=/usr/local/share/mitmproxy-ca --set cert_ca_gen_pem=true & \
    sleep 5 && \
    pkill -f "mitmproxy.*confdir.*usr/local/share/mitmproxy-ca" 2>/dev/null || true && \
    sleep 2 && \
    cp /usr/local/share/mitmproxy-ca/mitmproxy-ca-cert.pem /usr/local/share/ca-certificates/mitmproxy-ca.crt && \
    update-ca-certificates && \
    mkdir -p /root/.pki/nssdb && \
    PWFILE=$(mktemp) && : > $PWFILE && \
    certutil -d sql:/root/.pki/nssdb -N -f $PWFILE >/dev/null 2>&1 || true && \
    certutil -d sql:/root/.pki/nssdb -A -t 'C,,' -n mitmproxy \
        -i /usr/local/share/mitmproxy-ca/mitmproxy-ca-cert.pem -f $PWFILE 2>/dev/null || true && \
    rm -f $PWFILE && \
    echo "✓ Mitmproxy CA installed" && \
    certutil -L -d sql:/root/.pki/nssdb | grep mitm || echo "WARNING: NSSDB no muestra el certificado"

# Script de inicio para mitmproxy
RUN echo '#!/bin/bash' > /usr/local/bin/mitm-proxy && \
    echo 'PROXY_PORT="${1:-8080}"' >> /usr/local/bin/mitm-proxy && \
    echo 'WORKDIR="/workspace"' >> /usr/local/bin/mitm-proxy && \
    echo 'CERT_DIR="$WORKDIR/.mitmproxy"' >> /usr/local/bin/mitm-proxy && \
    echo 'LOG_DIR="$WORKDIR/output/mitmproxy"' >> /usr/local/bin/mitm-proxy && \
    echo 'mkdir -p "$CERT_DIR" "$LOG_DIR"' >> /usr/local/bin/mitm-proxy && \
    echo 'if [ ! -f "$CERT_DIR/mitmproxy-ca-cert.pem" ] && [ -f /usr/local/share/mitmproxy-ca/mitmproxy-ca-cert.pem ]; then' >> /usr/local/bin/mitm-proxy && \
    echo '    cp /usr/local/share/mitmproxy-ca/mitmproxy-ca-cert.pem "$CERT_DIR/"' >> /usr/local/bin/mitm-proxy && \
    echo '    cp /usr/local/share/mitmproxy-ca/mitmproxy-ca-key.pem "$CERT_DIR/" 2>/dev/null || true' >> /usr/local/bin/mitm-proxy && \
    echo 'fi' >> /usr/local/bin/mitm-proxy && \
    echo 'pkill -f "mitmdump.*listen-port.*$PROXY_PORT" 2>/dev/null || true' >> /usr/local/bin/mitm-proxy && \
    echo 'sleep 1' >> /usr/local/bin/mitm-proxy && \
    echo 'mitmdump --listen-port $PROXY_PORT --set block_global=false --set ssl_insecure=true --set confdir="$CERT_DIR" > "$LOG_DIR/mitmproxy.log" 2>&1 &' >> /usr/local/bin/mitm-proxy && \
    echo 'MITM_PID=$!' >> /usr/local/bin/mitm-proxy && \
    echo 'echo $MITM_PID > "$CERT_DIR/mitmproxy.pid"' >> /usr/local/bin/mitm-proxy && \
    echo 'sleep 3' >> /usr/local/bin/mitm-proxy && \
    echo 'echo ""' >> /usr/local/bin/mitm-proxy && \
    echo 'echo "=== Mitmproxy listo ==="' >> /usr/local/bin/mitm-proxy && \
    echo 'echo "Proxy: http://127.0.0.1:$PROXY_PORT"' >> /usr/local/bin/mitm-proxy && \
    echo 'echo "Logs: $LOG_DIR/mitmproxy.log"' >> /usr/local/bin/mitm-proxy && \
    echo 'echo "PID: $MITM_PID"' >> /usr/local/bin/mitm-proxy && \
    echo 'echo ""' >> /usr/local/bin/mitm-proxy && \
    echo 'echo "Para usar:"' >> /usr/local/bin/mitm-proxy && \
    echo 'echo "  export http_proxy=http://127.0.0.1:$PROXY_PORT"' >> /usr/local/bin/mitm-proxy && \
    echo 'echo "  export https_proxy=http://127.0.0.1:$PROXY_PORT"' >> /usr/local/bin/mitm-proxy && \
    echo 'wait $MITM_PID 2>/dev/null || true' >> /usr/local/bin/mitm-proxy && \
    chmod +x /usr/local/bin/mitm-proxy && \
    echo "✓ Mitmproxy start script installed"

# =============================================================================
# EXPLOITATION - Herramientas de explotación
# =============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Exploit database
    exploitdb \
    # Password attacks
    hydra \
    # Hash cracking
    john \
    hashcat \
    # Bruteforce wordlist generation
    crunch \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Actualizar exploitdb
RUN searchsploit -u || true

# =============================================================================
# WORDLISTS - Descarga manual desde fuentes oficiales
# =============================================================================
RUN mkdir -p /usr/share/wordlists

# Descargar SecLists desde GitHub con manejo de errores robusto
RUN echo "Downloading SecLists..." && \
    git clone --depth 1 https://github.com/danielmiessler/SecLists.git /usr/share/seclists.tmp && \
    mv /usr/share/seclists.tmp /usr/share/seclists && \
    rm -rf /usr/share/seclists/.git /usr/share/seclists/.github && \
    echo "✓ SecLists downloaded successfully" || \
    (echo "✗ SecLists download failed, installing from apt..." && \
     apt-get update && apt-get install -y seclists)

# Verificar SecLists críticas
RUN ls -la /usr/share/seclists/Discovery/Web-Content/ | grep -E "(common|big)" || echo "Warning: Some SecLists may be missing"
RUN ls -la /usr/share/seclists/Usernames/ | head -5 || echo "Warning: Username wordlists may be missing"

# Descargar rockyou.txt con múltiples fallbacks
RUN echo "Downloading rockyou.txt..." && \
    (wget -q https://gitlab.com/kalilinux/packages/kali-wordlists/-/raw/master/wordlists/rockyou.txt.gz?inline=false -O /tmp/rockyou.txt.gz && \
     gunzip /tmp/rockyou.txt.gz && \
     mv /tmp/rockyou.txt /usr/share/wordlists/rockyou.txt && \
         echo "✓ rockyou.txt downloaded from Kali mirrors" || \
     (wget -q https://github.com/brannondorsey/naive-hashcat/releases/download/1.0/rockyou.txt -O /usr/share/wordlists/rockyou.txt && \
            echo "✓ rockyou.txt downloaded from GitHub" || \
      (echo "Extracting rockyou.txt from SecLists..." && \
       tar -xzf /usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt.tar.gz -C /tmp/ && \
       mv /tmp/rockyou.txt /usr/share/wordlists/rockyou.txt && \
       echo "✓ rockyou.txt extracted from SecLists" || \
       (echo "Creating minimal rockyou.txt placeholder..." && \
        echo "password123" > /usr/share/wordlists/rockyou.txt && \
        echo "✗ rockyou.txt placeholder created"))))

# Crear wordlist de subdominios (top 1000 comunes)
RUN wget -q https://raw.githubusercontent.com/danielmiessler/SecLists/master/Discovery/DNS/subdomains-top1mil-5000.txt \
    -O /usr/share/wordlists/subdomains-1000.txt || \
    (echo "Creating subdomains-1000.txt from built-in wordlist..." && \
     printf "www\nmail\nftp\nlocalhost\nwebmail\nsmtp\npop\nns1\nns2\nadmin\nvpn\ntest\ndev\nstage\nstaging\napi\napp\nblog\nshop\nstore\nm\nmobile\ncdn\nmedia\nimg\nimages\nstatic\nassets\nsecure\nlogin\nportal\ndashboard\npanel\ncpanel\nwebdisk\n" > /usr/share/wordlists/subdomains-1000.txt && \
    echo "✓ subdomains-1000.txt created")

# Verificar wordlists críticas
RUN echo "=== Verifying critical wordlists ===" && \
    ls -lh /usr/share/wordlists/rockyou.txt && \
    ls -lh /usr/share/wordlists/subdomains-1000.txt && \
    ls -lh /usr/share/seclists/Discovery/Web-Content/common.txt && \
    ls -lh /usr/share/dirb/wordlists/common.txt && \
    echo "=== All critical wordlists verified ==="

# =============================================================================
# GO TOOLS - Herramientas en Go para reconocimiento y fuzzing
# =============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    golang-go \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Instalar nuclei desde GitHub (última versión)
RUN GO111MODULE=on go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest && \
    nuclei -update-templates || true

# Instalar httpx
RUN GO111MODULE=on go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest

# Instalar subfinder
RUN GO111MODULE=on go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest

# Instalar katana (web crawler)
RUN GO111MODULE=on go install -v github.com/projectdiscovery/katana/cmd/katana@latest

# Instalar meg (intelligent fetcher)
RUN GO111MODULE=on go install -v github.com/tomnomnom/meg@latest

# Instalar naabu (port scanner)
RUN GO111MODULE=on go install -v github.com/projectdiscovery/naabu/v2/cmd/naabu@latest

# =============================================================================
# ADDITIONAL WEB TOOLS - Herramientas adicionales de Go
# =============================================================================
# Wayback Machine crawler
RUN GO111MODULE=on go install -v github.com/tomnomnom/waybackurls@latest && \
    echo "✓ waybackurls installed"

# Nota: feroxbuster, Arjun-Go, subjack, amass y smuggle requieren configuración adicional
# y se instalan manualmente si es necesario

# =============================================================================
# PYTHON DEPENDENCIES - Dependencias Python mejoradas
# =============================================================================
# Nota: charset-normalizer viene instalado por el sistema, usamos --ignore-installed
RUN pip3 install --no-cache-dir --break-system-packages --ignore-installed charset-normalizer \
    setuptools \
    python3-setuptools \
    wheel \
    pycryptodome \
    requests \
    beautifulsoup4 \
    lxml \
    python-magic \
    scapy \
    pwntools \
    urllib3 \
    certifi \
    frida-tools \
    # JWT Security Tools
    pyjwt \
    cryptography \
    # HTML/JS Analysis
    pyjsparser \
    && echo "✓ Python packages installed" || echo "Some Python packages failed to install, continuing..."

# =============================================================================
# WEB PENTESTING TOOLS - Herramientas especializadas de pentesting web
# =============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Command Injection
    commix \
    # JSON processing for grepping
    gron \
    # Additional web analysis tools
    libnss3-tools \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* && \
    echo "✓ Web pentesting tools installed"

# =============================================================================
# JWT SECURITY TOOLS - Herramientas para análisis de JWT
# =============================================================================
RUN echo "=== Installing JWT Security Tools ===" && \
    git clone https://github.com/ticarpi/jwt_tool /opt/jwt_tool 2>/dev/null && \
    cd /opt/jwt_tool && \
    pip3 install --break-system-packages -q PyJWT pycryptodomex termcolor ratelimit colorama requests tqdm bcrypt cffi && \
    ln -sf /opt/jwt_tool/jwt_tool.py /usr/local/bin/jwt_tool && \
    echo "✓ jwt_tool installed"

# =============================================================================
# GIT CONFIGURATION - Configurar git para instalaciones que necesitan clonar repos
# =============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends openssh-client \
    && apt-get clean && rm -rf /var/lib/apt/lists/* && \
    mkdir -p ~/.ssh && ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null && \
    git config --global core.sshCommand 'ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null' && \
    git config --global url.https://github.com/.insteadof git@github.com: && \
    echo "✓ Git configured for cloning repositories"

# =============================================================================
# SECRET DETECTION TOOLS - Herramientas para detección de secretos
# =============================================================================
RUN echo "=== Installing Secret Detection Tools ===" && \
    # SecretFinder para JavaScript
    git clone https://github.com/m4ll0k/SecretFinder /opt/SecretFinder 2>/dev/null && \
    cd /opt/SecretFinder && \
    pip3 install --break-system-packages -q jsbeautifier requests && \
    # Crear wrapper en bash para SecretFinder
    echo '#!/bin/bash' > /usr/local/bin/secretfinder && \
    echo 'python3 /opt/SecretFinder/SecretFinder.py "$@"' >> /usr/local/bin/secretfinder && \
    chmod +x /usr/local/bin/secretfinder && \
    echo "✓ SecretFinder installed" && \
    # truffleHog para búsqueda de secretos (versión actualizada)
    pip3 install --break-system-packages -q trufflehog && \
    echo "✓ truffleHog installed" && \
    # Gitleaks - Escáner de secretos muy popular y rápido (PATH CORREGIDO)
    GO111MODULE=on go install -v github.com/zricethezav/gitleaks/v8@latest && \
    ln -sf /root/go/bin/gitleaks /usr/local/bin/gitleaks && \
    echo "✓ Gitleaks installed" && \
    # detect-secrets de Yelp
    pip3 install --break-system-packages -q detect-secrets && \
    echo "✓ detect-secrets installed"

# git-secrets - Previene commits con secretos (COMPILAR DESDE FUENTE)
RUN apt-get update -qq && apt-get install -y -qq unzip && \
    cd /tmp && \
    wget -q https://github.com/awslabs/git-secrets/archive/refs/heads/master.zip -O git-secrets.zip && \
    unzip -q git-secrets.zip && \
    cd git-secrets-master && \
    make install >/dev/null 2>&1 && \
    cd / && rm -rf /tmp/git-secrets* && \
    echo "✓ git-secrets installed"

# GitTools - Para extraer repositorios git expuestos (opcional)
RUN (GIT_TERMINAL_PROMPT=0 git clone --depth 1 https://github.com/gwen001/gittools /opt/gittools 2>/dev/null && \
    chmod +x /opt/gittools/GitDumper.py /opt/gittools/Githacker.py && \
    ln -sf /opt/gittools/GitDumper.py /usr/local/bin/gitdumper && \
    ln -sf /opt/gittools/Githacker.py /usr/local/bin/githacker && \
    echo "✓ GitTools installed") || \
    (echo "⚠ GitTools installation skipped (network error), creating stub scripts..." && \
    echo '#!/usr/bin/env python3' > /usr/local/bin/gitdumper && \
    echo 'print("GitDumper not installed. Use: docker run -v /path:/repo ghcr.io/internetwache/gitdumper")' >> /usr/local/bin/gitdumper && \
    chmod +x /usr/local/bin/gitdumper && \
    echo '#!/usr/bin/env python3' > /usr/local/bin/githacker && \
    echo 'print("GitHacker not installed. Clone the repo manually: https://github.com/gwen001/gittools")' >> /usr/local/bin/githacker && \
    chmod +x /usr/local/bin/githacker && \
    echo "⚠ GitTools stub scripts created")

# Verificar instalaciones
RUN echo "=== Verifying Secret Detection Tools ===" && \
    which gitleaks && gitleaks version 2>&1 | head -1 && \
    which git-secrets && \
    which trufflehog && \
    which secretfinder && \
    which detect-secrets && detect-secrets --version 2>&1 | head -1 && \
    which gitdumper && echo "All secret detection tools installed successfully"

# =============================================================================
# NODEJS/NPM - Runtime JavaScript necesario para herramientas de análisis JS
# =============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    npm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* && \
    echo "✓ Node.js and npm installed"

# =============================================================================
# JAVASCRIPT SECURITY TOOLS - Herramientas especializadas en JS
# =============================================================================
RUN echo "=== Installing JavaScript Security Tools ===" && \
    # Snyk CLI - Escáner de seguridad muy popular
    npm install -g snyk && \
    echo "✓ Snyk installed" && \
    # Semgrep - Análisis estático con reglas personalizadas
    pip3 install --break-system-packages semgrep && \
    echo "✓ Semgrep installed" && \
    # npm audit y audit-fix para detectar deps vulnerables
    npm install -g npm-audit-resolver && \
    echo "✓ npm-audit-resolver installed" && \
    # js-yaml para análisis de archivos YAML
    npm install -g js-yaml && \
    echo "✓ js-yaml installed" && \
    # ESLint con plugins de seguridad
    npm install -g eslint && \
    npm install -g eslint-plugin-security eslint-plugin-no-secrets eslint-plugin-xss && \
    echo "✓ ESLint with security plugins installed" && \
    # JSHint para análisis de código JS
    npm install -g jshint && \
    echo "✓ JSHint installed" && \
    # Babel para análisis de código moderno
    npm install -g @babel/cli @babel/parser @babel/traverse && \
    echo "✓ Babel installed" && \
    # JSPrime - Analizador de código Node.js (opcional, puede no estar disponible)
    (npm install -g jsprime && echo "✓ JSPrime installed") || echo "⚠ JSPrime not available, skipping..." && \
    # yarn como gestor de paquetes alternativo
    npm install -g yarn && \
    echo "✓ Yarn installed"

# =============================================================================
# JS SECURITY RULES - Reglas de Semgrep para JavaScript
# =============================================================================
RUN mkdir -p /opt/semgrep-rules && \
    echo "# Creando reglas personalizadas de Semgrep" && \
    printf 'rules:\n  - id: javascript.hardcoded-secret\n    patterns:\n      - pattern: (?:api[_-]?key|apikey|api[_-]?key)['"'"']\\s*[:=]\\s*['"'"']\\s*[A-Za-z0-9]{20,}\n        message: "Hardcoded API key detected"\n        languages: [javascript, typescript]\n        severity: ERROR\n' > /opt/semgrep-rules/javascript-secrets.yml && \
    echo "✓ Semgrep JS rules created"

# Script de análisis de JavaScript con todas las herramientas
RUN echo '#!/bin/bash' > /usr/local/bin/scan-js-secrets && \
    echo 'JS_FILE="$1"' >> /usr/local/bin/scan-js-secrets && \
    echo 'OUTPUT_DIR="${2:-.}"' >> /usr/local/bin/scan-js-secrets && \
    echo 'mkdir -p "$OUTPUT_DIR"' >> /usr/local/bin/scan-js-secrets && \
    echo '' >> /usr/local/bin/scan-js-secrets && \
    echo 'echo "=== Scanning $JS_FILE for secrets ==="' >> /usr/local/bin/scan-js-secrets && \
    echo '' >> /usr/local/bin/scan-js-secrets && \
    echo '# Gitleaks - Análisis del archivo (RECOMENDADO)' >> /usr/local/bin/scan-js-secrets && \
    echo 'echo "--- Gitleaks ---"' >> /usr/local/bin/scan-js-secrets && \
    echo 'gitleaks detect "$JS_FILE" --no-git --report-path="$OUTPUT_DIR/gitleaks.json" --report-format=json 2>/dev/null' >> /usr/local/bin/scan-js-secrets && \
    echo 'grep -q "Found" "$OUTPUT_DIR/gitleaks.json" 2>/dev/null && echo "⚠️  Secrets found!" || echo "✓ No secrets with Gitleaks"' >> /usr/local/bin/scan-js-secrets && \
    echo '' >> /usr/local/bin/scan-js-secrets && \
    echo '# SecretFinder - Específico para JS' >> /usr/local/bin/scan-js-secrets && \
    echo 'echo "--- SecretFinder ---"' >> /usr/local/bin/scan-js-secrets && \
    echo 'secretfinder -i "$JS_FILE" -o "$OUTPUT_DIR/secretfinder.txt" 2>/dev/null | tee "$OUTPUT_DIR/secretfinder.log"' >> /usr/local/bin/scan-js-secrets && \
    echo 'grep -q "api_key\|secret\|password\|token" "$OUTPUT_DIR/secretfinder.txt" && echo "⚠️  Secrets found!" || echo "✓ No secrets with SecretFinder"' >> /usr/local/bin/scan-js-secrets && \
    echo '' >> /usr/local/bin/scan-js-secrets && \
    echo '# detect-secrets' >> /usr/local/bin/scan-js-secrets && \
    echo 'echo "--- detect-secrets ---"' >> /usr/local/bin/scan-js-secrets && \
    echo 'detect-secrets scan "$JS_FILE" 2>/dev/null | tee "$OUTPUT_DIR/detect-secrets.txt"' >> /usr/local/bin/scan-js-secrets && \
    echo '' >> /usr/local/bin/scan-js-secrets && \
    echo '# Semgrep - Patrones personalizados' >> /usr/local/bin/scan-js-secrets && \
    echo 'echo "--- Semgrep ---"' >> /usr/local/bin/scan-js-secrets && \
    echo 'semgrep --config /opt/semgrep-rules/javascript-secrets.yml "$JS_FILE" 2>/dev/null | tee "$OUTPUT_DIR/semgrep.json"' >> /usr/local/bin/scan-js-secrets && \
    echo 'grep -q "ERROR\|CRITICAL" "$OUTPUT_DIR/semgrep.json" && echo "⚠️  Secrets found!" || echo "✓ No secrets with Semgrep"' >> /usr/local/bin/scan-js-secrets && \
    echo '' >> /usr/local/bin/scan-js-secrets && \
    echo 'echo "=== Analysis Complete ==="' >> /usr/local/bin/scan-js-secrets && \
    chmod +x /usr/local/bin/scan-js-secrets && \
    echo "✓ JS security scan script created"

# Fix para warning de pip system-packages
RUN mkdir -p /root/.pip && \
    echo "[global]" > /root/.pip/pip.conf && \
    echo "break-system-packages = true" >> /root/.pip/pip.conf

# =============================================================================
# REVERSE ENGINEERING - Ghidra y runtime para MCP
# =============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    ghidra \
    openjdk-21-jre-headless \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# =============================================================================
# DIRECTORIOS DE TRABAJO
# =============================================================================
RUN mkdir -p /workspace /output /reports

# =============================================================================
# SYMLINKS - Asegurar que todas las herramientas estén en el PATH
# =============================================================================
# Herramientas Go - crear symlinks a /usr/local/bin para acceso global
RUN (ln -sf /root/go/bin/nuclei /usr/local/bin/nuclei || true) && \
    (ln -sf /root/go/bin/httpx /usr/local/bin/httpx || true) && \
    (ln -sf /root/go/bin/subfinder /usr/local/bin/subfinder || true) && \
    (ln -sf /root/go/bin/katana /usr/local/bin/katana || true) && \
    (ln -sf /root/go/bin/naabu /usr/local/bin/naabu || true) && \
    (ln -sf /root/go/bin/meg /usr/local/bin/meg || true) && \
    (ln -sf /root/go/bin/waybackurls /usr/local/bin/waybackurls || true) && \
    (ln -sf /root/go/bin/gitleaks /usr/local/bin/gitleaks || true) && \
    echo "✓ Go tools symlinks created"

WORKDIR /workspace

# =============================================================================
# ENTRYPOINT
# =============================================================================
# Mantener contenedor corriendo
CMD ["tail", "-f", "/dev/null"]
