#!/usr/bin/env python3
"""
Simple dependency-free test for template and configuration files.
This ensures the enhanced filtering system is properly integrated.
"""

import json
from pathlib import Path

def check_templates():
    """Check that enhanced templates are in place."""
    print("Checking template files...")
    
    # Check src/templates directory
    src_templates = Path('src/templates')
    root_templates = Path('templates')
    
    if not src_templates.exists():
        print("✗ src/templates directory missing")
        return False
    
    if not root_templates.exists():
        print("✗ templates directory missing")
        return False
    
    # Check for enhanced analysis template
    src_analysis = src_templates / 'analysis_template.html'
    root_analysis = root_templates / 'analysis_template.html'
    
    if not src_analysis.exists():
        print("✗ Enhanced analysis template missing from src/templates")
        return False
    
    if not root_analysis.exists():
        print("✗ Analysis template missing from templates")
        return False
    
    # Check sizes to see if they match
    src_size = src_analysis.stat().st_size
    root_size = root_analysis.stat().st_size
    
    print(f"✓ src/templates/analysis_template.html: {src_size} bytes")
    print(f"✓ templates/analysis_template.html: {root_size} bytes")
    
    if src_size == root_size:
        print("✓ Template files are synchronized")
    else:
        print("! Template files have different sizes - may need sync")
    
    # Check for equipment category content
    content = src_analysis.read_text()
    if 'equipmentCategoryFilter' in content:
        print("✓ Equipment category filtering UI found in template")
    else:
        print("✗ Equipment category filtering UI missing from template")
        return False
    
    return True

def check_filter_system():
    """Check filter system files without importing dependencies."""
    print("\nChecking filter system files...")
    
    filter_system_path = Path('src/filter_system.py')
    if not filter_system_path.exists():
        print("✗ Filter system file missing")
        return False
    
    content = filter_system_path.read_text()
    
    # Check for key features
    features = [
        ('Equipment category filter method', '_filter_by_equipment_category'),
        ('Equipment categories definition', 'equipment_categories'),
        ('Category info method', 'get_equipment_category_info'),
        ('Aircraft unmanned category', 'aircraft_unmanned'),
        ('Communication electronics category', 'communication_electronics'),
        ('Weapons defense category', 'weapons_defense'),
        ('Vehicles category', 'vehicles'),
        ('Naval assets category', 'naval_assets')
    ]
    
    all_found = True
    for name, needle in features:
        if needle in content:
            print(f"✓ {name}: Found")
        else:
            print(f"✗ {name}: Missing")
            all_found = False
    
    return all_found

def check_web_interface():
    """Check web interface files without importing dependencies."""
    print("\nChecking web interface files...")
    
    web_interface_path = Path('src/web_interface.py')
    if not web_interface_path.exists():
        print("✗ Web interface file missing")
        return False
    
    content = web_interface_path.read_text()
    
    # Check for equipment categories API
    if '/api/equipment_categories' in content:
        print("✓ Equipment categories API endpoint found")
    else:
        print("✗ Equipment categories API endpoint missing")
        return False
    
    if 'get_equipment_categories' in content:
        print("✓ Equipment categories handler function found")
    else:
        print("✗ Equipment categories handler function missing")
        return False
    
    # Check template folder configuration
    if "template_folder='src/templates'" in content:
        print("✓ Template folder configured to use enhanced templates")
    elif "template_folder='templates'" in content:
        print("! Template folder configured to use root templates (should work if synced)")
    else:
        print("✗ Template folder configuration not found")
        return False
    
    return True

def check_documentation():
    """Check if documentation files exist."""
    print("\nChecking documentation...")
    
    docs = [
        ('Enhanced filtering documentation', 'ENHANCED_FILTERING.md'),
        ('Deployment guide', 'DEPLOYMENT.md'),
        ('README', 'README.md')
    ]
    
    for name, filename in docs:
        if Path(filename).exists():
            print(f"✓ {name}: Found ({filename})")
        else:
            print(f"✗ {name}: Missing ({filename})")

def check_configuration():
    """Check configuration files."""
    print("\nChecking configuration files...")
    
    config_files = ['ies4_config.json', 'enhanced_ies4_config.json']
    
    for config_file in config_files:
        config_path = Path(config_file)
        if config_path.exists():
            try:
                with open(config_path) as f:
                    config = json.load(f)
                print(f"✓ {config_file}: Valid JSON with {len(config)} entries")
            except json.JSONDecodeError as e:
                print(f"✗ {config_file}: Invalid JSON - {e}")
        else:
            print(f"- {config_file}: Not found")

def main():
    """Run all checks."""
    print("IES4 Enhanced Filtering System - File Check")
    print("=" * 50)
    
    checks = [
        check_templates,
        check_filter_system,
        check_web_interface,
        check_documentation,
        check_configuration
    ]
    
    all_passed = True
    for check in checks:
        try:
            if not check():
                all_passed = False
        except Exception as e:
            print(f"✗ Check {check.__name__} failed: {e}")
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("✓ All file checks passed! Enhanced filtering system files are properly integrated.")
        print("\nNext steps:")
        print("1. Install dependencies: pip install -r requirements.txt")
        print("2. Run web interface: python military_database_analyzer_v3.py --web")
        print("3. Open browser to: http://localhost:8080/analysis")
        print("4. Test equipment category filtering")
    else:
        print("✗ Some file checks failed. Review the issues above.")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())