## Usage Examples with Nginx Proxy

### Accessing the Application

**HTTPS Access (Production):**
```bash
# With domain
https://your-domain.com/

# With IP (self-signed certificate)
https://your-server-ip/  # Browser will show security warning
```

**API Endpoints:**
```bash
# Health check
curl -k https://your-domain.com/health

# Application API (example)
curl -k -X POST https://your-domain.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"database": "OP7", "action": "add"}'
```

**RabbitMQ Management Interface:**
```bash
# Access via Nginx proxy with authentication
https://your-domain.com/rabbitmq/

# Direct access (if firewall allows)
http://your-server-ip:15672/
```

### Running Node.js Scripts from RabbitMQ Consumer

Updated Python code for the RabbitMQ consumer with proxy awareness:

```python
import subprocess
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def execute_military_script(script_name, *args):
    """Execute a Node.js script from the military analyzer with enhanced error handling"""
    
    # Set environment variables
    env = os.environ.copy()
    env['NODE_PATH'] = '/opt/military-db-analyzer/src/static/js'
    env['PATH'] = f"/usr/bin:/usr/local/bin:{env.get('PATH', '')}"
    
    # Construct command
    script_path = f'/opt/military-db-analyzer/src/static/js/{script_name}'
    cmd = ['node', script_path] + list(args)
    
    # Verify script exists
    if not os.path.exists(script_path):
        logger.error(f"Script not found: {script_path}")
        return {
            'success': False,
            'error': f'Script {script_name} not found',
            'returncode': 1
        }
    
    try:
        logger.info(f"Executing: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            cwd='/opt/military-db-analyzer/src/static/js',
            env=env,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        logger.info(f"Script {script_name} completed with return code: {result.returncode}")
        
        return {
            'success': result.returncode == 0,
            'returncode': result.returncode,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'command': ' '.join(cmd)
        }
        
    except subprocess.TimeoutExpired:
        logger.error(f"Script {script_name} timed out after 300 seconds")
        return {
            'success': False,
            'error': 'Script execution timed out',
            'returncode': -1
        }
    except Exception as e:
        logger.error(f"Error executing {script_name}: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'returncode': -1
        }

# Example usage in RabbitMQ consumer
def handle_military_operation(channel, method, properties, body):
    """Handle RabbitMQ messages for military operations"""
    try:
        import json
        message = json.loads(body)
        
        script_name = message.get('script', 'S500.js')
        operation = message.get('operation', '--add')
        database = message.get('database', 'OP7')
        
        # Execute the Node.js script
        result = execute_military_script(script_name, operation, '--db', database)
        
        if result['success']:
            logger.info(f"Successfully executed {script_name}: {result['stdout']}")
            # Send success response back via HTTP API
            notify_web_interface('success', {
                'script': script_name,
                'operation': operation,
                'database': database,
                'output': result['stdout']
            })
        else:
            logger.error(f"Failed to execute {script_name}: {result['error']}")
            # Send error response back via HTTP API
            notify_web_interface('error', {
                'script': script_name,
                'error': result['error']
            })
            
        # Acknowledge the message
        channel.basic_ack(delivery_tag=method.delivery_tag)
        
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        channel.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

def notify_web_interface(status, data):
    """Notify the web interface about operation results via internal API"""
    import requests
    
    try:
        response = requests.post(
            'http://127.0.0.1:8080/api/operation-result',
            json={'status': status, 'data': data},
            timeout=10
        )
        response.raise_for_status()
    except requests.RequestException as e:
        logger.error(f"Failed to notify web interface: {str(e)}")

# Example RabbitMQ consumer setup
import pika

def setup_rabbitmq_consumer():
    """Set up RabbitMQ consumer for military operations"""
    
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(
            host='localhost',
            port=5672,
            virtual_host='/',
            credentials=pika.PlainCredentials('guest', 'guest')
        )
    )
    
    channel = connection.channel()
    
    # Declare queue
    channel.queue_declare(queue='military_operations', durable=True)
    
    # Set up consumer
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(
        queue='military_operations',
        on_message_callback=handle_military_operation
    )
    
    logger.info("Starting RabbitMQ consumer for military operations...")
    
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        logger.info("Stopping consumer...")
        channel.stop_consuming()
        connection.close()

if __name__ == "__main__":
    setup_rabbitmq_consumer()
```

## Step 23: Security Hardening

### SSL Security Enhancements

```bash
# Create Diffie-Hellman parameters for enhanced security
openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048

# Update SSL configuration to include DH params
cat >> /etc/nginx/snippets/ssl-security.conf << 'EOF'

# Diffie-Hellman parameter for DHE ciphersuites
ssl_dhparam /etc/ssl/certs/dhparam.pem;

# OCSP stapling
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
EOF
```

### Application Security Configuration

