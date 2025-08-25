echo ""
echo "================================================================="
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉${NC}"
echo "================================================================="
echo ""
echo -e "${YELLOW}Container Details:${NC}"
echo "  ID: $CT_ID"
echo "  Name: $CT_NAME"
echo "  IP Address: ${CONTAINER_IP:-"Not available"}"
echo "  Gateway: ${CONTAINER_GATEWAY:-"Not available"}"
echo "  Domain: $DOMAIN"
echo "  Bridge: $CT_BRIDGE"
echo ""
echo -e "${YELLOW}Network Configuration:${NC}"
if [[ "$USE_DHCP" == "true" ]]; then
    echo "  Mode: DHCP"
else
    echo "  Mode: Static IP ($STATIC_IP)"
    [[ -n "$GATEWAY" ]] && echo "  Configured Gateway: $GATEWAY"
fi
[[ -n "$DNS_SERVERS" ]] && echo "  DNS Servers: $DNS_SERVERS"
echo ""
echo -e "${YELLOW}Access URLs:${NC}"
if [[ -n "$CONTAINER_IP" ]]; then
    echo "  HTTPS Web Interface: https://$CONTAINER_IP/"
    echo "  RabbitMQ Management: https://$CONTAINER_IP/rabbitmq/"
    echo "  SSH Access: ssh root@$CONTAINER_IP"
else
    echo "  Access via container console: pct enter $CT_ID"
fi
echo ""
echo -e "${YELLOW}Management Commands:${NC}"
echo "  Enter container: pct enter $CT_ID"
echo "  Stop container: pct stop $CT_ID"
echo "  Start container: pct start $CT_ID"
echo "  View container config: pct config $CT_ID"
echo "  View container resources: pct status $CT_ID"
echo ""
echo -e "${YELLOW}Application Commands:${NC}"
echo "  Monitor services: pct exec $CT_ID -- /opt/military-db-analyzer/monitor.sh"
echo "  View app logs: pct exec $CT_ID -- journalctl -u military-db-analyzer -f"
echo "  Test deployment: pct exec $CT_ID -- /opt/military-db-analyzer/test-deployment.sh"
echo "  Run Node.js script: pct exec $CT_ID -- /opt/military-db-analyzer/run_node_script.sh S500.js --add --db OP7"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Deploy your application code:"
echo "   pct exec $CT_ID -- git clone <your-repo-url> /tmp/app-source"
echo "   pct exec $CT_ID -- cp -r /tmp/app-source/* /opt/military-db-analyzer/"
echo ""
echo "2. Install Python requirements (if they exist):"
echo "   pct exec $CT_ID -- pip3 install -r /opt/military-db-analyzer/requirements.txt"
echo ""
echo "3. Start the application service:"
echo "   pct exec $CT_ID -- systemctl start military-db-analyzer"
echo ""
echo "4. For production with real domain, set up Let's Encrypt SSL:"
echo "   pct exec $CT_ID -- certbot --nginx -d $DOMAIN"
echo ""
echo "5. Configure firewall on Proxmox host (if needed):"
echo "   # Allow HTTP/HTTPS to container"
if [[ -n "$CONTAINER_IP" ]]; then
echo "   iptables -t nat -A PREROUTING -p tcp --dport 80 -j DNAT --to-destination $CONTAINER_IP:80"
echo "   iptables -t nat -A PREROUTING -p tcp --dport 443 -j DNAT --to-destination $CONTAINER_IP:443"
fi
echo ""
echo -e "${YELLOW}Troubleshooting:${NC}"
echo "  Check container status: pct status $CT_ID"
echo "  Check container logs: pct exec $CT_ID -- journalctl -f"
echo "  Network issues: pct exec $CT_ID -- ip addr show"
echo "  DNS issues: pct exec $CT_ID -- cat /etc/resolv.conf"
echo "  Service issues: pct exec $CT_ID -- systemctl status nginx military-db-analyzer rabbitmq-server"
echo ""
echo -e "${YELLOW}Configuration Files:${NC}"
echo "  Nginx config: /etc/nginx/sites-available/military-db-analyzer"
echo "  Application service: /etc/systemd/system/military-db-analyzer.service"
echo "  Application directory: /opt/military-db-analyzer/"
echo "  RabbitMQ directory: /opt/rabbitmq/"
echo ""
echo -e "${YELLOW}Network Validation:${NC}"
if [[ "$USE_DHCP" == "false" ]]; then
    echo "  Static IP configured: $STATIC_IP"
    if [[ -n "$GATEWAY" ]]; then
        echo "  Gateway configured: $GATEWAY"
        echo "  To verify routing: pct exec $CT_ID -- ip route show"
    fi
fi
if [[ -n "$DNS_SERVERS" ]]; then
    echo "  Custom DNS configured: $DNS_SERVERS"
    echo "  To test DNS: pct exec $CT_ID -- nslookup google.com"
fi
echo ""
echo -e "${GREEN}Container is ready for your Military Database Analyzer deployment!${NC}"
echo -e "${GREEN}The RabbitMQ consumer can execute Node.js scripts like: node S500.js --add --db OP7${NC}"
echo "================================================================="

