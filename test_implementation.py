#!/usr/bin/env python3
"""
Simple test to verify the enhanced filtering interface is working
"""

import sys
import os

# Configure logging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_web_interface():
    """Test that the static assets and templates are properly configured"""
    try:
        # Test that static directory exists
        static_dir = os.path.join(os.path.dirname(__file__), 'static')
        if not os.path.exists(static_dir):
            logger.error(f"Static directory not found: {static_dir}")
            return False
            
        # Check that required static files exist
        required_files = [
            'static/css/bootstrap.min.css',
            'static/css/fontawesome.min.css', 
            'static/css/custom.css',
            'static/js/bootstrap.bundle.min.js',
            'static/js/plotly.min.js',
            'static/js/filtering.js'
        ]
        
        missing_files = []
        for file_path in required_files:
            full_path = os.path.join(os.path.dirname(__file__), file_path)
            if not os.path.exists(full_path):
                missing_files.append(file_path)
                
        if missing_files:
            logger.error(f"Missing static files: {missing_files}")
            return False
            
        logger.info("✅ All required static files found")
        
        # Test that templates exist and contain local asset references
        template_dir = os.path.join(os.path.dirname(__file__), 'src', 'templates')
        analysis_template = os.path.join(template_dir, 'analysis_template.html')
        
        if not os.path.exists(analysis_template):
            logger.error(f"Analysis template not found: {analysis_template}")
            return False
            
        # Check template content
        with open(analysis_template, 'r') as f:
            content = f.read()
            
        # Verify local asset references
        local_assets = [
            '/static/css/bootstrap.min.css',
            '/static/css/fontawesome.min.css',
            '/static/css/custom.css',
            '/static/js/bootstrap.bundle.min.js',
            '/static/js/filtering.js'
        ]
        
        missing_refs = []
        for asset in local_assets:
            if asset not in content:
                missing_refs.append(asset)
                
        if missing_refs:
            logger.error(f"Missing local asset references in template: {missing_refs}")
            return False
            
        logger.info("✅ All local asset references found in template")
            
        # Check for CDN references (should be minimal)
        cdn_patterns = [
            'cdn.jsdelivr.net',
            'cdnjs.cloudflare.com', 
            'cdn.plot.ly'
        ]
        
        found_cdn = []
        for pattern in cdn_patterns:
            if pattern in content:
                found_cdn.append(pattern)
                
        if found_cdn:
            logger.warning(f"⚠️  Found some CDN references in template: {found_cdn}")
        else:
            logger.info("✅ No CDN references found in template")
            
        # Check for filtering interface elements
        filtering_elements = [
            'equipment-category-checkboxes',
            'applyFilters()',
            'clearFilters()',
            'active-filters'
        ]
        
        missing_elements = []
        for element in filtering_elements:
            if element not in content:
                missing_elements.append(element)
                
        if missing_elements:
            logger.error(f"Missing filtering interface elements: {missing_elements}")
            return False
            
        logger.info("✅ All filtering interface elements present")
        
        # Check file sizes to ensure they're not empty
        file_sizes = {}
        for file_path in required_files:
            full_path = os.path.join(os.path.dirname(__file__), file_path)
            size = os.path.getsize(full_path)
            file_sizes[file_path] = size
            if size < 100:  # Less than 100 bytes is probably too small
                logger.warning(f"⚠️  {file_path} seems very small ({size} bytes)")
                
        logger.info("📁 Static file sizes:")
        for file_path, size in file_sizes.items():
            logger.info(f"   {file_path}: {size:,} bytes")
        
        logger.info("\n🎉 Implementation Test Results:")
        logger.info("✅ Static assets directory structure created")
        logger.info("✅ All required CSS/JS files present")
        logger.info("✅ Templates updated to use local assets")
        logger.info("✅ Filtering interface elements implemented")
        logger.info("✅ Custom CSS for enhanced filtering added")
        
        return True
        
    except Exception as e:
        logger.error(f"Test failed with error: {e}")
        return False

if __name__ == "__main__":
    success = test_web_interface()
    sys.exit(0 if success else 1)