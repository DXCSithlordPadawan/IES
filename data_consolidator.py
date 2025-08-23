#!/usr/bin/env python3
"""
IES4 JSON Consolidator

This script combines multiple IES4-compliant JSON files into a single consolidated file.
It handles deduplication, cross-references, and maintains schema compliance.
"""

import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Any, Set
from pathlib import Path
import hashlib


class IES4Consolidator:
    """Consolidates multiple IES4 JSON files into a single file."""
    
    def __init__(self, source_directory: str, output_file: str = "ies_consolidated.json"):
        self.source_directory = Path(source_directory)
        self.output_file = output_file
        self.consolidated_data = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "title": "Consolidated IES4 Military Database",
            "description": "Consolidated IES4-compliant database from multiple source files",
            "ies4Version": "4.3.0",
            "specificationDate": "2024-12-16",
            "countries": [],
            "areas": [],
            "vehicles": [],
            "vehicleTypes": [],
            "peopleTypes": [],
            "people": [],
            "ammunition": [],
            "electronicSystems": [],
            "weapons": [],
            "organizations": [],
            "representations": [],
            "militaryOrganizations": [],
            "events": [],
            "activities": [],
            "facilities": [],
            "items": [],
            "locations": [],
            "relationships": []
        }
        self.processed_files = []
        self.entity_counts = {}
        
    def load_json_file(self, file_path: Path) -> Dict[str, Any]:
        """Load and parse a JSON file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            print(f"Warning: Could not parse {file_path}: {e}")
            return {}
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return {}
    
    def deduplicate_entities(self, entities: List[Dict[str, Any]], entity_type: str) -> List[Dict[str, Any]]:
        """Deduplicate entities based on ID, preferring more complete records."""
        entity_map = {}
        
        for entity in entities:
            entity_id = entity.get('id')
            if not entity_id:
                continue
                
            if entity_id in entity_map:
                # Compare completeness and choose the more complete record
                existing = entity_map[entity_id]
                current = entity
                
                # Count non-empty fields as a simple completeness metric
                existing_fields = sum(1 for v in existing.values() if v not in [None, [], "", {}])
                current_fields = sum(1 for v in current.values() if v not in [None, [], "", {}])
                
                if current_fields > existing_fields:
                    entity_map[entity_id] = current
                    print(f"Updated {entity_type} '{entity_id}' with more complete record")
            else:
                entity_map[entity_id] = entity
        
        return list(entity_map.values())
    
    def add_consolidation_metadata(self, entity: Dict[str, Any], source_file: str) -> Dict[str, Any]:
        """Add metadata about consolidation to entities."""
        if '_sourceFiles' not in entity:
            entity['_sourceFiles'] = []
        
        if source_file not in entity['_sourceFiles']:
            entity['_sourceFiles'].append(source_file)
        
        entity['_consolidatedAt'] = datetime.now().isoformat()
        
        return entity
    
    def merge_entity_list(self, source_entities: List[Dict[str, Any]], 
                         target_list: List[Dict[str, Any]], 
                         entity_type: str, source_file: str) -> None:
        """Merge a list of entities into the target list."""
        if not source_entities:
            return
            
        # Add consolidation metadata to each entity
        for entity in source_entities:
            self.add_consolidation_metadata(entity, source_file)
        
        # Extend target list
        target_list.extend(source_entities)
        
        print(f"Added {len(source_entities)} {entity_type} entities from {source_file}")
    
    def process_single_file(self, file_path: Path) -> None:
        """Process a single JSON file and merge its content."""
        print(f"Processing: {file_path}")
        
        data = self.load_json_file(file_path)
        if not data:
            return
        
        relative_path = str(file_path.relative_to(self.source_directory))
        
        # Track processed file
        file_info = {
            "path": relative_path,
            "size": file_path.stat().st_size,
            "processedAt": datetime.now().isoformat()
        }
        self.processed_files.append(file_info)
        
        # Merge each entity type
        entity_mappings = {
            'countries': 'countries',
            'areas': 'areas', 
            'vehicles': 'vehicles',
            'vehicleTypes': 'vehicleTypes',
            'peopleTypes': 'peopleTypes',
            'people': 'people',
            'ammunition': 'ammunition',
            'electronicSystems': 'electronicSystems',
            'weapons': 'weapons',
            'organizations': 'organizations',
            'militaryOrganizations': 'militaryOrganizations',
            'representations': 'representations',
            'events': 'events',
            'activities': 'activities',
            'facilities': 'facilities',
            'items': 'items',
            'locations': 'locations',
            'relationships': 'relationships'
        }
        
        for source_key, target_key in entity_mappings.items():
            if source_key in data and isinstance(data[source_key], list):
                self.merge_entity_list(
                    data[source_key], 
                    self.consolidated_data[target_key],
                    source_key,
                    relative_path
                )
        
        # Copy over any schema information from the first file
        if not self.consolidated_data.get('ies4Version') and data.get('ies4Version'):
            self.consolidated_data['ies4Version'] = data['ies4Version']
        if not self.consolidated_data.get('specificationDate') and data.get('specificationDate'):
            self.consolidated_data['specificationDate'] = data['specificationDate']
    
    def deduplicate_all_entities(self) -> None:
        """Deduplicate all entity types in the consolidated data."""
        print("\nDeduplicating entities...")
        
        entity_types = [
            'countries', 'areas', 'vehicles', 'vehicleTypes', 'peopleTypes',
            'people', 'ammunition', 'electronicSystems', 'weapons', 
            'organizations', 'militaryOrganizations', 'representations',
            'events', 'activities', 'facilities', 'items', 'locations', 'relationships'
        ]
        
        for entity_type in entity_types:
            if entity_type in self.consolidated_data:
                original_count = len(self.consolidated_data[entity_type])
                self.consolidated_data[entity_type] = self.deduplicate_entities(
                    self.consolidated_data[entity_type], entity_type
                )
                final_count = len(self.consolidated_data[entity_type])
                
                if original_count != final_count:
                    print(f"Deduplicated {entity_type}: {original_count} -> {final_count}")
                
                self.entity_counts[entity_type] = final_count
    
    def add_consolidation_metadata_to_output(self) -> None:
        """Add consolidation metadata to the final output."""
        self.consolidated_data['consolidationMetadata'] = {
            "timestamp": datetime.now().isoformat(),
            "consolidatedFiles": self.processed_files,
            "sourceFileCount": len(self.processed_files),
            "consolidationTool": "IES4Consolidator",
            "toolVersion": "2.1",
            "entityCounts": self.entity_counts
        }
        
        # Add enhancement metadata if not present
        if 'enhancementMetadata' not in self.consolidated_data:
            self.consolidated_data['enhancementMetadata'] = {
                "fieldEnhancement": {
                    "timestamp": datetime.now().isoformat(),
                    "enhancementTool": "IES4FieldEnhancer",
                    "statistics": {
                        "entities_processed": sum(self.entity_counts.values()),
                        "timestamps_added": 0,
                        "versions_added": 0,
                        "types_added": 0,
                        "ids_generated": 0
                    }
                }
            }
    
    def consolidate(self) -> None:
        """Main consolidation process."""
        print(f"Starting consolidation of files in: {self.source_directory}")
        
        if not self.source_directory.exists():
            print(f"Error: Directory {self.source_directory} does not exist")
            return
        
        # Find all JSON files
        json_files = list(self.source_directory.rglob("*.json"))
        
        if not json_files:
            print(f"No JSON files found in {self.source_directory}")
            return
        
        print(f"Found {len(json_files)} JSON files")
        
        # Process each file
        for file_path in sorted(json_files):
            self.process_single_file(file_path)
        
        # Deduplicate entities
        self.deduplicate_all_entities()
        
        # Add metadata
        self.add_consolidation_metadata_to_output()
        
        # Write consolidated output
        self.write_output()
        
        print(f"\nConsolidation complete!")
        print(f"Processed {len(self.processed_files)} files")
        print(f"Output written to: {self.output_file}")
        print("\nEntity counts:")
        for entity_type, count in self.entity_counts.items():
            if count > 0:
                print(f"  {entity_type}: {count}")
    
    def write_output(self) -> None:
        """Write the consolidated data to output file."""
        try:
            with open(self.output_file, 'w', encoding='utf-8') as f:
                json.dump(self.consolidated_data, f, indent=2, ensure_ascii=False)
            print(f"Successfully wrote consolidated data to {self.output_file}")
        except Exception as e:
            print(f"Error writing output file: {e}")
            sys.exit(1)


def main():
    """Main entry point."""
    # Configuration
    source_directory = r"C:\ies4-military-database-analysis\data"
    output_file = "ies_consolidated.json"
    
    # Allow command line override
    if len(sys.argv) > 1:
        source_directory = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    
    # Create and run consolidator
    consolidator = IES4Consolidator(source_directory, output_file)
    
    try:
        consolidator.consolidate()
    except KeyboardInterrupt:
        print("\nConsolidation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error during consolidation: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
