#!/usr/bin/env bash
set -euo pipefail

APP=opencode

MUTED='\033[0;2m'
RED='\033[0;31m'
GREEN='\033[0;32m'
ORANGE='\033[38;5;214m'
NC='\033[0m' # No Color

usage() {
    cat <<EOF
OpenCode Local Installer

Compiles and installs opencode from source code.

Usage: install_local.sh [options]

Options:
    -h, --help              Display this help message
    -p, --prefix <dir>      Install directory (default: ~/.opencode/bin)
    -o, --output <dir>      Copy binary to specific location after build
        --no-modify-path    Don't modify shell config files (.zshrc, .bashrc, etc.)
        --skip-deps         Skip dependency installation (bun install)

Examples:
    ./install_local.sh                    # Build and install to ~/.opencode/bin
    ./install_local.sh -o ~/.bun/bin      # Build and copy to ~/.bun/bin
    ./install_local.sh --no-modify-path   # Build without modifying PATH
EOF
}

install_dir="$HOME/.opencode/bin"
output_dir=""
no_modify_path=false
skip_deps=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            exit 0
            ;;
        -p|--prefix)
            if [[ -n "${2:-}" ]]; then
                install_dir="$2"
                shift 2
            else
                echo -e "${RED}Error: --prefix requires a directory argument${NC}"
                exit 1
            fi
            ;;
        -o|--output)
            if [[ -n "${2:-}" ]]; then
                output_dir="$2"
                shift 2
            else
                echo -e "${RED}Error: --output requires a directory argument${NC}"
                exit 1
            fi
            ;;
        --no-modify-path)
            no_modify_path=true
            shift
            ;;
        --skip-deps)
            skip_deps=true
            shift
            ;;
        *)
            echo -e "${ORANGE}Warning: Unknown option '$1'${NC}" >&2
            shift
            ;;
    esac
done

# Generate dev version with timestamp
DEV_VERSION="0.0.0-dev-$(date +%Y%m%d%H%M)"

# Detect OS and architecture
raw_os=$(uname -s)
os=$(echo "$raw_os" | tr '[:upper:]' '[:lower:]')
case "$raw_os" in
  Darwin*) os="darwin" ;;
  Linux*) os="linux" ;;
  MINGW*|MSYS*|CYGWIN*) os="windows" ;;
esac

arch=$(uname -m)
if [[ "$arch" == "aarch64" ]]; then
  arch="arm64"
fi
if [[ "$arch" == "x86_64" ]]; then
  arch="x64"
fi

# Handle Rosetta on macOS
if [ "$os" = "darwin" ] && [ "$arch" = "x64" ]; then
  rosetta_flag=$(sysctl -n sysctl.proc_translated 2>/dev/null || echo 0)
  if [ "$rosetta_flag" = "1" ]; then
    arch="arm64"
  fi
fi

print_message() {
    local level=$1
    local message=$2
    local color=""

    case $level in
        info) color="${NC}" ;;
        success) color="${GREEN}" ;;
        warning) color="${ORANGE}" ;;
        error) color="${RED}" ;;
    esac

    echo -e "${color}${message}${NC}"
}

# Check for bun
if ! command -v bun >/dev/null 2>&1; then
    print_message error "Error: 'bun' is required but not installed."
    print_message info "Install bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Get script directory (project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$SCRIPT_DIR/packages/opencode"

# Verify we're in the right directory
if [ ! -d "$PACKAGE_DIR" ]; then
    print_message error "Error: Cannot find packages/opencode directory"
    print_message info "Make sure to run this script from the opencode project root"
    exit 1
fi

print_message info "\n${MUTED}Building ${NC}opencode ${MUTED}from source${NC}"
print_message info "${MUTED}Version: ${NC}$DEV_VERSION"
print_message info "${MUTED}Platform: ${NC}$os-$arch"
echo ""

# Install dependencies if needed
if [ "$skip_deps" = false ]; then
    print_message info "${MUTED}Installing dependencies...${NC}"
    cd "$SCRIPT_DIR"
    bun install --silent 2>/dev/null || {
        print_message error "Failed to install dependencies"
        exit 1
    }
fi

# Build with dev version
print_message info "${MUTED}Compiling binary...${NC}"
cd "$PACKAGE_DIR"
OPENCODE_VERSION="$DEV_VERSION" OPENCODE_CHANNEL="dev" bun run script/build.ts --single 2>&1 | while read -r line; do
    # Filter output to show only important lines
    if [[ "$line" == *"building"* ]] || [[ "$line" == *"Generated"* ]] || [[ "$line" == *"Loaded"* ]]; then
        echo -e "${MUTED}  $line${NC}"
    fi
done

# Find the built binary
binary_name="$APP-$os-$arch"
if [ "$os" = "windows" ]; then
    binary_path="$PACKAGE_DIR/dist/$binary_name/bin/opencode.exe"
else
    binary_path="$PACKAGE_DIR/dist/$binary_name/bin/opencode"