```bash
# Create application security configuration
cat > /opt/military-db-analyzer/security_config.py << 'EOF'
"""Security configuration for Military Database Analyzer"""

import os
from datetime import timedelta

class SecurityConfig:
    # SSL/TLS Configuration
    SSL_REDIRECT = True
    SSL_DISABLE = False
    
    # Session Configuration
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(hours=2)
    
    # Security Headers (handled by Nginx, but can be enforced in app)
    SECURITY_HEADERS = {
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Content-Type-Options': 'nosniff',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'no-referrer-when-downgrade'
    }
    
    # CORS Configuration
    CORS_ORIGINS = [
        "https://your-domain.com",
        "https://www.your-domain.com"
    ]
    
    # Rate Limiting
    RATELIMIT_STORAGE_URL = "redis://localhost:6379"
    RATELIMIT_DEFAULT = "100 per hour"
    
    # API Security
    API_KEY_REQUIRED = True
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-this')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    
    # Database Security
    DATABASE_POOL_RECYCLE = 300
    DATABASE_POOL_PRE_PING = True
    
    @staticmethod
    def init_app(app):
        """Initialize security settings for Flask app"""
        
        # Apply security headers
        @app.after_request
        def security_headers(response):
            for header, value in SecurityConfig.SECURITY_HEADERS.items():
                response.headers[header] = value
            return response
        
        # Force HTTPS in production
        @app.before_request
        def force_https():
            if not request.is_secure and app.config.get('SSL_REDIRECT'):
                return redirect(request.url.replace('http://', 'https://'))
EOF
```

### Nginx Rate Limiting

```bash
# Add rate limiting to Nginx configuration
cat > /etc/nginx/conf.d/rate-limiting.conf << 'EOF'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=web:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

# Connection limiting
limit_conn_zone $binary_remote_addr zone=perip:10m;
limit_conn_zone $server_name zone=perserver:10m;
EOF

# Update the main site configuration to use rate limiting
sed -i '/location \/ {/a\        # Rate limiting\n        limit_req zone=web burst=20 nodelay;\n        limit_conn perip 10;' /etc/nginx/sites-available/military-db-analyzer

sed -i '/location \/api\/ {/a\        # API rate limiting\n        limit_req zone=api burst=5 nodelay;' /etc/nginx/sites-available/military-db-analyzer || echo "# Add API rate limiting manually to /api/ location"
```

## Step 24: Performance Optimization

### Nginx Performance Tuning

```bash
# Create performance optimization configuration
cat > /etc/nginx/conf.d/performance.conf << 'EOF'
# Worker processes optimization
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

# HTTP performance settings
http {
    # Sendfile optimization
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    
    # Keep-alive settings
    keepalive_timeout 30;
    keepalive_requests 100;
    
    # Buffer sizes
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    output_buffers 1 32k;
    postpone_output 1460;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;
        
    # Brotli compression (if available)
    # brotli on;
    # brotli_comp_level 6;
    # brotli_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF
```

### Application Performance Monitoring

```bash
# Create performance monitoring script
cat > /opt/military-db-analyzer/performance-monitor.sh << 'EOF'
#!/bin/bash

# Performance monitoring for Military Database Analyzer

LOG_FILE="/var/log/performance-monitoring.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] === Performance Monitoring ===" >> $LOG_FILE

# Check response times
check_endpoint() {
    local url=$1
    local name=$2
    
    response_time=$(curl -o /dev/null -s -w '%{time_total}' -k "$url" 2>/dev/null || echo "failed")
    status_code=$(curl -o /dev/null -s -w '%{http_code}' -k "$url" 2>/dev/null || echo "000")
    
    echo "[$DATE] $name - Status: $status_code, Response Time: ${response_time}s" >> $LOG_FILE
}

# Check main endpoints
check_endpoint "https://localhost/" "Main Page"
check_endpoint "https://localhost/health" "Health Check"
check_endpoint "http://127.0.0.1:8080/" "Direct App"

# System performance metrics
echo "[$DATE] CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)" >> $LOG_FILE
echo "[$DATE] Memory Usage: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')" >> $LOG_FILE
echo "[$DATE] Load Average: $(uptime | awk -F'load average:' '{print $2}')" >> $LOG_FILE

# Nginx connection stats
if command -v nginx &> /dev/null; then
    active_connections=$(ss -tuln | grep -E ':(80|443)' | wc -l)
    echo "[$DATE] Active HTTP/HTTPS Connections: $active_connections" >> $LOG_FILE
fi

# Application-specific metrics
if pgrep -f military_database_analyzer_v3.py > /dev/null; then
    app_memory=$(pmap $(pgrep -f military_database_analyzer_v3.py) | tail -1 | awk '{print $2}' 2>/dev/null || echo "N/A")
    echo "[$DATE] Application Memory Usage: $app_memory" >> $LOG_FILE
fi

echo "[$DATE] Performance monitoring completed." >> $LOG_FILE
echo "" >> $LOG_FILE
EOF

chmod +x /opt/military-db-analyzer/performance-monitor.sh

# Add to crontab (every 15 minutes)
(crontab -l 2>/dev/null; echo "*/15 * * * * /opt/military-db-analyzer/performance-monitor.sh") | crontab -
```

## Step 25: Final Testing and Validation

