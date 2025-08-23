# IES4 Military Database Analysis - Deployment Guide

## Overview
This guide provides comprehensive instructions for deploying the IES4 Military Database Analysis Suite with enhanced filtering capabilities.

## Prerequisites

### System Requirements
- **Operating System**: Linux, macOS, or Windows 10/11
- **Python**: Version 3.8 or higher (3.9+ recommended)
- **Memory**: Minimum 4GB RAM (8GB+ recommended for large datasets)
- **Storage**: 2GB free space for application and sample data
- **Network**: Internet connection for package installation

### Required Dependencies
The following Python packages are required:
- networkx>=3.0
- plotly>=5.15.0
- pandas>=1.5.0
- numpy>=1.21.0
- matplotlib>=3.5.0
- seaborn>=0.11.0
- scipy>=1.9.0
- flask>=2.3.0
- dash>=2.14.0
- jinja2>=3.1.0
- scikit-learn>=1.0.0
- jsonschema>=4.0.0

## Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/DXCSithlordPadawan/IES.git
cd IES
```

### 2. Create Virtual Environment (Recommended)
```bash
# Create virtual environment
python -m venv ies_env

# Activate virtual environment
# On Linux/macOS:
source ies_env/bin/activate
# On Windows:
ies_env\Scripts\activate
```

### 3. Install Dependencies
```bash
# Install all required packages
pip install -r requirements.txt

# If requirements.txt fails, install core packages manually:
pip install networkx plotly pandas numpy matplotlib seaborn scipy flask dash jinja2 scikit-learn jsonschema
```

### 4. Verify Installation
```bash
# Test basic imports
python -c "import networkx, plotly, pandas, flask; print('Core dependencies installed successfully')"
```

## Configuration

### 1. Database Configuration
The system uses IES4 JSON format databases. Configure your database paths in `ies4_config.json`:

```json
{
    "armies": "data/armies_ies4.json",
    "vehicles": "data/vehicles_ies4.json",
    "aircraft": "data/aircraft_ies4.json"
}
```

### 2. Web Server Configuration
Default configuration works for most setups:
- **Host**: 127.0.0.1 (localhost)
- **Port**: 8080
- **Debug Mode**: Enabled for development

To modify, edit the launch parameters in your startup script.

## Deployment

### 1. Development Deployment
For development and testing:

```bash
# Start the web interface
python military_database_analyzer_v3.py --web

# Or with custom parameters
python military_database_analyzer_v3.py --web --host 0.0.0.0 --port 8080
```

### 2. Production Deployment

#### Option A: Using Gunicorn (Recommended for Linux/macOS)
```bash
# Install gunicorn
pip install gunicorn

# Create WSGI app file (app.py)
cat > app.py << 'EOF'
from military_database_analyzer_v3 import MilitaryDatabaseAnalyzer
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

analyzer = MilitaryDatabaseAnalyzer()
from src.web_interface import create_app
app = create_app(analyzer)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
EOF

# Run with gunicorn
gunicorn -w 4 -b 0.0.0.0:8080 app:app
```

#### Option B: Using Waitress (Cross-platform)
```bash
# Install waitress
pip install waitress

# Use the same app.py as above, then run:
waitress-serve --host=0.0.0.0 --port=8080 app:app
```

### 3. Docker Deployment (Optional)
Create a Dockerfile for containerized deployment:

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8080

CMD ["python", "military_database_analyzer_v3.py", "--web", "--host", "0.0.0.0"]
```

Build and run:
```bash
docker build -t ies4-analyzer .
docker run -p 8080:8080 ies4-analyzer
```

## Filter System Activation

### 1. Verify Enhanced Filtering
The enhanced filtering system should be automatically available after deployment. Verify by:

1. Open browser to `http://localhost:8080/analysis`
2. Look for "Equipment Categories" section in the filter panel
3. Confirm 8 categories are available:
   - Aircraft & Unmanned Systems
   - Communication & Electronics Equipment
   - Weapons & Defense Systems
   - Vehicle Categories
   - Naval Assets
   - Transportation
   - Administrative & Geographic data