fi

if [ ! -f "$binary_path" ]; then
    # Try without platform suffix
    binary_path="$PACKAGE_DIR/dist/$binary_name/bin/$APP"
    if [ ! -f "$binary_path" ]; then
        print_message error "Error: Binary not found after build"
        print_message info "Expected: $binary_path"
        ls -la "$PACKAGE_DIR/dist/" 2>/dev/null || true
        exit 1
    fi
fi

# Create install directory
mkdir -p "$install_dir"

# Install to primary location
print_message info "\n${MUTED}Installing to ${NC}$install_dir"
cp "$binary_path" "$install_dir/opencode"
chmod 755 "$install_dir/opencode"

# Copy to output directory if specified
if [ -n "$output_dir" ]; then
    print_message info "${MUTED}Copying to ${NC}$output_dir"
    mkdir -p "$output_dir"
    cp "$binary_path" "$output_dir/opencode"
    chmod 755 "$output_dir/opencode"
fi

print_message success "\n${GREEN}✓${NC} Installation complete!"

# Verify installation
installed_version=$("$install_dir/opencode" --version 2>/dev/null || echo "unknown")
print_message info "${MUTED}Installed version: ${NC}$installed_version"

# Add to PATH if requested
add_to_path() {
    local config_file=$1
    local command=$2

    if grep -Fxq "$command" "$config_file"; then
        print_message info "Command already exists in $config_file, skipping write."
    elif [[ -w $config_file ]]; then
        echo -e "\n# opencode" >> "$config_file"
        echo "$command" >> "$config_file"
        print_message info "${MUTED}Successfully added ${NC}opencode ${MUTED}to \$PATH in ${NC}$config_file"
    else
        print_message warning "Manually add the directory to $config_file (or similar):"
        print_message info "  $command"
    fi
}

if [[ "$no_modify_path" != "true" ]]; then
    XDG_CONFIG_HOME=${XDG_CONFIG_HOME:-$HOME/.config}
    current_shell=$(basename "$SHELL")

    case $current_shell in
        fish)
            config_files="$HOME/.config/fish/config.fish"
            ;;
        zsh)
            config_files="${ZDOTDIR:-$HOME}/.zshrc ${ZDOTDIR:-$HOME}/.zshenv $XDG_CONFIG_HOME/zsh/.zshrc $XDG_CONFIG_HOME/zsh/.zshenv"
            ;;
        bash)
            config_files="$HOME/.bashrc $HOME/.bash_profile $HOME/.profile $XDG_CONFIG_HOME/bash/.bashrc $XDG_CONFIG_HOME/bash/.bash_profile"
            ;;
        ash)
            config_files="$HOME/.ashrc $HOME/.profile /etc/profile"
            ;;
        sh)
            config_files="$HOME/.ashrc $HOME/.profile /etc/profile"
            ;;
        *)
            config_files="$HOME/.bashrc $HOME/.bash_profile $XDG_CONFIG_HOME/bash/.bashrc $XDG_CONFIG_HOME/bash/.bash_profile"
            ;;
    esac

    config_file=""
    for file in $config_files; do
        if [[ -f $file ]]; then
            config_file=$file
            break
        fi
    done

    if [[ -z $config_file ]]; then
        print_message warning "No config file found for $current_shell. You may need to manually add to PATH:"
        print_message info "  export PATH=$install_dir:\$PATH"
    elif [[ ":$PATH:" != *":$install_dir:"* ]]; then
        case $current_shell in
            fish)
                add_to_path "$config_file" "fish_add_path $install_dir"
                ;;
            zsh|bash|ash|sh)
                add_to_path "$config_file" "export PATH=$install_dir:\$PATH"
                ;;
            *)
                export PATH=$install_dir:$PATH
                print_message warning "Manually add the directory to $config_file (or similar):"
                print_message info "  export PATH=$install_dir:\$PATH"
                ;;
        esac
    fi
fi

echo ""
echo -e "${MUTED}                   ${NC}             ▄     "
echo -e "${MUTED}█▀▀█ █▀▀█ █▀▀█ █▀▀▄ ${NC}█▀▀▀ █▀▀█ █▀▀█ █▀▀█"
echo -e "${MUTED}█░░█ █░░█ █▀▀▀ █░░█ ${NC}█░░░ █░░█ █░░█ █▀▀▀"
echo -e "${MUTED}▀▀▀▀ █▀▀▀ ▀▀▀▀ ▀  ▀ ${NC}▀▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀▀▀▀"
echo ""
echo -e "${GREEN}Dev build installed successfully!${NC}"
echo ""
echo -e "${MUTED}To start:${NC}"
echo -e "cd <project>  ${MUTED}# Open directory${NC}"
echo -e "opencode      ${MUTED}# Run command${NC}"
echo ""

if [ -n "$output_dir" ]; then
    echo -e "${MUTED}Binary also available at: ${NC}$output_dir/opencode"
    echo ""
fi