```bash
# Comprehensive test script
cat > /opt/military-db-analyzer/test-deployment.sh << 'EOF'
#!/bin/bash

echo "=== Military Database Analyzer Deployment Test ==="
echo "Starting comprehensive testing..."

DOMAIN="your-domain.com"  # Change this to your actual domain
ERRORS=0

# Function to test endpoint
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

# Test service status
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

# Test HTTP redirect
test_endpoint "http://localhost/" "301" "HTTP to HTTPS redirect"

# Test HTTPS main page
test_endpoint "https://localhost/" "200" "HTTPS main page"

# Test health endpoint
test_endpoint "https://localhost/health" "200" "Health check endpoint"

# Test static files (if they exist)
test_endpoint "https://localhost/static/js/" "200" "Static files directory"

echo ""
echo "3. Testing SSL Certificate:"
if openssl s_client -connect localhost:443 -servername localhost < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
    echo "✅ SSL certificate verification passed"
else
    echo "⚠️  SSL certificate verification failed (expected for self-signed)"
fi

echo ""
echo "4. Testing Node.js Script Access:"
if [ -f "/opt/military-db-analyzer/src/static/js/S500.js" ]; then
    if node /opt/military-db-analyzer/src/static/js/S500.js --help &>/dev/null; then
        echo "✅ Node.js scripts are accessible"
    else
        echo "❌ Node.js scripts are not accessible"
        ((ERRORS++))
    fi
else
    echo "⚠️  S500.js not found (expected if not yet deployed)"
fi

echo ""
echo "5. Testing RabbitMQ:"
if rabbitmqctl status &>/dev/null; then
    echo "✅ RabbitMQ is operational"
else
    echo "❌ RabbitMQ is not operational"
    ((ERRORS++))
fi

echo ""
echo "6. Testing Network Connectivity:"
for port in 80 443 8080 5672; do
    if netstat -tuln | grep -q ":$port "; then
        echo "✅ Port $port is listening"
    else
        echo "❌ Port $port is not listening"
        ((ERRORS++))
    fi
done

echo ""
echo "7. Testing Log Files:"
log_files=(
    "/var/log/nginx/military-db-analyzer.access.log"
    "/var/log/nginx/military-db-analyzer.error.log"
    "/var/log/military-db-monitoring.log"
)

for log_file in "${log_files[@]}"; do
    if [ -f "$log_file" ]; then
        echo "✅ Log file exists: $log_file"
    else
        echo "⚠️  Log file missing: $log_file"
    fi
done

echo ""
echo "=== Test Summary ==="
if [ $ERRORS -eq 0 ]; then
    echo "🎉 All critical tests passed! Deployment appears successful."
    echo ""
    echo "Next steps:"
    echo "1. Update domain name in Nginx config: /etc/nginx/sites-available/military-db-analyzer"
    echo "2. Obtain SSL certificate: certbot certonly --nginx -d $DOMAIN"
    echo "3. Deploy your application code to /opt/military-db-analyzer/"
    echo "4. Configure your application's database connection"
    echo "5. Test RabbitMQ integration with your consumer script"
else
    echo "❌ Found $ERRORS critical issues that need to be resolved."
fi
EOF

chmod +x /opt/military-db-analyzer/test-deployment.sh

# Run the test
/opt/military-db-analyzer/test-deployment.sh
```

## Troubleshooting Guide

### Common Issues and Solutions

**1. SSL Certificate Issues:**
```bash
# Check certificate status
certbot certificates

# Renew certificate manually
certbot renew --nginx --dry-run

# Fix certificate permissions
chown root:root /etc/letsencrypt/live/*/privkey.pem
chmod 600 /etc/letsencrypt/live/*/privkey.pem
```

**2. Nginx Configuration Issues:**
```bash
# Test configuration
nginx -t

# Check syntax highlighting
nginx -T | grep -i error

# Reload configuration
systemctl reload nginx
```

**3. Application Not Starting:**
```bash
# Check application logs
journalctl -u military-db-analyzer -f

# Check Python application directly
cd /opt/military-db-analyzer
python3 military_database_analyzer_v3.py --web --host 127.0.0.1 --port 8080

# Verify port binding
netstat -tulpn | grep :8080
```

**4. RabbitMQ Connection Issues:**
```bash
# Check RabbitMQ status
rabbitmqctl status

# Reset RabbitMQ
systemctl stop rabbitmq-server
rm -rf /var/lib/rabbitmq/mnesia/
systemctl start rabbitmq-server

# Create user and permissions
rabbitmqctl add_user admin password
rabbitmqctl set_user_tags admin administrator
rabbitmqctl add_vhost /
rabbitmqctl set_permissions -p / admin ".*" ".*" ".*"
```

**5. Performance Issues:**
```bash
# Monitor system resources
htop
iotop
nethogs

# Check Nginx processes
ps aux | grep nginx

# Monitor application performance
/opt/military-db-analyzer/performance-monitor.sh
```

This comprehensive setup provides:
- ✅ Nginx reverse proxy with SSL termination
- ✅ Let's Encrypt SSL certificate automation
- ✅ Security hardening with proper headers and rate limiting
- ✅ Performance optimization
- ✅ Comprehensive monitoring and logging
- ✅ Automated backup and maintenance
- ✅ Complete testing framework

