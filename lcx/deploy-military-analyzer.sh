#!/bin/bash

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
# Usage: ./deploy-military-analyzer.sh [domain] [email]
# Example: ./deploy-military-analyzer.sh military-db.example.com admin@example.com
#####################################################################

set -e  # Exit on any error

# Configuration variables
CT_ID=140
CT_NAME="military-db-analyzer"
CT_TEMPLATE="ubuntu-22.04-standard_22.04-1_amd64.tar.zst"
CT_STORAGE="local-lvm"
CT_MEMORY=2048
CT_SWAP=512
CT_CORES=2
CT_DISK_SIZE=20
CT_NETWORK="name=eth0,bridge=vmbr0,ip=dhcp"

# Get domain and email from command line arguments
DOMAIN=${1:-"military-analyzer.local"}
EMAIL=${2:-"admin@localhost"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Check if running on Proxmox host
if ! command -v pct &> /dev/null; then
    error "This script must be run on a Proxmox host with 'pct' command available"
fi

log "Starting Military Database Analyzer deployment on CT $CT_ID"
log "Domain: $DOMAIN"
log "Email: $EMAIL"

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

exec_in_ct "apt update && apt upgrade -y"

exec_in_ct "DEBIAN_FRONTEND=noninteractive apt install -y \
    curl wget git python3 python3-pip nodejs npm build-essential \
    nginx certbot python3-certbot-nginx openssl ufw \
    rabbitmq-server htop iotop net-tools apache2-utils \
    redis-server logrotate cron"

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

log "Getting container IP address..."
CONTAINER_IP=$(pct exec $CT_ID -- hostname -I | awk '{print $1}')

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