# Save deployment summary to a file on Proxmox host
SUMMARY_FILE="/tmp/military-db-analyzer-$CT_ID-deployment.txt"
{
    echo "Military Database Analyzer Deployment Summary"
    echo "=============================================="
    echo "Deployment Date: $(date)"
    echo "Container ID: $CT_ID"
    echo "Container Name: $CT_NAME"
    echo "IP Address: ${CONTAINER_IP:-"Not available"}"
    echo "Domain: $DOMAIN"
    echo "Email: $EMAIL"
    echo ""
    echo "Network Configuration:"
    if [[ "$USE_DHCP" == "true" ]]; then
        echo "  Mode: DHCP"
    else
        echo "  Mode: Static IP ($STATIC_IP)"
        [[ -n "$GATEWAY" ]] && echo "  Gateway: $GATEWAY"
    fi
    [[ -n "$DNS_SERVERS" ]] && echo "  DNS Servers: $DNS_SERVERS"
    echo "  Bridge: $CT_BRIDGE"
    echo ""
    echo "Container Resources:"
    echo "  Memory: ${CT_MEMORY}MB"
    echo "  Cores: $CT_CORES"
    echo "  Disk: ${CT_DISK_SIZE}GB"
    echo "  Storage: $CT_STORAGE"
    echo ""
    echo "Key Commands:"
    echo "  Enter container: pct enter $CT_ID"
    echo "  Monitor services: pct exec $CT_ID -- /opt/military-db-analyzer/monitor.sh"
    echo "  Test deployment: pct exec $CT_ID -- /opt/military-db-analyzer/test-deployment.sh"
    if [[ -n "$CONTAINER_IP" ]]; then
        echo "  Web Interface: https://$CONTAINER_IP/"
    fi
} > "$SUMMARY_FILE"

info "Deployment summary saved to: $SUMMARY_FILE"

# Final deployment validation
if [[ -n "$CONTAINER_IP" ]]; then
    log "Running final deployment validation..."
    exec_in_ct "/opt/military-db-analyzer/test-deployment.sh" || warn "Some deployment tests failed - check logs"
else
    warn "Could not obtain container IP - some tests may not be available"
fi

log "Deployment completed! Container $CT_ID is ready."#!/bin/bash

#####################################################################
# Proxmox LXC Auto-Deploy Script for Military Database Analyzer
# 
# This script creates and configures an LXC container (CT 140) with:
# - Military Database Analyzer web service
# - Nginx reverse proxy with SSL
# - RabbitMQ integration
# - Node.js script accessibility
# - Complete monitoring and security setup
#
# Usage: ./deploy-military-analyzer.sh [options]
# 
# Network Configuration Options:
#   --dhcp                           Use DHCP (default)
#   --ip <ip/cidr>                   Static IP with CIDR (e.g., 192.168.1.100/24)
#   --gateway <gateway_ip>           Gateway IP address
#   --dns <dns_servers>              DNS servers (comma-separated)
#   --bridge <bridge_name>           Network bridge (default: vmbr0)
#
# Container Options:
#   --ct-id <id>                     Container ID (default: 140)
#   --hostname <name>                Container hostname
#   --memory <mb>                    Memory in MB (default: 2048)
#   --cores <num>                    CPU cores (default: 2)
#   --disk <gb>                      Disk size in GB (default: 20)
#   --storage <storage>              Storage location (default: local-lvm)
#
# Application Options:
#   --domain <domain>                Domain name (default: military-analyzer.local)
#   --email <email>                  Email for SSL certificates
#
# Examples:
#   # DHCP configuration
#   ./deploy-military-analyzer.sh --dhcp --domain example.com --email admin@example.com
#   
#   # Static IP configuration
#   ./deploy-military-analyzer.sh --ip 192.168.1.100/24 --gateway 192.168.1.1 --dns 8.8.8.8,8.8.4.4
#   
#   # Custom container settings
#   ./deploy-military-analyzer.sh --ct-id 150 --memory 4096 --cores 4 --disk 40
#####################################################################

set -e  # Exit on any error

# Default configuration variables
CT_ID=140
CT_NAME="military-db-analyzer"
CT_TEMPLATE="ubuntu-22.04-standard_22.04-1_amd64.tar.zst"
CT_STORAGE="local-lvm"
CT_MEMORY=2048
CT_SWAP=512
CT_CORES=2
CT_DISK_SIZE=20
CT_BRIDGE="vmbr0"

# Network configuration defaults
USE_DHCP=true
STATIC_IP=""
GATEWAY=""
DNS_SERVERS=""