Your military database analyzer will now be accessible via HTTPS with proper SSL encryption, and the RabbitMQ consumer can still execute Node.js scripts like `node S500.js --add --db OP7` through the configured system paths.## Step 21: Monitoring and Logging

Set up comprehensive monitoring and logging:

```bash
# Create log rotation for all logs
cat > /etc/logrotate.d/military-db-analyzer << 'EOF'
/opt/military-db-analyzer/logs/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    create 644 root root
    postrotate
        systemctl reload military-db-analyzer
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
}
EOF

# Create comprehensive monitoring script
cat > /opt/military-db-analyzer/monitor.sh << 'EOF'
#!/bin/bash
# Comprehensive monitoring script for Military Database Analyzer

LOG_FILE="/var/log/military-db-monitoring.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] === Military Database Analyzer Status ===" | tee -a $LOG_FILE

# Check service status
SERVICES=("nginx" "military-db-analyzer" "rabbitmq-server")
for service in "${SERVICES[@]}"; do
    status=$(systemctl is-active $service)
    echo "[$DATE] $service: $status" | tee -a $LOG_FILE
    
    if [ "$status" != "active" ]; then
        echo "[$DATE] WARNING: $service is not active!" | tee -a $LOG_FILE
    fi
done

# Check processes
echo "[$DATE] Node.js processes: $(pgrep -c node 2>/dev/null || echo 0)" | tee -a $LOG_FILE
echo "[$DATE] Python processes: $(pgrep -c python3 2>/dev/null || echo 0)" | tee -a $LOG_FILE
echo "[$DATE] Nginx workers: $(pgrep -c nginx 2>/dev/null || echo 0)" | tee -a $LOG_FILE

# Check ports
PORTS=("80" "443" "8080" "5672" "15672")
for port in "${PORTS[@]}"; do
    if netstat -tuln | grep -q ":$port "; then
        echo "[$DATE] Port $port: OPEN" | tee -a $LOG_FILE
    else
        echo "[$DATE] Port $port: CLOSED" | tee -a $LOG_FILE
    fi
done

# Memory and disk usage
echo "[$DATE] === System Resources ===" | tee -a $LOG_FILE
echo "[$DATE] Memory Usage:" | tee -a $LOG_FILE
free -h | tee -a $LOG_FILE

echo "[$DATE] Disk Usage:" | tee -a $LOG_FILE
df -h /opt/military-db-analyzer | tee -a $LOG_FILE

# SSL certificate check (if using Let's Encrypt)
if [ -f /etc/letsencrypt/live/*/cert.pem ]; then
    cert_file=$(find /etc/letsencrypt/live/*/cert.pem | head -1)
    expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
    expiry_epoch=$(date -d "$expiry_date" +%s)
    current_epoch=$(date +%s)
    days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
    
    echo "[$DATE] SSL Certificate expires in $days_until_expiry days" | tee -a $LOG_FILE
    
    if [ $days_until_expiry -lt 30 ]; then
        echo "[$DATE] WARNING: SSL certificate expires soon!" | tee -a $LOG_FILE
    fi
fi

# Test application endpoints
if curl -k -s -o /dev/null -w "%{http_code}" https://localhost/ | grep -q "200\|301\|302"; then
    echo "[$DATE] HTTPS endpoint: OK" | tee -a $LOG_FILE
else
    echo "[$DATE] HTTPS endpoint: FAILED" | tee -a $LOG_FILE
fi

echo "[$DATE] Monitoring check completed." | tee -a $LOG_FILE
echo "" | tee -a $LOG_FILE
EOF

chmod +x /opt/military-db-analyzer/monitor.sh

# Add monitoring to crontab (run every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/military-db-analyzer/monitor.sh >/dev/null 2>&1") | crontab -
```

## Step 22: Backup and Maintenance Scripts

```bash
# Create backup script
cat > /opt/military-db-analyzer/backup.sh << 'EOF'
#!/bin/bash

# Backup script for Military Database Analyzer

BACKUP_DIR="/opt/backups/military-db-analyzer"
DATE=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.tar.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

echo "Starting backup at $(date)"

# Create backup
tar -czf $BACKUP_FILE \
    /opt/military-db-analyzer \
    /opt/rabbitmq \
    /etc/nginx/sites-available/military-db-analyzer* \
    /etc/systemd/system/military-db-analyzer.service \
    /etc/logrotate.d/military-db-analyzer \
    --exclude=/opt/military-db-analyzer/logs \
    --exclude=/opt/military-db-analyzer/data/temp \
    2>/dev/null

# Backup certificates if they exist
if [ -d /etc/letsencrypt ]; then
    tar -czf "$BACKUP_DIR/ssl_certs_$DATE.tar.gz" /etc/letsencrypt 2>/dev/null
fi

# Keep only last 7 backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete
find $BACKUP_DIR -name "ssl_certs_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
echo "Backup size: $(du -h $BACKUP_FILE | cut -f1)"
EOF

chmod +x /opt/military-db-analyzer/backup.sh

# Add backup to crontab (daily at 3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/military-db-analyzer/backup.sh") | crontab -

# Create maintenance script
cat > /opt/military-db-analyzer/maintenance.sh << 'EOF'
#!/bin/bash

# Maintenance script for Military Database Analyzer

echo "=== Starting Maintenance $(date) ==="

# Update system packages
echo "Updating system packages..."
apt update && apt upgrade -y

# Clean up logs older than 30 days
echo "Cleaning up old logs..."
find /var/log -name "*.log" -type f -mtime +30 -delete 2>/dev/null
find /opt/military-db-analyzer/logs -name "*.log" -type f -mtime +30 -delete 2>/dev/null

# Restart services to clear memory
echo "Restarting services..."
systemctl restart military-db-analyzer
systemctl reload nginx

# Clean up temporary files
echo "Cleaning temporary files..."
rm -rf /tmp/* 2>/dev/null
rm -rf /opt/military-db-analyzer/data/temp/* 2>/dev/null

# Check disk space
echo "Disk space status:"
df -h

echo "=== Maintenance completed $(date) ==="
EOF

chmod +x /opt/military-db-analyzer/maintenance.sh
```# Proxmox LXC Container Setup for Military Database Analyzer

