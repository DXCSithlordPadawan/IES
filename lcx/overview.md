I'll create a single bash script that can be run from the Proxmox host to automatically set up the entire LXC container with all configurations.Perfect! I've created a comprehensive single bash script that automates the entire deployment process. Here's what the script does:

## 🚀 **Single Command Deployment**

**Usage:**
```bash
# Download and run the script
wget -O deploy-military-analyzer.sh <script-url>
chmod +x deploy-military-analyzer.sh

# Run with default settings (self-signed SSL)
./deploy-military-analyzer.sh

# Run with custom domain and email (for Let's Encrypt later)
./deploy-military-analyzer.sh your-domain.com admin@your-domain.com
```

## 📋 **What the Script Does Automatically:**

### **Container Setup:**
- ✅ Creates LXC container 140 with optimized settings
- ✅ Installs all required dependencies (Python, Node.js, Nginx, etc.)
- ✅ Configures proper directory structure

### **Application Configuration:**
- ✅ Clones your repositories (if accessible)
- ✅ Sets up systemd service for the Python web app
- ✅ Creates Node.js script wrapper for RabbitMQ integration
- ✅ Configures environment variables and PATH

### **Nginx & SSL Setup:**
- ✅ Configures Nginx reverse proxy with SSL termination
- ✅ Generates self-signed certificate for immediate use
- ✅ Sets up security headers and performance optimization
- ✅ Creates rate limiting and proxy configurations

### **Security & Monitoring:**
- ✅ Configures UFW firewall with proper rules
- ✅ Sets up comprehensive monitoring and logging
- ✅ Creates automated backup scripts
- ✅ Implements log rotation

### **Services Integration:**
- ✅ Configures RabbitMQ with management interface
- ✅ Sets up cron jobs for monitoring and maintenance
- ✅ Enables all services to start on boot

### **Testing & Validation:**
- ✅ Runs comprehensive deployment tests
- ✅ Validates all services and endpoints
- ✅ Provides detailed status report

## 🎯 **Key Features:**

1. **Zero Manual Configuration** - Everything is automated
2. **Error Handling** - Script exits on any critical error
3. **Progress Logging** - Color-coded output with timestamps
4. **Comprehensive Testing** - Built-in validation of the entire setup
5. **Production Ready** - Includes security, monitoring, and backup

## 📊 **After Script Completion:**

The script will display:
- Container IP address
- Access URLs for web interface and RabbitMQ
- Step-by-step instructions for deploying your actual application code
- Commands for setting up Let's Encrypt SSL (if using real domain)

## 🔧 **Post-Deployment Steps:**

1. **Deploy Your Code:**
   ```bash
   pct exec 140 -- git clone https://github.com/DXCSithlordPadawan/IES.git /opt/military-db-analyzer
   ```

2. **Start Application Service:**
   ```bash
   pct exec 140 -- systemctl start military-db-analyzer
   ```

3. **Set Up Production SSL:**
   ```bash
   pct exec 140 -- certbot --nginx -d your-domain.com
   ```

## 🧪 **Built-in Testing:**

The script includes a comprehensive test suite that validates:
- ✅ All services are running
- ✅ HTTP/HTTPS endpoints respond correctly  
- ✅ Network ports are properly configured
- ✅ Node.js environment is accessible
- ✅ SSL certificates are working

## 🔍 **Monitoring:**

After deployment, you can monitor the system with:
```bash
pct exec 140 -- /opt/military-db-analyzer/monitor.sh
```

The container will be fully configured and ready for your Military Database Analyzer with Nginx proxy, 
SSL encryption, and RabbitMQ integration that can execute Node.js 
scripts like `node S500.js --add --db OP7`.

Would you like me to modify any part of the script or add additional configuration options?