# Application defaults
DOMAIN="military-analyzer.local"
EMAIL="admin@localhost"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Help function
show_help() {
    echo -e "${CYAN}Military Database Analyzer LXC Deployment Script${NC}"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo -e "${YELLOW}Network Configuration Options:${NC}"
    echo "  --dhcp                           Use DHCP (default)"
    echo "  --ip <ip/cidr>                   Static IP with CIDR (e.g., 192.168.1.100/24)"
    echo "  --gateway <gateway_ip>           Gateway IP address"
    echo "  --dns <dns_servers>              DNS servers (comma-separated, e.g., 8.8.8.8,8.8.4.4)"
    echo "  --bridge <bridge_name>           Network bridge (default: vmbr0)"
    echo ""
    echo -e "${YELLOW}Container Options:${NC}"
    echo "  --ct-id <id>                     Container ID (default: 140)"
    echo "  --hostname <name>                Container hostname (default: military-db-analyzer)"
    echo "  --memory <mb>                    Memory in MB (default: 2048)"
    echo "  --cores <num>                    CPU cores (default: 2)"
    echo "  --disk <gb>                      Disk size in GB (default: 20)"
    echo "  --storage <storage>              Storage location (default: local-lvm)"
    echo ""
    echo -e "${YELLOW}Application Options:${NC}"
    echo "  --domain <domain>                Domain name (default: military-analyzer.local)"
    echo "  --email <email>                  Email for SSL certificates (default: admin@localhost)"
    echo ""
    echo -e "${YELLOW}Other Options:${NC}"
    echo "  --help, -h                       Show this help message"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  # DHCP configuration with custom domain"
    echo "  $0 --dhcp --domain example.com --email admin@example.com"
    echo ""
    echo "  # Static IP configuration"
    echo "  $0 --ip 192.168.1.100/24 --gateway 192.168.1.1 --dns 8.8.8.8,8.8.4.4"
    echo ""
    echo "  # Custom container with static IP"
    echo "  $0 --ct-id 150 --memory 4096 --cores 4 --ip 10.0.1.50/24 --gateway 10.0.1.1"
    echo ""
    echo "  # High-performance setup"
    echo "  $0 --memory 8192 --cores 8 --disk 100 --storage local-ssd"
    echo ""
}

# Validation functions
validate_ip() {
    local ip=$1
    if [[ $ip =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}/[0-9]{1,2}$ ]]; then
        # Extract IP and CIDR
        local ip_part=${ip%/*}
        local cidr_part=${ip#*/}
        
        # Validate IP octets
        IFS='.' read -ra ADDR <<< "$ip_part"
        for octet in "${ADDR[@]}"; do
            if (( octet < 0 || octet > 255 )); then
                return 1
            fi
        done
        
        # Validate CIDR
        if (( cidr_part < 1 || cidr_part > 32 )); then
            return 1
        fi
        
        return 0
    fi
    return 1
}

validate_gateway() {
    local gateway=$1
    if [[ $gateway =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
        IFS='.' read -ra ADDR <<< "$gateway"
        for octet in "${ADDR[@]}"; do
            if (( octet < 0 || octet > 255 )); then
                return 1
            fi
        done
        return 0
    fi
    return 1
}

validate_dns() {
    local dns_list=$1
    IFS=',' read -ra DNS_ARRAY <<< "$dns_list"
    for dns in "${DNS_ARRAY[@]}"; do
        dns=$(echo "$dns" | xargs)  # Trim whitespace
        if [[ ! $dns =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
            return 1
        fi
        IFS='.' read -ra ADDR <<< "$dns"
        for octet in "${ADDR[@]}"; do
            if (( octet < 0 || octet > 255 )); then
                return 1
            fi
        done
    done
    return 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dhcp)
            USE_DHCP=true
            shift
            ;;
        --ip)
            if [[ -z "$2" ]]; then
                error "IP address is required with --ip option"
            fi
            if ! validate_ip "$2"; then
                error "Invalid IP address format: $2. Use format: IP/CIDR (e.g., 192.168.1.100/24)"
            fi
            USE_DHCP=false
            STATIC_IP="$2"
            shift 2
            ;;
        --gateway)
            if [[ -z "$2" ]]; then
                error "Gateway IP is required with --gateway option"
            fi
            if ! validate_gateway "$2"; then
                error "Invalid gateway IP format: $2"
            fi
            GATEWAY="$2"
            shift 2
            ;;
        --dns)
            if [[ -z "$2" ]]; then
                error "DNS servers are required with --dns option"
            fi
            if ! validate_dns "$2"; then
                error "Invalid DNS server format: $2. Use comma-separated IPs (e.g., 8.8.8.8,8.8.4.4)"
            fi
            DNS_SERVERS="$2"
            shift 2
            ;;
        --bridge)
            if [[ -z "$2" ]]; then
                error "Bridge name is required with --bridge option"
            fi
            CT_BRIDGE="$2"
            shift 2
            ;;
        --ct-id)
            if [[ -z "$2" ]] || ! [[ "$2" =~ ^[0-9]+$ ]]; then
                error "Valid container ID is required with --ct-id option"
            fi
            CT_ID="$2"
            shift 2
            ;;
        --hostname)
            if [[ -z "$2" ]]; then
                error "Hostname is required with --hostname option"
            fi
            CT_NAME="$2"
            shift 2
            ;;
        --memory)
            if [[ -z "$2" ]] || ! [[ "$2" =~ ^[0-9]+$ ]]; then
                error "Valid memory size in MB is required with --memory option"
            fi
            CT_MEMORY="$2"
            shift 2
            ;;
        --cores)
            if [[ -z "$2" ]] || ! [[ "$2" =~ ^[0-9]+$ ]]; then
                error "Valid number of cores is required with --cores option"
            fi
            CT_CORES="$2"
            shift 2
            ;;
        --disk)
            if [[ -z "$2" ]] || ! [[ "$2" =~ ^[0-9]+$ ]]; then
                error "Valid disk size in GB is required with --disk option"
            fi
            CT_DISK_SIZE="$2"
            shift 2
            ;;
        --storage)
            if [[ -z "$2" ]]; then
                error "Storage location is required with --storage option"
            fi
            CT_STORAGE="$2"
            shift 2
            ;;
        --domain)
            if [[ -z "$2" ]]; then
                error "Domain name is required with --domain option"
            fi
            DOMAIN="$2"
            shift 2
            ;;
        --email)
            if [[ -z "$2" ]]; then
                error "Email address is required with --email option"
            fi
            EMAIL="$2"
            shift 2
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1. Use --help for usage information."
            ;;
    esac