This guide will help you create an LXC container on Proxmox to run the military database analyzer as a web service with Node.js script accessibility for RabbitMQ integration.

## Step 1: Create LXC Container on Proxmox

### Create Container via Proxmox Web Interface
1. Login to Proxmox web interface
2. Select your node in the left panel
3. Click "Create CT" button
4. Configure the container:
   - **CT ID**: Choose an available ID (e.g., 100)
   - **Hostname**: `military-db-analyzer`
   - **Template**: Ubuntu 22.04 LTS (recommended)
   - **Root Password**: Set a secure password
   - **Memory**: 2048 MB (minimum, adjust based on your needs)
   - **Swap**: 512 MB
   - **Disk**: 20 GB (adjust based on database size)
   - **CPU**: 2 cores (adjust as needed)
   - **Network**: Bridge (vmbr0) with DHCP or static IP

### Alternative: Create via CLI
```bash
# On Proxmox host
pct create 100 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname military-db-analyzer \
  --memory 2048 \
  --swap 512 \
  --cores 2 \
  --rootfs local-lvm:20 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --password
```

## Step 2: Start and Configure the Container

```bash
# Start the container
pct start 100

# Enter the container
pct enter 100
```

## Step 3: Install Dependencies in Container

```bash
# Update system
apt update && apt upgrade -y

# Install essential packages
apt install -y curl wget git python3 python3-pip nodejs npm build-essential

# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Verify installations
python3 --version
node --version
npm --version
```

## Step 4: Install Python Dependencies

```bash
# Install common Python packages for database and web applications
pip3 install flask fastapi uvicorn sqlalchemy psycopg2-binary pymongo redis celery rabbitmq

# Install additional packages that might be needed
pip3 install requests pandas numpy matplotlib seaborn plotly dash streamlit
```

## Step 5: Set Up Application Directory Structure

```bash
# Create application directory
mkdir -p /opt/military-db-analyzer
cd /opt/military-db-analyzer

# Create subdirectories
mkdir -p {src/static/js,logs,config,data}

# Set permissions
chown -R root:root /opt/military-db-analyzer
chmod -R 755 /opt/military-db-analyzer
```

## Step 6: Clone and Set Up Your Application

```bash
cd /opt/military-db-analyzer

# Clone the IES repository
git clone https://github.com/DXCSithlordPadawan/IES.git .

# Clone the RabbitMQ repository to a separate directory
cd /opt
git clone https://github.com/DXCSithlordPadawan/rabbitmq.git

# Install Node.js dependencies if package.json exists
cd /opt/military-db-analyzer
if [ -f package.json ]; then
    npm install
fi

# Install Python requirements if they exist
if [ -f requirements.txt ]; then
    pip3 install -r requirements.txt
fi
```

## Step 7: Create Systemd Service for Web Application

Create the service file:

```bash
cat > /etc/systemd/system/military-db-analyzer.service << 'EOF'
[Unit]
Description=Military Database Analyzer Web Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/military-db-analyzer
ExecStart=/usr/bin/python3 /opt/military-db-analyzer/military_database_analyzer_v3.py --web
Restart=always
RestartSec=3
Environment=PYTHONPATH=/opt/military-db-analyzer
Environment=NODE_PATH=/opt/military-db-analyzer/src/static/js

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=military-db-analyzer

[Install]
WantedBy=multi-user.target
EOF
```

## Step 8: Configure Node.js Script Access

Create a wrapper script to ensure Node.js scripts are accessible:

```bash
cat > /opt/military-db-analyzer/run_node_script.sh << 'EOF'
#!/bin/bash

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
node "$SCRIPT_NAME" "$@"
EOF

chmod +x /opt/military-db-analyzer/run_node_script.sh
```

## Step 9: Set Up Environment and Path

