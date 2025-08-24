"""
Database Loader for IES4 Military Database Analysis Suite
Enhanced with force reload capabilities and file change detection.
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import time
import hashlib

logger = logging.getLogger(__name__)

class DatabaseLoader:
    """Load and manage military database files with caching and force reload support."""
    
    def __init__(self, data_directory: Path):
        """Initialize the database loader."""
        self.data_dir = Path(data_directory)
        self.file_checksums = {}  # Track file checksums to detect changes
        self.file_mod_times = {}  # Track file modification times
        self.last_load_time = None
        
        # Ensure data directory exists
        if not self.data_dir.exists():
            raise FileNotFoundError(f"Data directory not found: {self.data_dir}")
    
    def _calculate_file_checksum(self, file_path: Path) -> str:
        """Calculate MD5 checksum of a file."""
        hash_md5 = hashlib.md5()
        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_md5.update(chunk)
            return hash_md5.hexdigest()
        except Exception as e:
            logger.warning(f"Could not calculate checksum for {file_path}: {e}")
            return ""
    
    def _has_file_changed(self, file_path: Path) -> bool:
        """Check if file has changed since last load."""
        file_str = str(file_path)
        
        # Check modification time first (faster)
        try:
            current_mod_time = file_path.stat().st_mtime
            if file_str in self.file_mod_times:
                if current_mod_time == self.file_mod_times[file_str]:
                    return False  # File hasn't changed
        except Exception:
            pass  # File might not exist, treat as changed
        
        # If mod time changed or we don't have it, check checksum
        current_checksum = self._calculate_file_checksum(file_path)
        if file_str in self.file_checksums:
            if current_checksum == self.file_checksums[file_str]:
                # Update mod time cache even if checksum is same
                try:
                    self.file_mod_times[file_str] = file_path.stat().st_mtime
                except Exception:
                    pass
                return False
        
        # File has changed or is new
        self.file_checksums[file_str] = current_checksum
        try:
            self.file_mod_times[file_str] = file_path.stat().st_mtime
        except Exception:
            pass
        
        return True
    
    def load_database(self, file_path: Path, force_reload: bool = False) -> Dict[str, Any]:
        """
        Load a database from a JSON file.
        
        Args:
            file_path: Path to the database file
            force_reload: If True, bypass all caches and reload from disk
            
        Returns:
            Dictionary containing the database data
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"Database file not found: {file_path}")
        
        # Check if we need to reload
        should_reload = force_reload or self._has_file_changed(file_path)
        
        if should_reload:
            logger.info(f"Loading database from {file_path} (force_reload={force_reload})")
        else:
            logger.debug(f"File {file_path} hasn't changed, using cached version")
        
        try:
            # Always read from disk if force_reload or file changed
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Add metadata about the load
            if '_metadata' not in data:
                data['_metadata'] = {}
            
            # Update metadata
            data['_metadata'].update({
                'file_path': str(file_path),
                'load_timestamp': time.time(),
                'file_size': file_path.stat().st_size,
                'file_mod_time': file_path.stat().st_mtime,
                'force_reloaded': force_reload,
                'entity_counts': self._count_entities(data)
            })
            
            # Update our internal tracking
            self.last_load_time = time.time()
            
            logger.info(f"Successfully loaded database: {len(data.get('vehicles', []))} vehicles, "
                       f"{len(data.get('areas', []))} areas, "
                       f"{len(data.get('organizations', []))} organizations")
            
            return data
            
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in {file_path}: {e}")
            raise ValueError(f"Invalid JSON format in database file: {e}")
        except Exception as e:
            logger.error(f"Error loading database {file_path}: {e}")
            raise
    
    def _count_entities(self, data: Dict[str, Any]) -> Dict[str, int]:
        """Count different types of entities in the database."""
        counts = {}
        
        # Count main entity types
        for entity_type in ['vehicles', 'areas', 'organizations', 'persons', 'weapons', 'events', 'aircraft']:
            if entity_type in data and isinstance(data[entity_type], list):
                counts[entity_type] = len(data[entity_type])
            else:
                counts[entity_type] = 0
        
        # Count type definitions
        for type_def in ['vehicleTypes', 'areaTypes', 'organizationTypes', 'weaponTypes']:
            if type_def in data and isinstance(data[type_def], list):
                counts[type_def] = len(data[type_def])
            else:
                counts[type_def] = 0
        
        return counts
    
    def validate_database_structure(self, data: Dict[str, Any]) -> tuple[bool, list[str]]:
        """
        Validate the structure of a loaded database.
        
        Returns:
            Tuple of (is_valid, list_of_issues)
        """
        issues = []
        
        # Check for required top-level structure
        if not isinstance(data, dict):
            issues.append("Database must be a JSON object")
            return False, issues
        
        # Check for expected arrays
        expected_arrays = ['vehicles', 'areas', 'organizations']
        for array_name in expected_arrays:
            if array_name in data:
                if not isinstance(data[array_name], list):
                    issues.append(f"{array_name} must be an array")
        
        # Validate entity structure
        if 'vehicles' in data:
            for i, vehicle in enumerate(data['vehicles']):
                if not isinstance(vehicle, dict):
                    issues.append(f"Vehicle at index {i} must be an object")
                    continue
                if 'id' not in vehicle:
                    issues.append(f"Vehicle at index {i} missing required 'id' field")
                if 'type' not in vehicle:
                    issues.append(f"Vehicle at index {i} missing required 'type' field")
        
        if 'areas' in data:
            for i, area in enumerate(data['areas']):
                if not isinstance(area, dict):
                    issues.append(f"Area at index {i} must be an object")
                    continue
                if 'id' not in area:
                    issues.append(f"Area at index {i} missing required 'id' field")
                if 'type' not in area:
                    issues.append(f"Area at index {i} missing required 'type' field")
        
        is_valid = len(issues) == 0
        return is_valid, issues
    
    def clear_cache(self):
        """Clear all cached file information to force fresh loads."""
        logger.info("Clearing database loader cache")
        self.file_checksums.clear()
        self.file_mod_times.clear()
        self.last_load_time = None
    
    def get_file_info(self, file_path: Path) -> Dict[str, Any]:
        """Get information about a database file."""
        file_path = Path(file_path)
        
        if not file_path.exists():
            return {
                'exists': False,
                'error': 'File not found'
            }
        
        try:
            stat_info = file_path.stat()
            file_str = str(file_path)
            
            info = {
                'exists': True,
                'file_path': file_str,
                'size': stat_info.st_size,
                'mod_time': stat_info.st_mtime,
                'is_cached': file_str in self.file_checksums,
                'cached_checksum': self.file_checksums.get(file_str),
                'has_changed': self._has_file_changed(file_path)
            }
            
            # Try to get entity counts without fully loading
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                info['entity_counts'] = self._count_entities(data)
                info['valid_json'] = True
            except Exception as e:
                info['entity_counts'] = {}
                info['valid_json'] = False
                info['json_error'] = str(e)
            
            return info
            
        except Exception as e:
            return {
                'exists': True,
                'error': f'Could not read file info: {e}'
            }
    
    def preload_all_databases(self, database_configs: Dict[str, str], force_reload: bool = False) -> Dict[str, Dict[str, Any]]:
        """
        Preload all databases from configuration.
        
        Args:
            database_configs: Dictionary mapping database names to file names
            force_reload: Whether to force reload all databases
            
        Returns:
            Dictionary of loaded databases
        """
        databases = {}
        
        logger.info(f"Preloading {len(database_configs)} databases (force_reload={force_reload})")
        
        for db_name, file_name in database_configs.items():
            try:
                file_path = self.data_dir / file_name
                database = self.load_database(file_path, force_reload=force_reload)
                databases[db_name] = database
                logger.info(f"✓ Preloaded {db_name}")
            except Exception as e:
                logger.warning(f"✗ Failed to preload {db_name}: {e}")
        
        logger.info(f"Successfully preloaded {len(databases)}/{len(database_configs)} databases")
        return databases