done

# Build network configuration
build_network_config() {
    local net_config="name=eth0,bridge=$CT_BRIDGE"
    
    if [[ "$USE_DHCP" == "true" ]]; then
        net_config="$net_config,ip=dhcp"
        info "Using DHCP for network configuration"
    else
        if [[ -z "$STATIC_IP" ]]; then
            error "Static IP must be specified when not using DHCP"
        fi
        net_config="$net_config,ip=$STATIC_IP"
        
        if [[ -n "$GATEWAY" ]]; then
            net_config="$net_config,gw=$GATEWAY"
        fi
        
        info "Using static IP configuration: $STATIC_IP"
        [[ -n "$GATEWAY" ]] && info "Gateway: $GATEWAY"
    fi
    
    echo "$net_config"
}

# Validation checks before deployment
pre_deployment_checks() {
    info "Running pre-deployment validation checks..."
    
    # Check if running on Proxmox host
    if ! command -v pct &> /dev/null; then
        error "This script must be run on a Proxmox host with 'pct' command available"
    fi
    
    # Check if template exists
    if ! pveam list local | grep -q "$CT_TEMPLATE"; then
        warn "Template $CT_TEMPLATE not found in local storage"
        info "Available templates:"
        pveam list local | grep -E "\.tar\.(gz|xz|zst)$" || warn "No templates found"
        error "Please download the required template first with: pveam download local $CT_TEMPLATE"
    fi
    
    # Check if storage exists
    if ! pvesm status | grep -q "$CT_STORAGE"; then
        error "Storage '$CT_STORAGE' does not exist. Available storage:"
        pvesm status
    fi
    
    # Check if bridge exists
    if ! ip link show | grep -q "$CT_BRIDGE"; then
        error "Network bridge '$CT_BRIDGE' does not exist"
    fi
    
    # Validate static IP network configuration
    if [[ "$USE_DHCP" == "false" ]]; then
        if [[ -z "$STATIC_IP" ]]; then
            error "Static IP is required when not using DHCP"
        fi
        
        # If gateway is specified, validate it's in the same network
        if [[ -n "$GATEWAY" && -n "$STATIC_IP" ]]; then
            local ip_part=${STATIC_IP%/*}
            local cidr_part=${STATIC_IP#*/}
            
            # Basic network validation (simplified)
            local ip_network=$(ipcalc -n "$STATIC_IP" 2>/dev/null | cut -d= -f2 2>/dev/null || echo "")
            if [[ -n "$ip_network" ]]; then
                local gw_network=$(ipcalc -n "$GATEWAY/$cidr_part" 2>/dev/null | cut -d= -f2 2>/dev/null || echo "")
                if [[ -n "$gw_network" && "$ip_network" != "$gw_network" ]]; then
                    warn "Gateway $GATEWAY may not be in the same network as IP $STATIC_IP"
                fi
            fi
        fi
    fi
    
    info "Pre-deployment checks completed successfully"
}

# Check if running on Proxmox host
if ! command -v pct &> /dev/null; then
    error "This script must be run on a Proxmox host with 'pct' command available"
fi

# Run pre-deployment checks
pre_deployment_checks

# Display configuration summary
echo ""
echo -e "${CYAN}=================================================================${NC}"
echo -e "${CYAN}            Military Database Analyzer Deployment${NC}"
echo -e "${CYAN}=================================================================${NC}"
echo ""
echo -e "${YELLOW}Container Configuration:${NC}"
echo "  ID: $CT_ID"
echo "  Hostname: $CT_NAME" 
echo "  Memory: ${CT_MEMORY}MB"
echo "  Cores: $CT_CORES"
echo "  Disk: ${CT_DISK_SIZE}GB"
echo "  Storage: $CT_STORAGE"
echo ""
echo -e "${YELLOW}Network Configuration:${NC}"
if [[ "$USE_DHCP" == "true" ]]; then
    echo "  Mode: DHCP"
    echo "  Bridge: $CT_BRIDGE"
else
    echo "  Mode: Static IP"
    echo "  IP Address: $STATIC_IP"
    echo "  Gateway: ${GATEWAY:-"Not specified"}"
    echo "  Bridge: $CT_BRIDGE"
fi
[[ -n "$DNS_SERVERS" ]] && echo "  DNS Servers: $DNS_SERVERS"
echo ""
echo -e "${YELLOW}Application Configuration:${NC}"
echo "  Domain: $DOMAIN"
echo "  Email: $EMAIL"
echo ""
echo -e "${CYAN}=================================================================${NC}"

# Confirmation prompt
echo -n -e "${YELLOW}Proceed with deployment? (y/N): ${NC}"
read -r CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Build network configuration
CT_NETWORK=$(build_network_config)

log "Starting Military Database Analyzer deployment on CT $CT_ID"

# Check if container already exists
if pct list | grep -q "^$CT_ID "; then
    warn "Container $CT_ID already exists. Destroying and recreating..."
    pct stop $CT_ID 2>/dev/null || true
    pct destroy $CT_ID 2>/dev/null || true
    sleep 2
