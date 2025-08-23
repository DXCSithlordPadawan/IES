#!/usr/bin/env python3
"""
IES4 Military Database JSON Combiner

This script combines all JSON files from the data subfolder structure
into a single IES4-compliant JSON file based on the provided schema.

Author: Generated for IES4 Military Database Analysis
"""

import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Set
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ies4_combiner.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class IES4JsonCombiner:
    """
    Combines multiple IES4 JSON files into a single compliant document.
    """
    
    def __init__(self, base_directory: str, schema_file: str):
        """
        Initialize the combiner with base directory and schema file.
        
        Args:
            base_directory: Path to the main directory containing data subfolder
            schema_file: Path to the IES4 JSON schema file
        """
        self.base_directory = Path(base_directory)
        self.data_directory = self.base_directory / "data"
        self.schema_file = Path(schema_file)
        
        # IES4 entity types based on schema
        self.entity_types = [
            "countries",
            "areas", 
            "vehicles",
            "vehicleTypes",
            "peopleTypes",
            "people"
        ]
        
        # Track unique IDs to prevent duplicates
        self.used_ids: Set[str] = set()
        
        # Combined data structure
        self.combined_data = {entity_type: [] for entity_type in self.entity_types}
        
        # Statistics
        self.stats = {
            "files_processed": 0,
            "files_failed": 0,
            "entities_combined": {entity_type: 0 for entity_type in self.entity_types},
            "duplicate_ids_found": 0,
            "countries_processed": []
        }
    
    def load_schema(self) -> Dict[str, Any]:
        """Load and return the IES4 JSON schema."""
        try:
            with open(self.schema_file, 'r', encoding='utf-8') as f:
                schema = json.load(f)
                logger.info(f"Loaded schema from {self.schema_file}")
                return schema
        except Exception as e:
            logger.error(f"Failed to load schema from {self.schema_file}: {e}")
            raise
    
    def validate_directory_structure(self) -> bool:
        """Validate that the expected directory structure exists."""
        if not self.base_directory.exists():
            logger.error(f"Base directory does not exist: {self.base_directory}")
            return False
        
        if not self.data_directory.exists():
            logger.error(f"Data directory does not exist: {self.data_directory}")
            return False
        
        # Check for country subfolders
        country_folders = [d for d in self.data_directory.iterdir() if d.is_dir()]
        if not country_folders:
            logger.error(f"No country subfolders found in {self.data_directory}")
            return False
        
        logger.info(f"Found {len(country_folders)} country folders: {[d.name for d in country_folders]}")
        return True
    
    def find_json_files(self) -> List[Path]:
        """Find all JSON files in the data subfolder structure."""
        json_files = []
        
        for country_folder in self.data_directory.iterdir():
            if country_folder.is_dir():
                # Find all .json files recursively in this country folder
                country_json_files = list(country_folder.rglob("*.json"))
                json_files.extend(country_json_files)
                logger.info(f"Found {len(country_json_files)} JSON files in {country_folder.name}")
        
        logger.info(f"Total JSON files found: {len(json_files)}")
        return json_files
    
    def validate_entity_id(self, entity: Dict[str, Any], filename: str) -> bool:
        """
        Validate that entity has unique ID and handle duplicates.
        
        Args:
            entity: The entity dictionary
            filename: Source filename for logging
            
        Returns:
            bool: True if ID is valid and unique, False if duplicate
        """
        if 'id' not in entity:
            logger.warning(f"Entity missing ID in {filename}: {entity}")
            return False
        
        entity_id = entity['id']
        if entity_id in self.used_ids:
            logger.warning(f"Duplicate ID '{entity_id}' found in {filename} - skipping")
            self.stats["duplicate_ids_found"] += 1
            return False
        
        self.used_ids.add(entity_id)
        return True
    
    def merge_entity_characteristics(self, entity: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ensure entity characteristics are properly formatted for IES4 compliance.
        
        Args:
            entity: Entity dictionary
            
        Returns:
            Dict: Entity with properly formatted characteristics
        """
        if 'characteristics' in entity and isinstance(entity['characteristics'], list):
            for char in entity['characteristics']:
                if isinstance(char, dict):
                    # Ensure required fields for characteristics
                    if 'name' in char and 'value' in char:
                        if 'dataType' not in char:
                            # Infer data type if missing
                            char['dataType'] = self.infer_data_type(char['value'])
        
        return entity
    
    def infer_data_type(self, value: Any) -> str:
        """Infer the data type for a characteristic value."""
        if isinstance(value, bool):
            return "boolean"
        elif isinstance(value, int):
            return "number"
        elif isinstance(value, float):
            return "number"
        elif isinstance(value, str):
            # Try to detect if it's a date
            try:
                datetime.fromisoformat(value.replace('Z', '+00:00'))
                return "date"
            except:
                return "string"
        else:
            return "other"
    
    def process_json_file(self, file_path: Path) -> bool:
        """
        Process a single JSON file and merge its entities.
        
        Args:
            file_path: Path to the JSON file
            
        Returns:
            bool: True if successful, False if failed
        """
        try:
            logger.info(f"Processing file: {file_path}")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Extract country name from path for statistics
            country_name = file_path.parent.name
            if country_name not in self.stats["countries_processed"]:
                self.stats["countries_processed"].append(country_name)
            
            # Process each entity type
            entities_added = 0
            for entity_type in self.entity_types:
                if entity_type in data and isinstance(data[entity_type], list):
                    for entity in data[entity_type]:
                        if isinstance(entity, dict):
                            # Validate and process entity
                            if self.validate_entity_id(entity, str(file_path)):
                                # Ensure IES4 compliance
                                processed_entity = self.merge_entity_characteristics(entity)
                                self.combined_data[entity_type].append(processed_entity)
                                self.stats["entities_combined"][entity_type] += 1
                                entities_added += 1
            
            logger.info(f"Successfully processed {file_path} - added {entities_added} entities")
            self.stats["files_processed"] += 1
            return True
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error in {file_path}: {e}")
            self.stats["files_failed"] += 1
            return False
        except Exception as e:
            logger.error(f"Error processing {file_path}: {e}")
            self.stats["files_failed"] += 1
            return False
    
    def create_combined_document(self) -> Dict[str, Any]:
        """Create the final combined IES4-compliant document."""
        # Load schema for metadata
        schema = self.load_schema()
        
        combined_document = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "title": "Combined IES4 Military Database",
            "description": f"Combined military database from multiple countries, processed on {datetime.now().isoformat()}",
            "metadata": {
                "creation_date": datetime.now().isoformat(),
                "source_countries": sorted(self.stats["countries_processed"]),
                "total_files_processed": self.stats["files_processed"],
                "total_entities": sum(self.stats["entities_combined"].values()),
                "entity_counts": self.stats["entities_combined"],
                "duplicate_ids_found": self.stats["duplicate_ids_found"]
            }
        }
        
        # Add all entity collections
        for entity_type in self.entity_types:
            combined_document[entity_type] = self.combined_data[entity_type]
        
        return combined_document
    
    def save_combined_file(self, output_path: str, combined_data: Dict[str, Any]) -> bool:
        """
        Save the combined data to a JSON file.
        
        Args:
            output_path: Path where to save the combined file
            combined_data: The combined data dictionary
            
        Returns:
            bool: True if successful, False if failed
        """
        try:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(combined_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Combined file saved successfully: {output_file}")
            logger.info(f"File size: {output_file.stat().st_size / 1024 / 1024:.2f} MB")
            return True
            
        except Exception as e:
            logger.error(f"Error saving combined file to {output_path}: {e}")
            return False
    
    def print_statistics(self):
        """Print processing statistics."""
        print("\n" + "="*60)
        print("IES4 JSON COMBINER - PROCESSING STATISTICS")
        print("="*60)
        print(f"Files processed successfully: {self.stats['files_processed']}")
        print(f"Files failed: {self.stats['files_failed']}")
        print(f"Countries processed: {', '.join(sorted(self.stats['countries_processed']))}")
        print(f"Duplicate IDs found and skipped: {self.stats['duplicate_ids_found']}")
        print(f"Total unique entities combined: {sum(self.stats['entities_combined'].values())}")
        print("\nEntity breakdown:")
        for entity_type, count in self.stats["entities_combined"].items():
            print(f"  {entity_type}: {count}")
        print("="*60)
    
    def combine_all_files(self, output_path: str = "combined_ies4_military_database.json") -> bool:
        """
        Main method to combine all JSON files.
        
        Args:
            output_path: Path for the output combined file
            
        Returns:
            bool: True if successful, False if failed
        """
        logger.info("Starting IES4 JSON combination process...")
        
        # Validate directory structure
        if not self.validate_directory_structure():
            return False
        
        # Find all JSON files
        json_files = self.find_json_files()
        if not json_files:
            logger.error("No JSON files found to process")
            return False
        
        # Process each file
        for json_file in json_files:
            self.process_json_file(json_file)
        
        # Create combined document
        combined_document = self.create_combined_document()
        
        # Save combined file
        success = self.save_combined_file(output_path, combined_document)
        
        # Print statistics
        self.print_statistics()
        
        if success:
            logger.info("IES4 JSON combination completed successfully!")
        else:
            logger.error("IES4 JSON combination failed!")
        
        return success


def main():
    """Main function to run the combiner."""
    # Configuration
    BASE_DIRECTORY = r"C:\ies4-military-database-analysis"
    SCHEMA_FILE = r"C:\ies4-military-database-analysis\ies4_json_schema.json"
    OUTPUT_FILE = r"C:\ies4-military-database-analysis\combined_ies4_military_database.json"
    
    print("IES4 Military Database JSON Combiner")
    print("====================================")
    print(f"Base directory: {BASE_DIRECTORY}")
    print(f"Schema file: {SCHEMA_FILE}")
    print(f"Output file: {OUTPUT_FILE}")
    print()
    
    try:
        # Create combiner instance
        combiner = IES4JsonCombiner(BASE_DIRECTORY, SCHEMA_FILE)
        
        # Run combination process
        success = combiner.combine_all_files(OUTPUT_FILE)
        
        if success:
            print("\n✅ Combination completed successfully!")
            print(f"📁 Output file: {OUTPUT_FILE}")
            print("📊 Check the log file 'ies4_combiner.log' for detailed information")
        else:
            print("\n❌ Combination failed!")
            print("📊 Check the log file 'ies4_combiner.log' for error details")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️  Process interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