```bash
# Add to system PATH
echo 'export PATH=$PATH:/opt/military-db-analyzer' >> /etc/profile
echo 'export NODE_PATH=/opt/military-db-analyzer/src/static/js:$NODE_PATH' >> /etc/profile

# Create symlinks for easy access
ln -s /opt/military-db-analyzer/run_node_script.sh /usr/local/bin/run-military-script
ln -s /opt/military-db-analyzer/src/static/js /usr/local/bin/military-js-scripts
```

## Step 10: Configure RabbitMQ Integration

Set up the RabbitMQ consumer configuration:

```bash
# Install RabbitMQ server (optional, if running locally)
apt install -y rabbitmq-server

# Enable and start RabbitMQ
systemctl enable rabbitmq-server
systemctl start rabbitmq-server

# Configure RabbitMQ consumer script
cd /opt/rabbitmq
pip3 install -r requirements.txt  # if requirements file exists

# Create environment configuration
cat > /opt/rabbitmq/.env << 'EOF'
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
MILITARY_JS_PATH=/opt/military-db-analyzer/src/static/js
NODE_PATH=/usr/bin/node
EOF
```

## Step 11: Update RabbitMQ Consumer Script

Modify the rabbitmq_consumer.py to use the correct paths:

```bash
cat > /opt/rabbitmq/rabbitmq_consumer_wrapper.py << 'EOF'
#!/usr/bin/env python3
import os
import subprocess
import sys
from pathlib import Path

# Set environment variables
os.environ['NODE_PATH'] = '/opt/military-db-analyzer/src/static/js'
os.environ['MILITARY_JS_PATH'] = '/opt/military-db-analyzer/src/static/js'

def run_node_script(script_name, *args):
    """
    Run a Node.js script from the military analyzer static/js directory
    Example: run_node_script('S500.js', '--add', '--db', 'OP7')
    """
    script_path = Path('/opt/military-db-analyzer/src/static/js') / script_name
    
    if not script_path.exists():
        raise FileNotFoundError(f"Script {script_name} not found at {script_path}")
    
    cmd = ['node', str(script_path)] + list(args)
    
    try:
        result = subprocess.run(cmd, 
                              capture_output=True, 
                              text=True, 
                              cwd=script_path.parent,
                              timeout=300)  # 5 minute timeout
        
        return {
            'returncode': result.returncode,
            'stdout': result.stdout,
            'stderr': result.stderr
        }
    except subprocess.TimeoutExpired:
        return {
            'returncode': -1,
            'stdout': '',
            'stderr': 'Script execution timed out'
        }

if __name__ == "__main__":
    # Import and run the original consumer
    sys.path.append('/opt/rabbitmq')
    from rabbitmq_consumer import *
EOF

chmod +x /opt/rabbitmq/rabbitmq_consumer_wrapper.py
```

## Step 12: Create Startup Scripts

Create a comprehensive startup script:

```bash
cat > /opt/military-db-analyzer/start_services.sh << 'EOF'
#!/bin/bash

echo "Starting Military Database Analyzer Services..."

# Start RabbitMQ if not running
if ! systemctl is-active --quiet rabbitmq-server; then
    echo "Starting RabbitMQ server..."
    systemctl start rabbitmq-server
fi

# Start the web service
echo "Starting Military Database Analyzer web service..."
systemctl start military-db-analyzer

# Start RabbitMQ consumer
echo "Starting RabbitMQ consumer..."
cd /opt/rabbitmq
python3 rabbitmq_consumer_wrapper.py &

echo "All services started. Check status with:"
echo "  systemctl status military-db-analyzer"
echo "  systemctl status rabbitmq-server"
echo "  ps aux | grep rabbitmq_consumer"
EOF

chmod +x /opt/military-db-analyzer/start_services.sh
```

## Step 13: Enable and Start Services

```bash
# Reload systemd
systemctl daemon-reload

# Enable services to start on boot
systemctl enable military-db-analyzer
systemctl enable rabbitmq-server

# Start the services
/opt/military-db-analyzer/start_services.sh

# Check status
systemctl status military-db-analyzer
systemctl status rabbitmq-server
```

## Step 14: Test the Setup

```bash
# Test Node.js script execution
cd /opt/military-db-analyzer/src/static/js
node S500.js --add --db OP7

# Or using the wrapper script
/opt/military-db-analyzer/run_node_script.sh S500.js --add --db OP7

# Test web interface (check logs)
journalctl -u military-db-analyzer -f

# Test RabbitMQ connectivity
rabbitmqctl status
```

## Step 15: Install and Configure Nginx with SSL

### Install Nginx and SSL Tools

```bash
# Install Nginx and Certbot for SSL
apt install -y nginx certbot python3-certbot-nginx

# Install additional SSL tools
apt install -y openssl
```

### Configure Nginx as Reverse Proxy

Create the Nginx configuration:

```bash
# Remove default Nginx configuration
rm -f /etc/nginx/sites-enabled/default

# Create new configuration for military database analyzer
cat > /etc/nginx/sites-available/military-db-analyzer << 'EOF'
# Upstream configuration for the Python web application
upstream military_db_app {
    server 127.0.0.1:8080 fail_timeout=0;
    # Add more servers here for load balancing if needed
    # server 127.0.0.1:8081 fail_timeout=0;
}

# HTTP server block - redirects to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;  # Replace with your domain
    
    # Redirect all HTTP requests to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;  # Replace with your domain

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS (Optional but recommended)
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Access and error logs
    access_log /var/log/nginx/military-db-analyzer.access.log;
    error_log /var/log/nginx/military-db-analyzer.error.log;

    # Root location - proxy to the Python application
    location / {
        proxy_pass http://military_db_app;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_redirect off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Static files (if your app serves any)
    location /static/ {
        alias /opt/military-db-analyzer/src/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # WebSocket support (if needed)
    location /ws/ {
        proxy_pass http://military_db_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://military_db_app/health;
        access_log off;
    }

    # RabbitMQ Management Interface (optional)
    location /rabbitmq/ {
        proxy_pass http://127.0.0.1:15672/;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Basic authentication for RabbitMQ management
        auth_basic "RabbitMQ Management";
        auth_basic_user_file /etc/nginx/.htpasswd_rabbitmq;
    }

    # Deny access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    location ~ ~$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

# Enable the site
ln -s /etc/nginx/sites-available/military-db-analyzer /etc/nginx/sites-enabled/

# Test Nginx configuration
nginx -t
```

### Create Self-Signed SSL Certificate (for testing)

If you don't have a domain yet, create a self-signed certificate:

```bash
# Create SSL directory
mkdir -p /etc/nginx/ssl

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/military-db-analyzer.key \
    -out /etc/nginx/ssl/military-db-analyzer.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/OU=OrgUnit/CN=military-db-analyzer.local"

# Create temporary Nginx config for self-signed cert
cat > /etc/nginx/sites-available/military-db-analyzer-selfsigned << 'EOF'
upstream military_db_app {
    server 127.0.0.1:8080 fail_timeout=0;
}

server {
    listen 80;
    listen [::]:80;
    server_name _;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name _;

    # Self-signed SSL certificate
    ssl_certificate /etc/nginx/ssl/military-db-analyzer.crt;
    ssl_certificate_key /etc/nginx/ssl/military-db-analyzer.key;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    access_log /var/log/nginx/military-db-analyzer.access.log;
    error_log /var/log/nginx/military-db-analyzer.error.log;

    location / {
        proxy_pass http://military_db_app;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /static/ {
        alias /opt/military-db-analyzer/src/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Use self-signed config initially
rm -f /etc/nginx/sites-enabled/military-db-analyzer
ln -s /etc/nginx/sites-available/military-db-analyzer-selfsigned /etc/nginx/sites-enabled/
```

### Set up Let's Encrypt SSL Certificate (for production)

For production with a real domain:

```bash
# Replace 'your-domain.com' with your actual domain
DOMAIN="your-domain.com"
EMAIL="admin@your-domain.com"

# Stop Nginx temporarily
systemctl stop nginx

# Obtain SSL certificate
certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --no-eff-email

# Switch to the Let's Encrypt configuration
rm -f /etc/nginx/sites-enabled/military-db-analyzer-selfsigned
sed -i "s/your-domain.com/$DOMAIN/g" /etc/nginx/sites-available/military-db-analyzer
ln -s /etc/nginx/sites-available/military-db-analyzer /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Start Nginx
systemctl start nginx

# Set up automatic renewal
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
```

### Create Basic Auth for RabbitMQ Management

```bash
# Install htpasswd utility
apt install -y apache2-utils

# Create password file for RabbitMQ access
htpasswd -c /etc/nginx/.htpasswd_rabbitmq admin
# Enter password when prompted
```

## Step 16: Update Application Configuration

Update the Python application to work behind a proxy:

```bash
# Modify the systemd service to bind to localhost only
cat > /etc/systemd/system/military-db-analyzer.service << 'EOF'
[Unit]
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

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=military-db-analyzer

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
```

## Step 17: Network Configuration and Firewall

Configure firewall rules for the new setup:

```bash
# Install UFW firewall
apt install -y ufw

# Allow SSH (if needed)
ufw allow 22

# Allow HTTP and HTTPS through Nginx
ufw allow 80
ufw allow 443

# Block direct access to application port (only allow from localhost)
ufw deny 8080

# Allow RabbitMQ ports (restrict as needed)
ufw allow from 10.0.0.0/8 to any port 5672
ufw allow from 172.16.0.0/12 to any port 5672
ufw allow from 192.168.0.0/16 to any port 5672

# Enable firewall
ufw --force enable

# Check status
ufw status verbose
```

## Step 18: Enable and Start All Services

```bash
# Reload systemd
systemctl daemon-reload

# Enable services to start on boot
systemctl enable nginx
systemctl enable military-db-analyzer
systemctl enable rabbitmq-server

# Start services in order
systemctl start rabbitmq-server
systemctl start military-db-analyzer
systemctl start nginx

# Check all service status
systemctl status nginx
systemctl status military-db-analyzer
systemctl status rabbitmq-server
```

## Step 19: SSL and Nginx Testing