fi

log "Creating LXC container $CT_ID..."

# Create the container
pct create $CT_ID local:vztmpl/$CT_TEMPLATE \
    --hostname $CT_NAME \
    --memory $CT_MEMORY \
    --swap $CT_SWAP \
    --cores $CT_CORES \
    --rootfs $CT_STORAGE:$CT_DISK_SIZE \
    --net0 $CT_NETWORK \
    --features nesting=1,keyctl=1 \
    --unprivileged 1 \
    --onboot 1 \
    --password || error "Failed to create container"

log "Starting container $CT_ID..."
pct start $CT_ID || error "Failed to start container"

# Wait for container to be ready
log "Waiting for container to be ready..."
sleep 10

# Configure DNS if specified
if [[ -n "$DNS_SERVERS" ]]; then
    log "Configuring custom DNS servers..."
    IFS=',' read -ra DNS_ARRAY <<< "$DNS_SERVERS"
    
    # Clear existing DNS configuration and add custom servers
    exec_in_ct "echo '# Custom DNS configuration' > /etc/resolv.conf"
    for dns in "${DNS_ARRAY[@]}"; do
        dns=$(echo "$dns" | xargs)  # Trim whitespace
        exec_in_ct "echo 'nameserver $dns' >> /etc/resolv.conf"
    done
    
    # Make resolv.conf immutable to prevent overwrite by network manager
    exec_in_ct "chattr +i /etc/resolv.conf 2>/dev/null || true"
    
    info "DNS servers configured: $DNS_SERVERS"
fi

# Function to execute commands in container
exec_in_ct() {
    pct exec $CT_ID -- bash -c "$1"
}

# Function to copy content to container
copy_to_ct() {
    local content="$1"
    local dest_path="$2"
    local temp_file=$(mktemp)
    echo "$content" > "$temp_file"
    pct push $CT_ID "$temp_file" "$dest_path"
    rm "$temp_file"
}

log "Updating system and installing dependencies..."

# Test network first
test_network_connectivity

exec_in_ct "apt update && apt upgrade -y"

exec_in_ct "DEBIAN_FRONTEND=noninteractive apt install -y \
    curl wget git python3 python3-pip nodejs npm build-essential \
    nginx certbot python3-certbot-nginx openssl ufw \
    rabbitmq-server htop iotop net-tools apache2-utils \
    redis-server logrotate cron ipcalc"

log "Installing Node.js 18.x LTS..."
exec_in_ct "curl -fsSL https://deb.nodesource.com/setup_18.x | bash -"
exec_in_ct "apt install -y nodejs"

log "Installing Python dependencies..."
exec_in_ct "pip3 install flask fastapi uvicorn sqlalchemy psycopg2-binary pymongo redis celery pika requests pandas numpy"

log "Creating application directory structure..."
exec_in_ct "mkdir -p /opt/military-db-analyzer/{src/static/js,logs,config,data}"
exec_in_ct "mkdir -p /opt/backups/military-db-analyzer"

log "Cloning repositories..."
exec_in_ct "cd /opt/military-db-analyzer && git clone https://github.com/DXCSithlordPadawan/IES.git . 2>/dev/null || echo 'Repository may be private or not exist'"
exec_in_ct "cd /opt && git clone https://github.com/DXCSithlordPadawan/rabbitmq.git 2>/dev/null || echo 'Repository may be private or not exist'"

log "Setting up directory permissions..."
exec_in_ct "chown -R root:root /opt/military-db-analyzer /opt/rabbitmq"
exec_in_ct "chmod -R 755 /opt/military-db-analyzer"

log "Creating systemd service for Military Database Analyzer..."

SYSTEMD_SERVICE='[Unit]
Description=Military Database Analyzer Web Service
After=network.target nginx.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/military-db-analyzer
ExecStart=/usr/bin/python3 /opt/military-db-analyzer/military_database_analyzer_v3.py --web --host 127.0.0.1 --port 8080
Restart=always
RestartSec=3
Environment=PYTHONPATH=/opt/military-db-analyzer
Environment=NODE_PATH=/opt/military-db-analyzer/src/static/js
Environment=FORWARDED_ALLOW_IPS="127.0.0.1"
Environment=PROXY_PREFIX=""

StandardOutput=journal
StandardError=journal
SyslogIdentifier=military-db-analyzer

[Install]
WantedBy=multi-user.target'

copy_to_ct "$SYSTEMD_SERVICE" "/etc/systemd/system/military-db-analyzer.service"

log "Creating Node.js script wrapper..."

NODE_WRAPPER='#!/bin/bash

# Script to run Node.js files from the static/js directory
# Usage: ./run_node_script.sh S500.js --add --db OP7

SCRIPT_DIR="/opt/military-db-analyzer/src/static/js"
SCRIPT_NAME="$1"
shift  # Remove script name from arguments

if [ ! -f "$SCRIPT_DIR/$SCRIPT_NAME" ]; then
    echo "Error: Script $SCRIPT_NAME not found in $SCRIPT_DIR"
    exit 1
fi

cd "$SCRIPT_DIR"
node "$SCRIPT_NAME" "$@"'

copy_to_ct "$NODE_WRAPPER" "/opt/military-db-analyzer/run_node_script.sh"
exec_in_ct "chmod +x /opt/military-db-analyzer/run_node_script.sh"