### 2. Test Filter Functionality
1. Load a database from the dropdown
2. Select one or more equipment categories
3. Apply filters and verify results update
4. Test clear filters functionality
5. Verify export functionality works with filtered data

## Testing

### 1. Basic System Test
```bash
# Test database loading
python -c "
from military_database_analyzer_v3 import MilitaryDatabaseAnalyzer
analyzer = MilitaryDatabaseAnalyzer()
print('Analyzer initialized successfully')
"
```

### 2. Web Interface Test
```bash
# Start web interface
python military_database_analyzer_v3.py --web &

# Test API endpoints
curl http://localhost:8080/api/databases
curl http://localhost:8080/api/equipment_categories
curl http://localhost:8080/api/filter_suggestions

# Stop the web interface
pkill -f "military_database_analyzer_v3.py"
```

### 3. Filter System Test
Access the web interface and:
1. Navigate to Analysis page
2. Select a database
3. Expand Equipment Categories filter
4. Select multiple categories
5. Apply filters
6. Verify filtered results
7. Test export functionality

## Troubleshooting

### Common Issues

#### 1. Import Errors
**Problem**: `ModuleNotFoundError` for required packages
**Solution**: 
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

#### 2. Template Not Found
**Problem**: Template files not found
**Solution**:
```bash
# Ensure templates are in correct location
ls src/templates/
# Should show: analysis_template.html, dashboard_template.html, etc.
```

#### 3. Port Already in Use
**Problem**: `Address already in use: ('127.0.0.1', 8080)`
**Solution**:
```bash
# Find and kill process using port 8080
lsof -ti:8080 | xargs kill -9
# Or use different port
python military_database_analyzer_v3.py --web --port 8081
```

#### 4. Memory Issues with Large Datasets
**Problem**: Out of memory errors
**Solution**:
- Increase available memory
- Use filtering to reduce dataset size
- Process databases individually instead of combined

#### 5. Filter Categories Not Loading
**Problem**: Equipment categories don't appear in UI
**Solution**:
```bash
# Check if API endpoint works
curl http://localhost:8080/api/equipment_categories
# Should return JSON with category information
```

### Log Files
Check application logs for detailed error information:
- Development: Check console output
- Production: Configure logging to files

## Maintenance

### Regular Maintenance Tasks

#### 1. Database Updates
- Update IES4 JSON files as needed
- Restart application to load new data
- Clear browser cache if needed

#### 2. Dependency Updates
```bash
# Update packages periodically
pip list --outdated
pip install --upgrade package_name
```

#### 3. Performance Monitoring
- Monitor memory usage with large datasets
- Check response times for analysis operations
- Monitor disk space usage

#### 4. Backup
- Backup database files regularly
- Export important analysis results
- Keep configuration files in version control

## Security Considerations

### Production Security
1. **Change Secret Key**: Update Flask secret key in production
2. **Firewall**: Configure firewall to limit access
3. **HTTPS**: Use reverse proxy (nginx/Apache) for HTTPS
4. **Access Control**: Implement authentication if needed

### Example Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Performance Optimization

### For Large Datasets
1. **Database Indexing**: Ensure efficient data structure
2. **Memory Management**: Monitor memory usage
3. **Caching**: Implement result caching if needed
4. **Chunked Processing**: Process large datasets in chunks

### Recommended Hardware
- **Small datasets** (<10K nodes): 4GB RAM, 2 CPU cores
- **Medium datasets** (10K-100K nodes): 8GB RAM, 4 CPU cores  
- **Large datasets** (>100K nodes): 16GB+ RAM, 8+ CPU cores

## Support

### Getting Help
1. Check this deployment guide
2. Review error logs
3. Check GitHub issues: https://github.com/DXCSithlordPadawan/IES/issues
4. Create new issue if problem persists

### Useful Commands
```bash
# Check Python version
python --version

# Check installed packages
pip list

# Check Flask app status
curl -I http://localhost:8080

# Test database loading
python -c "from military_database_analyzer_v3 import MilitaryDatabaseAnalyzer; print('OK')"
```

## Changelog

### Version 1.0
- Initial deployment guide
- Enhanced filtering system integration
- Equipment category filtering
- Web interface improvements
- Production deployment options