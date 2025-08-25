Perfect! I've optimized the script with comprehensive network configuration options. Here are the key enhancements:

## 🚀 **Enhanced Network Configuration Options**

### **Command-Line Interface**
```bash
# DHCP Configuration (default)
./deploy-military-analyzer.sh --dhcp --domain example.com --email admin@example.com

# Static IP Configuration  
./deploy-military-analyzer.sh --ip 192.168.1.100/24 --gateway 192.168.1.1 --dns 8.8.8.8,8.8.4.4

# Advanced Configuration
./deploy-military-analyzer.sh \
    --ct-id 150 \
    --hostname my-analyzer \
    --memory 4096 \
    --cores 4 \
    --disk 40 \
    --storage local-ssd \
    --ip 10.0.1.50/24 \
    --gateway 10.0.1.1 \
    --dns 1.1.1.1,8.8.8.8 \
    --bridge vmbr1 \
    --domain secure.military-db.com \
    --email security@company.com
```

## 🔧 **Key Features Added**

### **Network Options:**
- **`--dhcp`** - Use DHCP (default behavior)
- **`--ip <ip/cidr>`** - Static IP with CIDR notation
- **`--gateway <ip>`** - Gateway IP address
- **`--dns <servers>`** - Custom DNS servers (comma-separated)
- **`--bridge <name>`** - Network bridge selection

### **Container Options:**
- **`--ct-id <id>`** - Custom container ID
- **`--hostname <name>`** - Custom hostname
- **`--memory <mb>`** - Memory allocation
- **`--cores <num>`** - CPU cores
- **`--disk <gb>`** - Disk size
- **`--storage <name>`** - Storage location

### **Application Options:**
- **`--domain <domain>`** - Domain name for SSL
- **`--email <email>`** - Email for certificates

## 🛡️ **Enhanced Validation**

### **Pre-deployment Checks:**
- ✅ Proxmox environment validation
- ✅ Template availability check
- ✅ Storage existence verification
- ✅ Network bridge validation
- ✅ IP address format validation
- ✅ Gateway network compatibility check

### **Network Validation:**
- ✅ IP/CIDR format validation
- ✅ Gateway IP format validation  
- ✅ DNS server format validation
- ✅ Network connectivity testing
- ✅ DNS resolution testing

## 📊 **Enhanced Reporting**

### **Configuration Summary:**
- Displays all settings before deployment
- Requires confirmation to proceed
- Shows network configuration details
- Provides comprehensive status reporting

### **Network Information:**
- Automatically detects container IP
- Shows gateway configuration
- Validates network connectivity
- Provides troubleshooting commands

## 🔍 **Usage Examples**

### **Basic DHCP Setup:**
```bash
./deploy-military-analyzer.sh --dhcp --domain mycompany.local
```

### **Corporate Static IP:**
```bash
./deploy-military-analyzer.sh \
    --ip 172.16.10.100/24 \
    --gateway 172.16.10.1 \
    --dns 172.16.1.10,172.16.1.11 \
    --domain analyzer.corp.local \
    --email it@corp.local
```

### **High-Performance Setup:**
```bash
./deploy-military-analyzer.sh \
    --memory 8192 \
    --cores 8 \
    --disk 100 \
    --storage fast-ssd \
    --ip 10.0.0.50/24 \
    --gateway 10.0.0.1
```

### **Custom Container ID:**
```bash
./deploy-military-analyzer.sh \
    --ct-id 200 \
    --hostname db-analyzer-prod \
    --ip 192.168.100.50/24
```

## 📝 **Post-Deployment Features**

### **Comprehensive Summary:**
- Network configuration details
- Access URLs and commands
- Management commands
- Troubleshooting guides
- Configuration file locations

### **Deployment Summary File:**
- Saves configuration to `/tmp/military-db-analyzer-[CT_ID]-deployment.txt`
- Includes all settings and access information
- Provides reference for future management

## 🧪 **Enhanced Testing:**

The script includes:
- Network connectivity validation
- DNS resolution testing
- Service status verification
- Endpoint accessibility testing
- Comprehensive deployment validation

## 🎯 **Troubleshooting Support**

The enhanced script provides:
- **Network diagnostics** - IP, routing, DNS checks
- **Service monitoring** - Status and log access commands
- **Configuration validation** - File location references
- **Management commands** - Container control and monitoring

This optimized script now supports both simple DHCP deployments and complex enterprise network 
configurations with static IPs, custom DNS, and specific gateway requirements, making it 
suitable for any environment from home labs to production data centers.