log "Setting up environment and PATH..."
exec_in_ct "echo 'export PATH=\$PATH:/opt/military-db-analyzer' >> /etc/profile"
exec_in_ct "echo 'export NODE_PATH=/opt/military-db-analyzer/src/static/js:\$NODE_PATH' >> /etc/profile"
exec_in_ct "ln -sf /opt/military-db-analyzer/run_node_script.sh /usr/local/bin/run-military-script"

log "Creating RabbitMQ consumer wrapper..."

RABBITMQ_WRAPPER='#!/usr/bin/env python3
import os
import subprocess
import sys
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set environment variables
os.environ["NODE_PATH"] = "/opt/military-db-analyzer/src/static/js"
os.environ["MILITARY_JS_PATH"] = "/opt/military-db-analyzer/src/static/js"

def execute_military_script(script_name, *args):
    """Execute a Node.js script from the military analyzer"""
    
    script_path = Path("/opt/military-db-analyzer/src/static/js") / script_name
    
    if not script_path.exists():
        logger.error(f"Script not found: {script_path}")
        return {
            "success": False,
            "error": f"Script {script_name} not found",
            "returncode": 1
        }
    
    env = os.environ.copy()
    env["NODE_PATH"] = "/opt/military-db-analyzer/src/static/js"
    
    cmd = ["node", str(script_path)] + list(args)
    
    try:
        logger.info(f"Executing: {\" \".join(cmd)}")
        
        result = subprocess.run(
            cmd,
            cwd=str(script_path.parent),
            env=env,
            capture_output=True,
            text=True,
            timeout=300
        )
        
        return {
            "success": result.returncode == 0,
            "returncode": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "command": " ".join(cmd)
        }
        
    except subprocess.TimeoutExpired:
        logger.error(f"Script {script_name} timed out")
        return {
            "success": False,
            "error": "Script execution timed out",
            "returncode": -1
        }
    except Exception as e:
        logger.error(f"Error executing {script_name}: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "returncode": -1
        }

# Example usage
if __name__ == "__main__":
    if len(sys.argv) > 1:
        result = execute_military_script(*sys.argv[1:])
        print(f"Result: {result}")
    else:
        # Import original consumer if it exists
        sys.path.append("/opt/rabbitmq")
        try:
            from rabbitmq_consumer import *
        except ImportError:
            logger.info("rabbitmq_consumer.py not found, wrapper is ready for integration")
'

copy_to_ct "$RABBITMQ_WRAPPER" "/opt/rabbitmq/rabbitmq_consumer_wrapper.py"
exec_in_ct "chmod +x /opt/rabbitmq/rabbitmq_consumer_wrapper.py"

log "Creating SSL certificates directory and generating self-signed certificate..."
exec_in_ct "mkdir -p /etc/nginx/ssl"
exec_in_ct "openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/military-db-analyzer.key \
    -out /etc/nginx/ssl/military-db-analyzer.crt \
    -subj '/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=$DOMAIN'"

log "Creating Nginx SSL and proxy configuration snippets..."

SSL_SECURITY_CONF='# SSL Configuration for enhanced security
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;

ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;

add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;'

copy_to_ct "$SSL_SECURITY_CONF" "/etc/nginx/snippets/ssl-security.conf"

PROXY_PARAMS_CONF='proxy_set_header Host $http_host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $server_name;
proxy_set_header X-Forwarded-Port $server_port;
proxy_redirect off;

proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;

proxy_buffering on;
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;'

copy_to_ct "$PROXY_PARAMS_CONF" "/etc/nginx/snippets/proxy-params.conf"

log "Creating main Nginx configuration..."

NGINX_CONFIG="upstream military_db_app {
    server 127.0.0.1:8080 fail_timeout=0;
}

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN _;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN _;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/military-db-analyzer.crt;
    ssl_certificate_key /etc/nginx/ssl/military-db-analyzer.key;
    
    include /etc/nginx/snippets/ssl-security.conf;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

    # Access and error logs
    access_log /var/log/nginx/military-db-analyzer.access.log;
    error_log /var/log/nginx/military-db-analyzer.error.log;

    # Root location - proxy to the Python application
    location / {
        proxy_pass http://military_db_app;
        include /etc/nginx/snippets/proxy-params.conf;
    }

    # Static files
    location /static/ {
        alias /opt/military-db-analyzer/src/static/;
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }

    # WebSocket support
    location /ws/ {
        proxy_pass http://military_db_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        include /etc/nginx/snippets/proxy-params.conf;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://military_db_app/health;
        access_log off;
    }

    # RabbitMQ Management Interface
    location /rabbitmq/ {
        proxy_pass http://127.0.0.1:15672/;
        include /etc/nginx/snippets/proxy-params.conf;
    }

    # Deny access to sensitive files
    location ~ /\\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}"

copy_to_ct "$NGINX_CONFIG" "/etc/nginx/sites-available/military-db-analyzer"

log "Configuring Nginx..."
exec_in_ct "rm -f /etc/nginx/sites-enabled/default"
exec_in_ct "ln -sf /etc/nginx/sites-available/military-db-analyzer /etc/nginx/sites-enabled/"
exec_in_ct "nginx -t"

log "Creating monitoring script..."

MONITORING_SCRIPT='#!/bin/bash
# Comprehensive monitoring script

