"""
Graph Builder for IES4 Military Database Analysis Suite
Creates NetworkX graphs from IES4 database entities and relationships.
"""

import networkx as nx
import logging
from typing import Dict, List, Set, Tuple, Optional, Any
from collections import defaultdict
import re

logger = logging.getLogger(__name__)

class GraphBuilder:
    """Builds NetworkX graphs from IES4 database entities."""
    
    def __init__(self):
        """Initialize the graph builder."""
        self.entity_types = [
            'countries', 'vehicles', 'vehicleTypes', 'people', 'peopleTypes',
            'areas', 'militaryOrganizations', 'representations'
        ]
        
        # Define relationship patterns
        self.relationship_patterns = {
            'ownership': ['owner', 'owned_by'],
            'location': ['country', 'location', 'headquarters', 'parentArea', 'childAreas'],
            'classification': ['vehicleType', 'personTypes', 'organizationType'],
            'manufacturing': ['make', 'manufacturer'],
            'temporal': ['temporalParts', 'states'],
            'naming': ['names', 'identifiers'],
            'representation': ['representations']
        }
        
        # Node colors for different entity types
        self.node_colors = {
            'country': '#FF6B6B',           # Red
            'vehicle': '#4ECDC4',           # Teal
            'person': '#45B7D1',            # Blue
            'area': '#96CEB4',              # Green
            'militaryOrganization': '#FECA57',  # Yellow
            'vehicleType': '#A8E6CF',       # Light Green
            'peopleType': '#DDA0DD',        # Plum
            'representation': '#F8B500'     # Orange
        }
    
    def build_graph(self, database: Dict, include_metadata: bool = True) -> nx.Graph:
        """Build a NetworkX graph from a database."""
        logger.info("Building graph from database")
        
        graph = nx.Graph()
        
        # Track entities for relationship building
        entity_map = {}
        
        # Add nodes for each entity type
        for entity_type in self.entity_types:
            if entity_type in database:
                entities = database[entity_type]
                logger.debug(f"Adding {len(entities)} {entity_type} nodes")
                
                for entity in entities:
                    node_id = entity.get('id')
                    if not node_id:
                        continue
                    
                    # Store entity for relationship mapping
                    entity_map[node_id] = {
                        'type': entity_type,
                        'data': entity
                    }
                    
                    # Add node with attributes
                    self._add_node(graph, node_id, entity, entity_type, include_metadata)
        
        # Add edges based on relationships
        self._add_relationships(graph, entity_map)
        
        # Add graph-level metadata
        if include_metadata:
            self._add_graph_metadata(graph, database)
        
        logger.info(f"Built graph with {len(graph.nodes)} nodes and {len(graph.edges)} edges")
        return graph
    
    def _add_node(self, graph: nx.Graph, node_id: str, entity: Dict, entity_type: str, include_metadata: bool):
        """Add a node to the graph with appropriate attributes."""
        # Basic attributes
        attributes = {
            'type': entity_type,
            'label': self._extract_primary_name(entity),
            'color': self.node_colors.get(entity_type, '#808080')
        }
        
        # Add key entity information
        if include_metadata:
            attributes['data'] = entity
        
        # Add searchable attributes
        attributes.update(self._extract_searchable_attributes(entity, entity_type))
        
        graph.add_node(node_id, **attributes)
    
    def _extract_primary_name(self, entity: Dict) -> str:
        """Extract the primary name from an entity."""
        # Use preprocessed name if available
        if '_primary_name' in entity:
            return entity['_primary_name']
        
        # Try different name sources
        if 'names' in entity and entity['names']:
            for name_obj in entity['names']:
                if isinstance(name_obj, dict) and name_obj.get('nameType') == 'official':
                    return name_obj.get('value', '')
            # Fall back to first name
            first_name = entity['names'][0]
            if isinstance(first_name, dict):
                return first_name.get('value', '')
            return str(first_name)
        
        for field in ['name', 'title', 'value']:
            if field in entity:
                return str(entity[field])
        
        return entity.get('id', 'Unknown')
    
    def _extract_searchable_attributes(self, entity: Dict, entity_type: str) -> Dict:
        """Extract attributes that can be used for searching and filtering."""
        attributes = {}
        
        # Common attributes
        if 'year' in entity:
            attributes['year'] = entity['year']
        if 'make' in entity:
            attributes['manufacturer'] = entity['make']
        if 'model' in entity:
            attributes['model'] = entity['model']
        if 'owner' in entity:
            attributes['owner'] = entity['owner']
        if 'country' in entity:
            attributes['country'] = entity['country']
        if 'nationality' in entity:
            attributes['nationality'] = entity['nationality']
        
        # Type-specific attributes
        if entity_type == 'vehicle':
            if 'vehicleType' in entity:
                attributes['vehicle_type'] = entity['vehicleType']
            if 'fuelType' in entity:
                attributes['fuel_type'] = entity['fuelType']
        
        elif entity_type == 'person':
            if 'personTypes' in entity:
                attributes['person_types'] = entity['personTypes']
            if 'birthDate' in entity:
                attributes['birth_date'] = entity['birthDate']
        
        elif entity_type == 'militaryOrganization':
            if 'organizationType' in entity:
                attributes['organization_type'] = entity['organizationType']
            if 'personnelStrength' in entity:
                attributes['personnel_strength'] = entity['personnelStrength']
        
        elif entity_type == 'area':
            if 'areaType' in entity:
                attributes['area_type'] = entity['areaType']
            if 'administrativeLevel' in entity:
                attributes['admin_level'] = entity['administrativeLevel']
        
        return attributes
    
    def _add_relationships(self, graph: nx.Graph, entity_map: Dict):
        """Add edges based on entity relationships."""
        logger.debug("Adding relationships to graph")
        
        edge_count = 0
        
        for entity_id, entity_info in entity_map.items():
            entity = entity_info['data']
            
            # Direct reference relationships
            for field, target_id in self._extract_direct_references(entity):
                if target_id in entity_map:
                    self._add_edge(graph, entity_id, target_id, field)
                    edge_count += 1
            
            # List-based relationships
            for field, target_ids in self._extract_list_references(entity):
                for target_id in target_ids:
                    if target_id in entity_map:
                        self._add_edge(graph, entity_id, target_id, field)
                        edge_count += 1
            
            # Hierarchical relationships
            for field, target_ids in self._extract_hierarchical_references(entity):
                for target_id in target_ids:
                    if target_id in entity_map:
                        self._add_edge(graph, entity_id, target_id, field)
                        edge_count += 1
        
        logger.debug(f"Added {edge_count} edges")
    
    def _extract_direct_references(self, entity: Dict) -> List[Tuple[str, str]]:
        """Extract direct references to other entities."""
        references = []
        
        # Standard reference fields
        ref_fields = ['owner', 'country', 'vehicleType', 'parentArea', 'headquarters', 'nationality']
        
        for field in ref_fields:
            if field in entity and entity[field]:
                references.append((field, str(entity[field])))
        
        return references
    
    def _extract_list_references(self, entity: Dict) -> List[Tuple[str, List[str]]]:
        """Extract references from list fields."""
        references = []
        
        # List reference fields
        list_fields = ['personTypes', 'childAreas']
        
        for field in list_fields:
            if field in entity and isinstance(entity[field], list):
                target_ids = [str(item) for item in entity[field] if item]
                if target_ids:
                    references.append((field, target_ids))
        
        return references
    
    def _extract_hierarchical_references(self, entity: Dict) -> List[Tuple[str, List[str]]]:
        """Extract references from hierarchical structures."""
        references = []
        
        # Check temporal parts
        if 'temporalParts' in entity:
            for temp_part in entity['temporalParts']:
                if 'location' in temp_part:
                    references.append(('temporal_location', [str(temp_part['location'])]))
        
        # Check states
        if 'states' in entity:
            for state in entity['states']:
                if 'location' in state:
                    references.append(('state_location', [str(state['location'])]))
                if 'organisation' in state:
                    references.append(('state_organization', [str(state['organisation'])]))
        
        return references
    
    def _add_edge(self, graph: nx.Graph, source: str, target: str, relationship_type: str):
        """Add an edge with relationship metadata."""
        if source != target:  # Avoid self-loops
            graph.add_edge(source, target, 
                          relationship=relationship_type,
                          weight=1.0)
    
    def _add_graph_metadata(self, graph: nx.Graph, database: Dict):
        """Add metadata to the graph."""
        metadata = database.get('_metadata', {})
        
        graph.graph['database_info'] = {
            'filename': metadata.get('filename', 'unknown'),
            'loaded_at': metadata.get('loaded_at', ''),
            'entity_counts': metadata.get('entity_counts', {}),
            'title': database.get('title', ''),
            'description': database.get('description', '')
        }
    
    def combine_databases(self, databases: Dict[str, Dict]) -> Dict:
        """Combine multiple databases into a single dataset."""
        logger.info(f"Combining {len(databases)} databases")
        
        combined = {entity_type: [] for entity_type in self.entity_types}
        combined['_metadata'] = {
            'combined_from': list(databases.keys()),
            'entity_counts': defaultdict(int)
        }
        
        # Track entity IDs to avoid duplicates
        seen_ids = {entity_type: set() for entity_type in self.entity_types}
        
        for db_name, database in databases.items():
            logger.debug(f"Processing database: {db_name}")
            
            for entity_type in self.entity_types:
                if entity_type in database:
                    for entity in database[entity_type]:
                        entity_id = entity.get('id')
                        if entity_id and entity_id not in seen_ids[entity_type]:
                            # Add source database info
                            entity_copy = entity.copy()
                            entity_copy['_source_database'] = db_name
                            
                            combined[entity_type].append(entity_copy)
                            seen_ids[entity_type].add(entity_id)
                            combined['_metadata']['entity_counts'][entity_type] += 1
        
        # Log combination results
        for entity_type, count in combined['_metadata']['entity_counts'].items():
            if count > 0:
                logger.debug(f"Combined {entity_type}: {count}")
        
        return combined
    
    def create_subgraph(self, graph: nx.Graph, entity_ids: List[str], 
                       include_neighbors: bool = False, max_distance: int = 1) -> nx.Graph:
        """Create a subgraph containing specified entities and optionally their neighbors."""
        if include_neighbors:
            # Find all nodes within max_distance
            nodes_to_include = set(entity_ids)
            
            for entity_id in entity_ids:
                if entity_id in graph:
                    # Get neighbors within max_distance
                    neighbors = nx.single_source_shortest_path_length(
                        graph, entity_id, cutoff=max_distance
                    )
                    nodes_to_include.update(neighbors.keys())
            
            subgraph = graph.subgraph(nodes_to_include).copy()
        else:
            # Only include specified entities
            valid_ids = [eid for eid in entity_ids if eid in graph]
            subgraph = graph.subgraph(valid_ids).copy()
        
        logger.info(f"Created subgraph with {len(subgraph.nodes)} nodes and {len(subgraph.edges)} edges")
        return subgraph
    
    def find_paths(self, graph: nx.Graph, source: str, target: str, 
                   max_paths: int = 5, max_length: int = 6) -> List[List[str]]:
        """Find paths between two entities."""
        if source not in graph or target not in graph:
            return []
        
        try:
            # Find shortest paths
            paths = list(nx.all_shortest_paths(graph, source, target))
            
            if len(paths) < max_paths:
                # Find additional simple paths
                try:
                    all_paths = nx.all_simple_paths(graph, source, target, cutoff=max_length)
                    additional_paths = []
                    
                    for path in all_paths:
                        if len(additional_paths) + len(paths) >= max_paths:
                            break
                        if path not in paths:
                            additional_paths.append(path)
                    
                    paths.extend(additional_paths)
                except nx.NetworkXNoPath:
                    pass
            
            return paths[:max_paths]
            
        except nx.NetworkXNoPath:
            return []
    
    def analyze_connectivity(self, graph: nx.Graph) -> Dict:
        """Analyze the connectivity properties of the graph."""
        analysis = {
            'node_count': len(graph.nodes),
            'edge_count': len(graph.edges),
            'density': nx.density(graph),
            'is_connected': nx.is_connected(graph),
            'clustering_coefficient': nx.average_clustering(graph)
        }
        
        # Component analysis
        components = list(nx.connected_components(graph))
        analysis['connected_components'] = len(components)
        analysis['largest_component_size'] = len(max(components, key=len)) if components else 0
        
        # Centrality measures for top nodes
        if len(graph.nodes) > 0:
            degree_centrality = nx.degree_centrality(graph)
            betweenness_centrality = nx.betweenness_centrality(graph, k=min(100, len(graph.nodes)))
            
            # Top nodes by centrality
            top_degree = sorted(degree_centrality.items(), key=lambda x: x[1], reverse=True)[:10]
            top_betweenness = sorted(betweenness_centrality.items(), key=lambda x: x[1], reverse=True)[:10]
            
            analysis['top_degree_centrality'] = top_degree
            analysis['top_betweenness_centrality'] = top_betweenness
        
        return analysis