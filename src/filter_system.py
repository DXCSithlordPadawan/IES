"""
Filter System for IES4 Military Database Analysis Suite
Handles filtering and searching of graph data based on various criteria.
"""

import networkx as nx
import logging
from typing import Dict, List, Set, Any, Optional, Union
from datetime import datetime
import re
from collections import defaultdict

logger = logging.getLogger(__name__)

class FilterSystem:
    """Handles filtering and searching of military database graphs."""
    
    def __init__(self):
        """Initialize the filter system."""
        self.available_filters = {
            'country': self._filter_by_country,
            'type': self._filter_by_type,
            'year': self._filter_by_year,
            'year_range': self._filter_by_year_range,
            'manufacturer': self._filter_by_manufacturer,
            'owner': self._filter_by_owner,
            'vehicle_type': self._filter_by_vehicle_type,
            'organization_type': self._filter_by_organization_type,
            'area_type': self._filter_by_area_type,
            'relationship': self._filter_by_relationship,
            'keyword': self._filter_by_keyword,
            'has_connection': self._filter_by_connection,
            'degree_min': self._filter_by_min_degree,
            'degree_max': self._filter_by_max_degree,
            # Enhanced military equipment category filters
            'equipment_category': self._filter_by_equipment_category
        }
        
        # Define military equipment categories and their keywords
        self.equipment_categories = {
            'aircraft_unmanned': ['unmanned aircraft', 'aircraft', 'drone', 'uav', 'unmanned aerial vehicle'],
            'communication_electronics': ['communication equipment', 'electronic system', 'computer system', 
                                        'sensor', 'sensor system', 'equipment', 'electronic_system', 
                                        'radar', 'radio', 'electronics'],
            'weapons_defense': ['artillery', 'missile', 'defense system', 'weapon', 'ammunition', 
                              'gun', 'cannon', 'launcher', 'rocket', 'bomb'],
            'vehicles': ['armored vehicle', 'vehicle', 'car', 'motorcycle', 'truck', 'bus', 'van', 
                        'bicycle', 'tank', 'apc', 'armored'],
            'naval_assets': ['naval vessel', 'vessel', 'boat', 'watercraft', 'ship', 'submarine', 
                           'destroyer', 'frigate', 'carrier'],
            'transportation': ['train', 'railway', 'locomotive', 'transport'],
            'administrative': ['organization', 'other', 'command', 'headquarters', 'base'],
            'geographic': ['country', 'area', 'coordinates', 'location', 'region', 'territory']
        }
    
    def apply_filters(self, graph: nx.Graph, filters: Dict[str, Any]) -> nx.Graph:
        """Apply multiple filters to a graph and return the filtered subgraph."""
        logger.info(f"Applying {len(filters)} filters to graph with {len(graph.nodes())} nodes")
        
        if not filters:
            return graph.copy()
        
        # Start with all nodes
        valid_nodes = set(graph.nodes())
        
        # Apply each filter
        for filter_name, filter_value in filters.items():
            if filter_name in self.available_filters:
                logger.debug(f"Applying filter: {filter_name} = {filter_value}")
                filter_func = self.available_filters[filter_name]
                filtered_nodes = filter_func(graph, filter_value)
                valid_nodes = valid_nodes.intersection(filtered_nodes)
                logger.debug(f"Nodes after {filter_name}: {len(valid_nodes)}")
            else:
                logger.warning(f"Unknown filter: {filter_name}")
        
        # Create subgraph with valid nodes
        filtered_graph = graph.subgraph(valid_nodes).copy()
        logger.info(f"Filtered graph: {len(filtered_graph.nodes())} nodes, {len(filtered_graph.edges())} edges")
        
        return filtered_graph
    
    def _filter_by_country(self, graph: nx.Graph, country: str) -> Set[str]:
        """Filter nodes by country association."""
        valid_nodes = set()
        country_lower = country.lower()
        
        for node, data in graph.nodes(data=True):
            # Check direct country field
            if data.get('country', '').lower() == country_lower:
                valid_nodes.add(node)
                continue
            
            # Check owner field (for vehicles)
            if data.get('owner', '').lower().endswith(country_lower):
                valid_nodes.add(node)
                continue
            
            # Check nationality (for people)
            if data.get('nationality', '').lower().endswith(country_lower):
                valid_nodes.add(node)
                continue
            
            # Check if it's a country node itself
            if data.get('type') == 'country':
                entity_data = data.get('data', {})
                if 'names' in entity_data:
                    for name_obj in entity_data['names']:
                        if isinstance(name_obj, dict):
                            name_value = name_obj.get('value', '').lower()
                            if country_lower in name_value:
                                valid_nodes.add(node)
                                break
        
        return valid_nodes
    
    def _filter_by_type(self, graph: nx.Graph, entity_type: str) -> Set[str]:
        """Filter nodes by entity type."""
        valid_nodes = set()
        
        for node, data in graph.nodes(data=True):
            if data.get('type') == entity_type:
                valid_nodes.add(node)
        
        return valid_nodes
    
    def _filter_by_year(self, graph: nx.Graph, year: Union[int, str]) -> Set[str]:
        """Filter nodes by specific year."""
        try:
            target_year = int(year)
        except (ValueError, TypeError):
            logger.warning(f"Invalid year format: {year}")
            return set()
        
        valid_nodes = set()
        
        for node, data in graph.nodes(data=True):
            node_year = data.get('year')
            if node_year == target_year:
                valid_nodes.add(node)
                continue
            
            # Check entity data for year fields
            entity_data = data.get('data', {})
            if entity_data.get('year') == target_year:
                valid_nodes.add(node)
        
        return valid_nodes
    
    def _filter_by_year_range(self, graph: nx.Graph, year_range: str) -> Set[str]:
        """Filter nodes by year range (e.g., '1990-2000')."""
        try:
            start_year, end_year = map(int, year_range.split('-'))
        except (ValueError, TypeError):
            logger.warning(f"Invalid year range format: {year_range}")
            return set()
        
        valid_nodes = set()
        
        for node, data in graph.nodes(data=True):
            node_year = data.get('year')
            if node_year and start_year <= node_year <= end_year:
                valid_nodes.add(node)
                continue
            
            # Check entity data
            entity_data = data.get('data', {})
            entity_year = entity_data.get('year')
            if entity_year and start_year <= entity_year <= end_year:
                valid_nodes.add(node)
        
        return valid_nodes
    
    def _filter_by_manufacturer(self, graph: nx.Graph, manufacturer: str) -> Set[str]:
        """Filter nodes by manufacturer."""
        valid_nodes = set()
        manufacturer_lower = manufacturer.lower()
        
        for node, data in graph.nodes(data=True):
            # Check manufacturer field
            node_manufacturer = data.get('manufacturer', '').lower()
            if manufacturer_lower in node_manufacturer:
                valid_nodes.add(node)
                continue
            
            # Check entity data
            entity_data = data.get('data', {})
            entity_manufacturer = entity_data.get('make', '').lower()
            if manufacturer_lower in entity_manufacturer:
                valid_nodes.add(node)
        
        return valid_nodes
    
    def _filter_by_owner(self, graph: nx.Graph, owner: str) -> Set[str]:
        """Filter nodes by owner."""
        valid_nodes = set()
        owner_lower = owner.lower()
        
        for node, data in graph.nodes(data=True):
            node_owner = data.get('owner', '').lower()
            if owner_lower in node_owner:
                valid_nodes.add(node)
        
        return valid_nodes
    
    def _filter_by_vehicle_type(self, graph: nx.Graph, vehicle_type: str) -> Set[str]:
        """Filter nodes by vehicle type."""
        valid_nodes = set()
        vehicle_type_lower = vehicle_type.lower()
        
        for node, data in graph.nodes(data=True):
            if data.get('type') == 'vehicle':
                node_vtype = data.get('vehicle_type', '').lower()
                if vehicle_type_lower in node_vtype:
                    valid_nodes.add(node)
        
        return valid_nodes
    
    def _filter_by_organization_type(self, graph: nx.Graph, org_type: str) -> Set[str]:
        """Filter nodes by organization type."""
        valid_nodes = set()
        org_type_lower = org_type.lower()
        
        for node, data in graph.nodes(data=True):
            if data.get('type') == 'militaryOrganization':
                node_org_type = data.get('organization_type', '').lower()
                if org_type_lower in node_org_type:
                    valid_nodes.add(node)
        
        return valid_nodes
    
    def _filter_by_area_type(self, graph: nx.Graph, area_type: str) -> Set[str]:
        """Filter nodes by area type."""
        valid_nodes = set()
        area_type_lower = area_type.lower()
        
        for node, data in graph.nodes(data=True):
            if data.get('type') == 'area':
                node_area_type = data.get('area_type', '').lower()
                if area_type_lower in node_area_type:
                    valid_nodes.add(node)
        
        return valid_nodes
    
    def _filter_by_relationship(self, graph: nx.Graph, relationship: str) -> Set[str]:
        """Filter nodes that have a specific type of relationship."""
        valid_nodes = set()
        
        for source, target, edge_data in graph.edges(data=True):
            if edge_data.get('relationship') == relationship:
                valid_nodes.add(source)
                valid_nodes.add(target)
        
        return valid_nodes
    
    def _filter_by_keyword(self, graph: nx.Graph, keyword: str) -> Set[str]:
        """Filter nodes by keyword search in labels and descriptions."""
        valid_nodes = set()
        keyword_lower = keyword.lower()
        
        for node, data in graph.nodes(data=True):
            # Search in label
            label = data.get('label', '').lower()
            if keyword_lower in label:
                valid_nodes.add(node)
                continue
            
            # Search in node ID
            if keyword_lower in node.lower():
                valid_nodes.add(node)
                continue
            
            # Search in entity data
            entity_data = data.get('data', {})
            
            # Search in names
            if 'names' in entity_data:
                for name_obj in entity_data.get('names', []):
                    if isinstance(name_obj, dict):
                        name_value = name_obj.get('value', '').lower()
                        if keyword_lower in name_value:
                            valid_nodes.add(node)
                            break
            
            # Search in other text fields
            for field in ['description', 'title', 'model', 'make']:
                field_value = entity_data.get(field, '').lower()
                if keyword_lower in field_value:
                    valid_nodes.add(node)
                    break
        
        return valid_nodes
    
    def _filter_by_connection(self, graph: nx.Graph, target_node: str) -> Set[str]:
        """Filter nodes that are connected to a specific target node."""
        if target_node not in graph:
            return set()
        
        # Get all neighbors of the target node
        neighbors = set(graph.neighbors(target_node))
        neighbors.add(target_node)  # Include the target node itself
        
        return neighbors
    
    def _filter_by_min_degree(self, graph: nx.Graph, min_degree: Union[int, str]) -> Set[str]:
        """Filter nodes with minimum degree (number of connections)."""
        try:
            min_deg = int(min_degree)
        except (ValueError, TypeError):
            logger.warning(f"Invalid minimum degree: {min_degree}")
            return set()
        
        valid_nodes = set()
        
        for node in graph.nodes():
            if graph.degree(node) >= min_deg:
                valid_nodes.add(node)
        
        return valid_nodes
    
    def _filter_by_max_degree(self, graph: nx.Graph, max_degree: Union[int, str]) -> Set[str]:
        """Filter nodes with maximum degree (number of connections)."""
        try:
            max_deg = int(max_degree)
        except (ValueError, TypeError):
            logger.warning(f"Invalid maximum degree: {max_degree}")
            return set()
        
        valid_nodes = set()
        
        for node in graph.nodes():
            if graph.degree(node) <= max_deg:
                valid_nodes.add(node)
        
        return valid_nodes
    
    def _filter_by_equipment_category(self, graph: nx.Graph, categories: Union[str, List[str]]) -> Set[str]:
        """Filter nodes by military equipment categories.
        
        Args:
            graph: NetworkX graph to filter
            categories: Single category string or list of category strings to filter by
            
        Returns:
            Set of node IDs that match the specified equipment categories
        """
        valid_nodes = set()
        
        # Handle single category as string
        if isinstance(categories, str):
            categories = [categories]
        
        # Collect all keywords for selected categories
        category_keywords = set()
        for category in categories:
            if category in self.equipment_categories:
                category_keywords.update(self.equipment_categories[category])
        
        if not category_keywords:
            logger.warning(f"No keywords found for categories: {categories}")
            return valid_nodes
        
        # Search nodes for category keywords
        for node, data in graph.nodes(data=True):
            node_matched = False
            
            # Check entity type directly
            entity_type = data.get('type', '').lower()
            for keyword in category_keywords:
                if keyword.lower() in entity_type:
                    valid_nodes.add(node)
                    node_matched = True
                    break
            
            if node_matched:
                continue
            
            # Check vehicle type for vehicle-related categories
            if 'vehicle' in categories or 'vehicles' in categories:
                vehicle_type = data.get('vehicle_type', '').lower()
                for keyword in category_keywords:
                    if keyword.lower() in vehicle_type:
                        valid_nodes.add(node)
                        node_matched = True
                        break
            
            if node_matched:
                continue
            
            # Check organization type for administrative categories
            if 'administrative' in categories:
                org_type = data.get('organization_type', '').lower()
                for keyword in category_keywords:
                    if keyword.lower() in org_type:
                        valid_nodes.add(node)
                        node_matched = True
                        break
            
            if node_matched:
                continue
                
            # Check area type for geographic categories
            if 'geographic' in categories:
                area_type = data.get('area_type', '').lower()
                for keyword in category_keywords:
                    if keyword.lower() in area_type:
                        valid_nodes.add(node)
                        node_matched = True
                        break
            
            if node_matched:
                continue
            
            # Check in label and description
            label = data.get('label', '').lower()
            for keyword in category_keywords:
                if keyword.lower() in label:
                    valid_nodes.add(node)
                    node_matched = True
                    break
            
            if node_matched:
                continue
            
            # Check in entity data fields
            entity_data = data.get('data', {})
            
            # Search in names
            if 'names' in entity_data:
                for name_obj in entity_data.get('names', []):
                    if isinstance(name_obj, dict):
                        name_value = name_obj.get('value', '').lower()
                        for keyword in category_keywords:
                            if keyword.lower() in name_value:
                                valid_nodes.add(node)
                                node_matched = True
                                break
                    if node_matched:
                        break
            
            if node_matched:
                continue
            
            # Search in other descriptive fields
            for field in ['description', 'title', 'model', 'make', 'classification']:
                field_value = entity_data.get(field, '').lower()
                for keyword in category_keywords:
                    if keyword.lower() in field_value:
                        valid_nodes.add(node)
                        node_matched = True
                        break
                if node_matched:
                    break
        
        logger.debug(f"Equipment category filter for {categories}: {len(valid_nodes)} nodes found")
        return valid_nodes
    
    def search_entities(self, graph: nx.Graph, search_terms: List[str], 
                       search_type: str = 'any') -> Set[str]:
        """Search for entities using multiple search terms."""
        if not search_terms:
            return set(graph.nodes())
        
        result_sets = []
        
        for term in search_terms:
            term_results = self._filter_by_keyword(graph, term)
            result_sets.append(term_results)
        
        # Combine results based on search type
        if search_type == 'all':
            # Intersection - entities must match all terms
            result = result_sets[0]
            for term_set in result_sets[1:]:
                result = result.intersection(term_set)
        else:  # search_type == 'any'
            # Union - entities can match any term
            result = set()
            for term_set in result_sets:
                result = result.union(term_set)
        
        return result
    
    def get_filter_suggestions(self, graph: nx.Graph) -> Dict[str, List[str]]:
        """Get suggestions for filter values based on graph content."""
        suggestions = {
            'countries': set(),
            'types': set(),
            'years': set(),
            'manufacturers': set(),
            'vehicle_types': set(),
            'organization_types': set(),
            'area_types': set(),
            'relationships': set(),
            'equipment_categories': set()
        }
        
        # Add available equipment categories
        suggestions['equipment_categories'].update(self.equipment_categories.keys())
        
        # Collect unique values from nodes
        for node, data in graph.nodes(data=True):
            # Entity types
            suggestions['types'].add(data.get('type', ''))
            
            # Years
            year = data.get('year')
            if year:
                suggestions['years'].add(str(year))
            
            # Manufacturers
            manufacturer = data.get('manufacturer')
            if manufacturer:
                suggestions['manufacturers'].add(manufacturer)
            
            # Type-specific suggestions
            entity_type = data.get('type')
            if entity_type == 'vehicle':
                vtype = data.get('vehicle_type')
                if vtype:
                    suggestions['vehicle_types'].add(vtype)
            elif entity_type == 'militaryOrganization':
                org_type = data.get('organization_type')
                if org_type:
                    suggestions['organization_types'].add(org_type)
            elif entity_type == 'area':
                area_type = data.get('area_type')
                if area_type:
                    suggestions['area_types'].add(area_type)
            elif entity_type == 'country':
                suggestions['countries'].add(data.get('label', ''))
        
        # Collect relationship types from edges
        for source, target, edge_data in graph.edges(data=True):
            relationship = edge_data.get('relationship')
            if relationship:
                suggestions['relationships'].add(relationship)
        
        # Convert sets to sorted lists and clean up
        return {
            key: sorted([item for item in values if item])
            for key, values in suggestions.items()
        }
    
    def create_advanced_filter(self, graph: nx.Graph, filter_config: Dict) -> nx.Graph:
        """Create an advanced filter with complex logic."""
        # Support for complex filter expressions
        if 'logic' in filter_config:
            return self._apply_logical_filter(graph, filter_config)
        else:
            return self.apply_filters(graph, filter_config)
    
    def _apply_logical_filter(self, graph: nx.Graph, filter_config: Dict) -> nx.Graph:
        """Apply filters with logical operators (AND, OR, NOT)."""
        logic = filter_config.get('logic', 'AND')
        conditions = filter_config.get('conditions', [])
        
        if not conditions:
            return graph.copy()
        
        result_sets = []
        
        for condition in conditions:
            if 'filter' in condition:
                filtered_nodes = set()
                for filter_name, filter_value in condition['filter'].items():
                    if filter_name in self.available_filters:
                        filter_func = self.available_filters[filter_name]
                        nodes = filter_func(graph, filter_value)
                        if not filtered_nodes:
                            filtered_nodes = nodes
                        else:
                            filtered_nodes = filtered_nodes.intersection(nodes)
                
                # Apply NOT if specified
                if condition.get('not', False):
                    all_nodes = set(graph.nodes())
                    filtered_nodes = all_nodes - filtered_nodes
                
                result_sets.append(filtered_nodes)
        
        # Combine results based on logic
        if logic == 'AND':
            final_nodes = result_sets[0] if result_sets else set()
            for node_set in result_sets[1:]:
                final_nodes = final_nodes.intersection(node_set)
        elif logic == 'OR':
            final_nodes = set()
            for node_set in result_sets:
                final_nodes = final_nodes.union(node_set)
        else:  # Default to AND
            final_nodes = result_sets[0] if result_sets else set()
            for node_set in result_sets[1:]:
                final_nodes = final_nodes.intersection(node_set)
        
        return graph.subgraph(final_nodes).copy()
    
    def get_equipment_category_info(self) -> Dict[str, Dict[str, Any]]:
        """Get information about available equipment categories for UI display."""
        category_info = {
            'aircraft_unmanned': {
                'label': 'Aircraft & Unmanned Systems',
                'description': 'Aircraft, drones, UAVs, and unmanned aerial vehicles',
                'keywords': self.equipment_categories['aircraft_unmanned']
            },
            'communication_electronics': {
                'label': 'Communication & Electronics',
                'description': 'Communication equipment, sensors, electronic systems',
                'keywords': self.equipment_categories['communication_electronics']
            },
            'weapons_defense': {
                'label': 'Weapons & Defense',
                'description': 'Artillery, missiles, weapons, and defense systems',
                'keywords': self.equipment_categories['weapons_defense']
            },
            'vehicles': {
                'label': 'Vehicles',
                'description': 'All types of vehicles including armored vehicles',
                'keywords': self.equipment_categories['vehicles']
            },
            'naval_assets': {
                'label': 'Naval Assets',
                'description': 'Ships, vessels, boats, and naval equipment',
                'keywords': self.equipment_categories['naval_assets']
            },
            'transportation': {
                'label': 'Transportation',
                'description': 'Trains, railways, and transport infrastructure',
                'keywords': self.equipment_categories['transportation']
            },
            'administrative': {
                'label': 'Administrative',
                'description': 'Organizations, commands, and administrative entities',
                'keywords': self.equipment_categories['administrative']
            },
            'geographic': {
                'label': 'Geographic',
                'description': 'Countries, areas, coordinates, and locations',
                'keywords': self.equipment_categories['geographic']
            }
        }
        return category_info