LOG_FILE="/var/log/military-db-monitoring.log"
DATE=$(date "+%Y-%m-%d %H:%M:%S")

echo "[$DATE] === Military Database Analyzer Status ===" | tee -a $LOG_FILE

SERVICES=("nginx" "military-db-analyzer" "rabbitmq-server")
for service in "${SERVICES[@]}"; do
    status=$(systemctl is-active $service)
    echo "[$DATE] $service: $status" | tee -a $LOG_FILE
done

echo "[$DATE] Node.js processes: $(pgrep -c node 2>/dev/null || echo 0)" | tee -a $LOG_FILE
echo "[$DATE] Python processes: $(pgrep -c python3 2>/dev/null || echo 0)" | tee -a $LOG_FILE

PORTS=("80" "443" "8080" "5672" "15672")
for port in "${PORTS[@]}"; do
    if netstat -tuln | grep -q ":$port "; then
        echo "[$DATE] Port $port: OPEN" | tee -a $LOG_FILE
    else
        echo "[$DATE] Port $port: CLOSED" | tee -a $LOG_FILE
    fi
done

echo "[$DATE] Memory Usage:" | tee -a $LOG_FILE
free -h | tee -a $LOG_FILE

echo "[$DATE] Disk Usage:" | tee -a $LOG_FILE
df -h /opt/military-db-analyzer | tee -a $LOG_FILE

if curl -k -s -o /dev/null -w "%{http_code}" https://localhost/ | grep -q "200\\|301\\|302"; then
    echo "[$DATE] HTTPS endpoint: OK" | tee -a $LOG_FILE
else
    echo "[$DATE] HTTPS endpoint: FAILED" | tee -a $LOG_FILE
fi

echo "[$DATE] Monitoring completed." | tee -a $LOG_FILE'

copy_to_ct "$MONITORING_SCRIPT" "/opt/military-db-analyzer/monitor.sh"
exec_in_ct "chmod +x /opt/military-db-analyzer/monitor.sh"

log "Creating startup script..."

STARTUP_SCRIPT='#!/bin/bash
echo "Starting Military Database Analyzer Services..."

if ! systemctl is-active --quiet rabbitmq-server; then
    echo "Starting RabbitMQ server..."
    systemctl start rabbitmq-server
    sleep 5
fi

echo "Starting Military Database Analyzer web service..."
systemctl start military-db-analyzer

echo "Starting Nginx..."
systemctl start nginx

echo "All services started. Status:"
systemctl status military-db-analyzer --no-pager -l
systemctl status nginx --no-pager -l
systemctl status rabbitmq-server --no-pager -l'

copy_to_ct "$STARTUP_SCRIPT" "/opt/military-db-analyzer/start_services.sh"
exec_in_ct "chmod +x /opt/military-db-analyzer/start_services.sh"

log "Creating comprehensive test script..."

TEST_SCRIPT='#!/bin/bash

echo "=== Military Database Analyzer Deployment Test ==="
ERRORS=0

test_endpoint() {
    local url=$1
    local expected_code=$2
    local description=$3
    
    echo -n "Testing $description... "
    response=$(curl -k -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)
    
    if [[ "$response" == "$expected_code" ]]; then
        echo "✅ PASS (HTTP $response)"
    else
        echo "❌ FAIL (Expected $expected_code, got $response)"
        ((ERRORS++))
    fi
}

echo "1. Testing Service Status:"
services=("nginx" "military-db-analyzer" "rabbitmq-server")
for service in "${services[@]}"; do
    if systemctl is-active --quiet "$service"; then
        echo "✅ $service is running"
    else
        echo "❌ $service is not running"
        ((ERRORS++))
    fi
done

echo ""
echo "2. Testing HTTP/HTTPS Endpoints:"
test_endpoint "http://localhost/" "301" "HTTP to HTTPS redirect"
test_endpoint "https://localhost/" "200" "HTTPS main page"

echo ""
echo "3. Testing Network Ports:"
for port in 80 443 5672; do
    if netstat -tuln | grep -q ":$port "; then
        echo "✅ Port $port is listening"
    else
        echo "❌ Port $port is not listening"
        ((ERRORS++))
    fi
done

echo ""
echo "4. Testing Node.js Environment:"
if [ -d "/opt/military-db-analyzer/src/static/js" ]; then
    echo "✅ Node.js script directory exists"
else
    echo "❌ Node.js script directory missing"
    ((ERRORS++))
fi

echo ""
echo "=== Test Summary ==="
if [ $ERRORS -eq 0 ]; then
    echo "🎉 All critical tests passed!"
    echo ""
    echo "Your Military Database Analyzer is ready!"
    echo "Access via: https://$(hostname -I | awk \"{print \\$1}\")/"
    echo ""
    echo "Next steps:"
    echo "1. Deploy your application code to /opt/military-db-analyzer/"
    echo "2. Configure SSL certificate with: certbot --nginx -d '$DOMAIN'"
    echo "3. Test RabbitMQ integration"
else
    echo "❌ Found $ERRORS issues that need resolution."
fi'

copy_to_ct "$TEST_SCRIPT" "/opt/military-db-analyzer/test-deployment.sh"
exec_in_ct "chmod +x /opt/military-db-analyzer/test-deployment.sh"

log "Setting up log rotation..."

