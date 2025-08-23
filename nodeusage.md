I've combine the two scripts into a single version that can handle both adding and removing the S-400 system based on command-line parameters.
I've combined both scripts into a single comprehensive S-400 management script. 

Here are the key features:

I've successfully extended the script with database parameter support. Here are the key enhancements:

## **New Features:**

### **1. Dynamic Database Selection**
- **Default**: OP7 (Odesa Oblast) when no database is specified
- **Runtime Selection**: Use `--db <DATABASE_CODE>` to target any database
- **Support for**: OP1-OP7 representing different Ukrainian oblasts

### **2. Enhanced Command Line Interface**
```bash
# Add to default database (OP7)
node s400_management.js --add

# Add to specific database
node s400_management.js --add --db OP3

# Remove from specific database  
node s400_management.js --del --db OP1

# List all available databases
node s400_management.js --list
```

### **3. Database Configuration System**
- Pre-configured mappings for OP1-OP7
- Automatic file path resolution
- Display names and descriptions for each region
- File existence validation

### **4. Improved Error Handling**
- Database validation before operations
- File existence checks
- Clear error messages with suggestions
- Graceful fallbacks

### **5. Enhanced Logging**
- Database-specific messaging
- Operation progress tracking
- File structure verification per database
- Backup naming with timestamps

### **6. New `--list` Command**
Shows all available databases with their status:
- Web interface integration when available
- Local file existence checking
- Database descriptions and file paths

### **7. Flexible Parameter Parsing**
- Multiple argument formats supported
- Database codes can be specified with or without `--db`
- Help system with examples

The script now seamlessly handles multiple regional databases while maintaining backward compatibility with the original OP7-focused functionality.