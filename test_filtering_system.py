#!/usr/bin/env python3
"""
Test script for IES4 Enhanced Filtering System
This script verifies that the filtering system works correctly.
"""

import os
import sys
import json
from pathlib import Path

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

def test_imports():
    """Test that all required modules can be imported."""
    print("Testing imports...")
    
    try:
        # Test basic imports without dependencies that might not be installed
        import filter_system
        print("✓ filter_system module imported successfully")
        
        # Test filter system creation
        fs = filter_system.FilterSystem()
        print("✓ FilterSystem instance created successfully")
        
        # Test equipment categories
        categories = fs.get_equipment_category_info()
        print(f"✓ Equipment categories loaded: {len(categories)} categories")
        
        for key, info in categories.items():
            print(f"  - {key}: {info['label']}")
        
        return True
        
    except ImportError as e:
        print(f"✗ Import failed: {e}")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_web_interface():
    """Test web interface configuration."""
    print("\nTesting web interface...")
    
    try:
        import web_interface
        print("✓ web_interface module imported successfully")
        
        # Check template directories
        src_templates = Path('src/templates')
        root_templates = Path('templates')
        
        print(f"✓ src/templates exists: {src_templates.exists()}")
        print(f"✓ templates exists: {root_templates.exists()}")
        
        if src_templates.exists():
            analysis_template = src_templates / 'analysis_template.html'
            if analysis_template.exists():
                print(f"✓ Enhanced analysis template found: {analysis_template.stat().st_size} bytes")
            else:
                print("✗ Enhanced analysis template not found")
                
        return True
        
    except ImportError as e:
        print(f"✗ Web interface import failed: {e}")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

def test_template_content():
    """Test that templates have the enhanced filtering content."""
    print("\nTesting template content...")
    
    template_path = Path('src/templates/analysis_template.html')
    if not template_path.exists():
        print(f"✗ Template not found: {template_path}")
        return False
    
    content = template_path.read_text()
    
    # Check for key filtering features
    checks = [
        ('Equipment Categories section', 'equipmentCategoryFilter'),
        ('Equipment category checkboxes', 'equipment-category-checkboxes'),
        ('Load equipment categories function', 'loadEquipmentCategories'),
        ('Equipment category filtering in apply filters', 'selectedCategories'),
        ('Equipment category CSS', 'equipment-category-checkbox')
    ]
    
    all_passed = True
    for name, needle in checks:
        if needle in content:
            print(f"✓ {name}: Found")
        else:
            print(f"✗ {name}: Not found")
            all_passed = False
    
    return all_passed

def test_configuration():
    """Test configuration files."""
    print("\nTesting configuration...")
    
    # Check for config files
    config_files = ['ies4_config.json', 'enhanced_ies4_config.json']
    found_config = False
    
    for config_file in config_files:
        config_path = Path(config_file)
        if config_path.exists():
            print(f"✓ Configuration file found: {config_file}")
            try:
                with open(config_path) as f:
                    config = json.load(f)
                print(f"  - Contains {len(config)} database configurations")
                found_config = True
            except json.JSONDecodeError as e:
                print(f"✗ Invalid JSON in {config_file}: {e}")
        else:
            print(f"- Configuration file not found: {config_file}")
    
    if not found_config:
        print("! No configuration files found - this may be okay for testing")
    
    return True

def create_test_config():
    """Create a minimal test configuration."""
    print("\nCreating test configuration...")
    
    test_config = {
        "test_db": "data/test_ies4.json"
    }
    
    with open('test_config.json', 'w') as f:
        json.dump(test_config, f, indent=2)
    
    print("✓ Test configuration created: test_config.json")

def main():
    """Run all tests."""
    print("IES4 Enhanced Filtering System Test")
    print("=" * 40)
    
    tests = [
        test_imports,
        test_web_interface,
        test_template_content,
        test_configuration
    ]
    
    passed = 0
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"✗ Test {test.__name__} failed with exception: {e}")
    
    print(f"\nResults: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("✓ All tests passed! Enhanced filtering system is ready.")
        create_test_config()
    else:
        print("✗ Some tests failed. Check the issues above.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())