LOGROTATE_CONFIG='/opt/military-db-analyzer/logs/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 644 root root
    postrotate
        systemctl reload military-db-analyzer 2>/dev/null || true
    endscript
}

/var/log/nginx/military-db-analyzer.*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}'

copy_to_ct "$LOGROTATE_CONFIG" "/etc/logrotate.d/military-db-analyzer"

log "Configuring firewall..."
exec_in_ct "ufw --force enable"
exec_in_ct "ufw allow 22"  # SSH
exec_in_ct "ufw allow 80"  # HTTP
exec_in_ct "ufw allow 443" # HTTPS
exec_in_ct "ufw deny 8080" # Block direct access to app
exec_in_ct "ufw allow from 10.0.0.0/8 to any port 5672"     # RabbitMQ from private networks
exec_in_ct "ufw allow from 172.16.0.0/12 to any port 5672"
exec_in_ct "ufw allow from 192.168.0.0/16 to any port 5672"

log "Enabling RabbitMQ management plugin..."
exec_in_ct "rabbitmq-plugins enable rabbitmq_management"

log "Setting up cron jobs..."
exec_in_ct "(crontab -l 2>/dev/null; echo '*/5 * * * * /opt/military-db-analyzer/monitor.sh >/dev/null 2>&1') | crontab -"
exec_in_ct "(crontab -l 2>/dev/null; echo '0 3 * * * /opt/military-db-analyzer/backup.sh >/dev/null 2>&1') | crontab -"

log "Starting and enabling services..."
exec_in_ct "systemctl daemon-reload"
exec_in_ct "systemctl enable rabbitmq-server"
exec_in_ct "systemctl enable nginx"
exec_in_ct "systemctl enable military-db-analyzer"

exec_in_ct "systemctl start rabbitmq-server"
sleep 5
exec_in_ct "systemctl start nginx"

# Note: military-db-analyzer service will fail initially because the Python script doesn't exist yet
# This is expected and will be resolved when the actual application code is deployed

log "Getting container network information..."
CONTAINER_IP=""
CONTAINER_GATEWAY=""

# Function to get container network info
get_container_network_info() {
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        # Try to get IP address
        CONTAINER_IP=$(pct exec $CT_ID -- hostname -I 2>/dev/null | awk '{print $1}' | tr -d '\n' || echo "")
        
        if [[ -n "$CONTAINER_IP" && "$CONTAINER_IP" != "127.0.0.1" ]]; then
            # Get gateway info
            CONTAINER_GATEWAY=$(pct exec $CT_ID -- ip route show default 2>/dev/null | awk '{print $3}' | head -1 || echo "")
            info "Container IP obtained: $CONTAINER_IP"
            [[ -n "$CONTAINER_GATEWAY" ]] && info "Container gateway: $CONTAINER_GATEWAY"
            return 0
        fi
        
        info "Waiting for network configuration... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    warn "Could not obtain container IP address after $max_attempts attempts"
    return 1
}

# Get network information
get_container_network_info

# Test network connectivity
test_network_connectivity() {
    log "Testing network connectivity..."
    
    # Test basic connectivity
    if exec_in_ct "ping -c 2 8.8.8.8 >/dev/null 2>&1"; then
        info "✅ Internet connectivity test passed"
    else
        warn "❌ Internet connectivity test failed"
        
        # Try to diagnose the issue
        info "Network diagnostics:"
        exec_in_ct "ip addr show eth0" || true
        exec_in_ct "ip route show" || true
        exec_in_ct "cat /etc/resolv.conf" || true
    fi
    
    # Test DNS resolution
    if exec_in_ct "nslookup google.com >/dev/null 2>&1" || exec_in_ct "dig google.com >/dev/null 2>&1"; then
        info "✅ DNS resolution test passed"
    else
        warn "❌ DNS resolution test failed"
    fi
}

log "Running deployment test..."
exec_in_ct "/opt/military-db-analyzer/test-deployment.sh"

echo ""
echo "================================================================="
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉${NC}"
echo "================================================================="
echo ""
echo "Container Details:"
echo "  ID: $CT_ID"
echo "  Name: $CT_NAME"
echo "  IP Address: $CONTAINER_IP"
echo "  Domain: $DOMAIN"
echo ""
echo "Access URLs:"
echo "  HTTPS: https://$CONTAINER_IP/"
echo "  RabbitMQ Management: https://$CONTAINER_IP/rabbitmq/"
echo ""
echo "Next Steps:"
echo "1. Deploy your application code:"
echo "   pct exec $CT_ID -- git clone <your-repo> /opt/military-db-analyzer"
echo ""
echo "2. Install Python requirements (if they exist):"
echo "   pct exec $CT_ID -- pip3 install -r /opt/military-db-analyzer/requirements.txt"
echo ""
echo "3. Start the application service:"
echo "   pct exec $CT_ID -- systemctl start military-db-analyzer"
echo ""
echo "4. For production with real domain, set up Let's Encrypt:"
echo "   pct exec $CT_ID -- certbot --nginx -d $DOMAIN"
echo ""
echo "5. Monitor the services:"
echo "   pct exec $CT_ID -- /opt/military-db-analyzer/monitor.sh"
echo ""
echo "6. View logs:"
echo "   pct exec $CT_ID -- journalctl -u military-db-analyzer -f"
echo ""
echo "Container is ready for your Military Database Analyzer deployment!"
echo "================================================================="