```bash
# Test Nginx configuration
nginx -t

# Test SSL certificate (if using Let's Encrypt)
certbot certificates

# Test HTTPS connection
curl -k https://localhost/
curl -k https://your-domain.com/  # Replace with your domain

# Check SSL certificate details
openssl s_client -connect localhost:443 -servername localhost < /dev/null

# Test proxy functionality
curl -H "Host: your-domain.com" https://localhost/

# Monitor Nginx logs
tail -f /var/log/nginx/military-db-analyzer.access.log
tail -f /var/log/nginx/military-db-analyzer.error.log
```

## Step 20: Advanced SSL Configuration

### Create SSL Security Configuration

```bash
# Create advanced SSL configuration snippet
cat > /etc/nginx/snippets/ssl-security.conf << 'EOF'
# SSL Configuration for enhanced security
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;

# SSL session settings
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:10m;
ssl_session_tickets off;

# OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;

# Security headers
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; child-src 'self'; form-action 'self'; base-uri 'self';" always;
EOF

# Create proxy configuration snippet
cat > /etc/nginx/snippets/proxy-params.conf << 'EOF'
# Proxy configuration parameters
proxy_set_header Host $http_host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host $server_name;
proxy_set_header X-Forwarded-Port $server_port;
proxy_redirect off;

# Timeouts
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;

# Buffer settings
proxy_buffering on;
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;

# Disable proxy cache
proxy_cache off;
EOF

# Update the main configuration to use snippets
sed -i '/ssl_protocols/,/ssl_prefer_server_ciphers off;/c\    include /etc/nginx/snippets/ssl-security.conf;' /etc/nginx/sites-available/military-db-analyzer
sed -i 's/proxy_set_header Host.*$/include \/etc\/nginx\/snippets\/proxy-params.conf;/' /etc/nginx/sites-available/military-db-analyzer
```

### Create Certificate Renewal Script

```bash
cat > /opt/military-db-analyzer/renew-ssl.sh << 'EOF'
#!/bin/bash

# SSL Certificate renewal script for military-db-analyzer

LOG_FILE="/var/log/ssl-renewal.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting SSL certificate renewal check..." >> $LOG_FILE

# Test Nginx configuration before renewal
if ! nginx -t &>/dev/null; then
    echo "[$DATE] ERROR: Nginx configuration test failed. Skipping renewal." >> $LOG_FILE
    exit 1
fi

# Attempt certificate renewal
if certbot renew --quiet --nginx; then
    echo "[$DATE] Certificate renewal check completed successfully." >> $LOG_FILE
    
    # Test Nginx configuration after renewal
    if nginx -t &>/dev/null; then
        echo "[$DATE] Nginx configuration is valid after renewal." >> $LOG_FILE
        systemctl reload nginx
        echo "[$DATE] Nginx reloaded successfully." >> $LOG_FILE
    else
        echo "[$DATE] ERROR: Nginx configuration test failed after renewal." >> $LOG_FILE
        exit 1
    fi
else
    echo "[$DATE] Certificate renewal failed or no renewal needed." >> $LOG_FILE
fi

echo "[$DATE] SSL renewal process completed." >> $LOG_FILE
EOF

chmod +x /opt/military-db-analyzer/renew-ssl.sh

# Add to crontab for automatic renewal
(crontab -l 2>/dev/null; echo "0 2 * * 0 /opt/military-db-analyzer/renew-ssl.sh") | crontab -
```

## Usage Examples

### Running Node.js Scripts from RabbitMQ Consumer

In your `rabbitmq_consumer.py`, you can now call Node.js scripts like this:

```python
import subprocess
import os

def execute_military_script(script_name, *args):
    """Execute a Node.js script from the military analyzer"""
    cmd = ['node', script_name] + list(args)
    
    # Set working directory to the JS scripts location
    cwd = '/opt/military-db-analyzer/src/static/js'
    
    try:
        result = subprocess.run(cmd, 
                              cwd=cwd,
                              capture_output=True, 
                              text=True,
                              timeout=300)
        return result
    except Exception as e:
        print(f"Error executing {script_name}: {e}")
        return None

# Example usage in RabbitMQ consumer
# execute_military_script('S500.js', '--add', '--db', 'OP7')
```

## Troubleshooting

### Common Issues and Solutions

1. **Service won't start**: Check logs with `journalctl -u military-db-analyzer -f`
2. **Node.js script not found**: Verify paths in `/opt/military-db-analyzer/src/static/js/`
3. **Permission errors**: Run `chown -R root:root /opt/military-db-analyzer`
4. **Port conflicts**: Check with `netstat -tulpn | grep :8080`
5. **RabbitMQ connection issues**: Verify service with `rabbitmqctl status`

### Useful Commands

```bash
# View application logs
journalctl -u military-db-analyzer -f

# Restart services
systemctl restart military-db-analyzer
systemctl restart rabbitmq-server

# Check running processes
ps aux | grep python3
ps aux | grep node

# Test Node.js script access
ls -la /opt/military-db-analyzer/src/static/js/
node /opt/military-db-analyzer/src/static/js/S500.js --help

# Monitor system resources
htop
iotop
```

This setup provides a robust foundation for running your military database analyzer as a web service in an LXC container with proper Node.js script accessibility for RabbitMQ integration.