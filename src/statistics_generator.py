"""
Statistics Generator for IES4 Military Database Analysis Suite
Generates comprehensive statistics and analysis reports from graph data.
"""

import networkx as nx
import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Tuple, Optional, Any
from collections import defaultdict, Counter
from datetime import datetime
import json
import csv

logger = logging.getLogger(__name__)

class StatisticsGenerator:
    """Generates statistics and analysis reports from military database graphs."""
    
    def __init__(self):
        """Initialize the statistics generator."""
        self.entity_types = [
            'countries', 'vehicles', 'vehicleTypes', 'people', 'peopleTypes',
            'areas', 'militaryOrganizations', 'representations'
        ]
    
    def generate_statistics(self, graph: nx.Graph, database: Dict) -> Dict:
        """Generate comprehensive statistics for a graph and database."""
        logger.info("Generating comprehensive statistics")
        
        stats = {
            'metadata': self._get_metadata(graph, database),
            'node_statistics': self._analyze_nodes(graph),
            'edge_statistics': self._analyze_edges(graph),
            'connectivity': self._analyze_connectivity(graph),
            'centrality': self._analyze_centrality(graph),
            'entity_analysis': self._analyze_entities(graph),
            'temporal_analysis': self._analyze_temporal_data(graph),
            'geographic_analysis': self._analyze_geographic_data(graph),
            'technology_analysis': self._analyze_technology_data(graph)
        }
        
        return stats
    
    def _get_metadata(self, graph: nx.Graph, database: Dict) -> Dict:
        """Get metadata about the graph and database."""
        return {
            'generated_at': datetime.now().isoformat(),
            'node_count': len(graph.nodes),
            'edge_count': len(graph.edges),
            'database_info': graph.graph.get('database_info', {}),
            'entity_counts': self._count_entities_by_type(graph)
        }
    
    def _analyze_nodes(self, graph: nx.Graph) -> Dict:
        """Analyze node-related statistics."""
        node_stats = {
            'total_nodes': len(graph.nodes),
            'node_types': Counter(),
            'degree_distribution': Counter(),
            'isolated_nodes': []
        }
        
        for node, data in graph.nodes(data=True):
            node_type = data.get('type', 'unknown')
            node_stats['node_types'][node_type] += 1
            
            degree = graph.degree(node)
            node_stats['degree_distribution'][degree] += 1
            
            if degree == 0:
                node_stats['isolated_nodes'].append(node)
        
        # Calculate degree statistics
        degrees = [graph.degree(node) for node in graph.nodes()]
        if degrees:
            node_stats['degree_stats'] = {
                'mean': np.mean(degrees),
                'median': np.median(degrees),
                'std': np.std(degrees),
                'min': min(degrees),
                'max': max(degrees)
            }
        
        return node_stats
    
    def _analyze_edges(self, graph: nx.Graph) -> Dict:
        """Analyze edge-related statistics."""
        edge_stats = {
            'total_edges': len(graph.edges),
            'relationship_types': Counter(),
            'edge_weight_distribution': Counter()
        }
        
        for source, target, data in graph.edges(data=True):
            relationship = data.get('relationship', 'unknown')
            edge_stats['relationship_types'][relationship] += 1
            
            weight = data.get('weight', 1)
            edge_stats['edge_weight_distribution'][weight] += 1
        
        return edge_stats
    
    def _analyze_connectivity(self, graph: nx.Graph) -> Dict:
        """Analyze graph connectivity properties."""
        connectivity = {
            'is_connected': nx.is_connected(graph),
            'number_of_components': nx.number_connected_components(graph),
            'density': nx.density(graph)
        }
        
        if len(graph.nodes) > 0:
            # Component analysis
            components = list(nx.connected_components(graph))
            connectivity['component_sizes'] = [len(comp) for comp in components]
            connectivity['largest_component_size'] = len(max(components, key=len)) if components else 0
            
            # Clustering
            connectivity['average_clustering'] = nx.average_clustering(graph)
            
            # Path lengths (for largest component only if disconnected)
            if nx.is_connected(graph):
                connectivity['average_shortest_path_length'] = nx.average_shortest_path_length(graph)
                connectivity['diameter'] = nx.diameter(graph)
            else:
                # Analyze largest component
                largest_component = max(components, key=len) if components else set()
                if len(largest_component) > 1:
                    subgraph = graph.subgraph(largest_component)
                    connectivity['largest_component_avg_path'] = nx.average_shortest_path_length(subgraph)
                    connectivity['largest_component_diameter'] = nx.diameter(subgraph)
        
        return connectivity
    
    def _analyze_centrality(self, graph: nx.Graph) -> Dict:
        """Analyze centrality measures for important nodes."""
        centrality = {}
        
        if len(graph.nodes) == 0:
            return centrality
        
        # Degree centrality
        degree_centrality = nx.degree_centrality(graph)
        centrality['top_degree_centrality'] = self._get_top_n(degree_centrality, 10)
        
        # Betweenness centrality (sample for large graphs)
        k = min(100, len(graph.nodes)) if len(graph.nodes) > 100 else None
        betweenness_centrality = nx.betweenness_centrality(graph, k=k)
        centrality['top_betweenness_centrality'] = self._get_top_n(betweenness_centrality, 10)
        
        # Closeness centrality (for connected components)
        if nx.is_connected(graph):
            closeness_centrality = nx.closeness_centrality(graph)
            centrality['top_closeness_centrality'] = self._get_top_n(closeness_centrality, 10)
        
        # Eigenvector centrality
        try:
            eigenvector_centrality = nx.eigenvector_centrality(graph, max_iter=1000)
            centrality['top_eigenvector_centrality'] = self._get_top_n(eigenvector_centrality, 10)
        except (nx.NetworkXError, nx.PowerIterationFailedConvergence):
            logger.warning("Could not compute eigenvector centrality")
        
        return centrality
    
    def _get_top_n(self, centrality_dict: Dict, n: int) -> List[Tuple[str, float]]:
        """Get top N nodes by centrality score."""
        return sorted(centrality_dict.items(), key=lambda x: x[1], reverse=True)[:n]
    
    def _analyze_entities(self, graph: nx.Graph) -> Dict:
        """Analyze entity-specific statistics."""
        entity_analysis = {
            'countries': self._analyze_countries(graph),
            'vehicles': self._analyze_vehicles(graph),
            'organizations': self._analyze_organizations(graph),
            'people': self._analyze_people(graph),
            'areas': self._analyze_areas(graph)
        }
        
        return entity_analysis
    
    def _analyze_countries(self, graph: nx.Graph) -> Dict:
        """Analyze country-specific statistics."""
        countries = {}
        
        for node, data in graph.nodes(data=True):
            if data.get('type') == 'country':
                country_id = node
                country_name = data.get('label', country_id)
                
                # Count assets owned by this country
                owned_assets = 0
                asset_types = Counter()
                
                for neighbor in graph.neighbors(node):
                    neighbor_data = graph.nodes[neighbor]
                    edge_data = graph.edges[node, neighbor]
                    
                    if edge_data.get('relationship') in ['owner', 'owned_by']:
                        owned_assets += 1
                        asset_type = neighbor_data.get('type', 'unknown')
                        asset_types[asset_type] += 1
                
                countries[country_name] = {
                    'total_assets': owned_assets,
                    'asset_types': dict(asset_types),
                    'connections': graph.degree(node)
                }
        
        return countries
    
    def _analyze_vehicles(self, graph: nx.Graph) -> Dict:
        """Analyze vehicle-specific statistics."""
        vehicles = {
            'total_count': 0,
            'by_type': Counter(),
            'by_country': Counter(),
            'by_manufacturer': Counter(),
            'by_decade': Counter(),
            'age_distribution': Counter()
        }
        
        current_year = datetime.now().year
        
        for node, data in graph.nodes(data=True):
            if data.get('type') == 'vehicle':
                vehicles['total_count'] += 1
                
                # Vehicle type
                vehicle_type = data.get('vehicle_type', 'unknown')
                vehicles['by_type'][vehicle_type] += 1
                
                # Country (owner)
                owner = data.get('owner', 'unknown')
                vehicles['by_country'][owner] += 1
                
                # Manufacturer
                manufacturer = data.get('manufacturer', 'unknown')
                vehicles['by_manufacturer'][manufacturer] += 1
                
                # Year analysis
                year = data.get('year')
                if year:
                    decade = (year // 10) * 10
                    vehicles['by_decade'][f"{decade}s"] += 1
                    
                    age = current_year - year
                    age_group = f"{(age // 10) * 10}-{(age // 10) * 10 + 9} years"
                    vehicles['age_distribution'][age_group] += 1
        
        return vehicles
    
    def _analyze_organizations(self, graph: nx.Graph) -> Dict:
        """Analyze military organization statistics."""
        organizations = {
            'total_count': 0,
            'by_type': Counter(),
            'by_country': Counter(),
            'personnel_stats': {}
        }
        
        personnel_numbers = []
        
        for node, data in graph.nodes(data=True):
            if data.get('type') == 'militaryOrganization':
                organizations['total_count'] += 1
                
                # Organization type
                org_type = data.get('organization_type', 'unknown')
                organizations['by_type'][org_type] += 1
                
                # Country
                country = data.get('country', 'unknown')
                organizations['by_country'][country] += 1
                
                # Personnel strength
                entity_data = data.get('data', {})
                personnel = entity_data.get('personnelStrength')
                if personnel and isinstance(personnel, (int, float)):
                    personnel_numbers.append(personnel)
        
        # Personnel statistics
        if personnel_numbers:
            organizations['personnel_stats'] = {
                'total_personnel': sum(personnel_numbers),
                'average_personnel': np.mean(personnel_numbers),
                'median_personnel': np.median(personnel_numbers),
                'largest_organization': max(personnel_numbers),
                'smallest_organization': min(personnel_numbers)
            }
        
        return organizations
    
    def _analyze_people(self, graph: nx.Graph) -> Dict:
        """Analyze people-related statistics."""
        people = {
            'total_count': 0,
            'by_type': Counter(),
            'by_nationality': Counter(),
            'birth_decades': Counter()
        }
        
        for node, data in graph.nodes(data=True):
            if data.get('type') == 'person':
                people['total_count'] += 1
                
                # Person types
                person_types = data.get('person_types', [])
                if isinstance(person_types, list):
                    for ptype in person_types:
                        people['by_type'][ptype] += 1
                else:
                    people['by_type']['unknown'] += 1
                
                # Nationality
                nationality = data.get('nationality', 'unknown')
                people['by_nationality'][nationality] += 1
                
                # Birth decade
                entity_data = data.get('data', {})
                birth_date = entity_data.get('birthDate')
                if birth_date:
                    try:
                        if isinstance(birth_date, str) and len(birth_date) >= 4:
                            birth_year = int(birth_date[:4])
                            birth_decade = (birth_year // 10) * 10
                            people['birth_decades'][f"{birth_decade}s"] += 1
                    except (ValueError, TypeError):
                        pass
        
        return people
    
    def _analyze_areas(self, graph: nx.Graph) -> Dict:
        """Analyze area-related statistics."""
        areas = {
            'total_count': 0,
            'by_type': Counter(),
            'by_country': Counter(),
            'by_admin_level': Counter()
        }
        
        for node, data in graph.nodes(data=True):
            if data.get('type') == 'area':
                areas['total_count'] += 1
                
                # Area type
                area_type = data.get('area_type', 'unknown')
                areas['by_type'][area_type] += 1
                
                # Country
                country = data.get('country', 'unknown')
                areas['by_country'][country] += 1
                
                # Administrative level
                entity_data = data.get('data', {})
                admin_level = entity_data.get('administrativeLevel', 'unknown')
                areas['by_admin_level'][admin_level] += 1
        
        return areas
    
    def _analyze_temporal_data(self, graph: nx.Graph) -> Dict:
        """Analyze temporal patterns in the data."""
        temporal = {
            'technology_timeline': defaultdict(lambda: defaultdict(int)),
            'service_periods': [],
            'modernization_trends': {}
        }
        
        for node, data in graph.nodes(data=True):
            # Extract year information
            year = data.get('year')
            entity_type = data.get('type')
            country = data.get('owner') or data.get('country') or data.get('nationality')
            
            if year and country and entity_type in ['vehicle', 'militaryOrganization']:
                temporal['technology_timeline'][country][year] += 1
        
        return temporal
    
    def _analyze_geographic_data(self, graph: nx.Graph) -> Dict:
        """Analyze geographic distribution of assets."""
        geographic = {
            'country_assets': defaultdict(int),
            'regional_distribution': {},
            'base_locations': Counter()
        }
        
        for node, data in graph.nodes(data=True):
            entity_type = data.get('type')
            
            if entity_type == 'vehicle':
                owner = data.get('owner')
                if owner:
                    geographic['country_assets'][owner] += 1
            
            elif entity_type == 'area':
                area_type = data.get('area_type')
                if area_type == 'military':
                    country = data.get('country')
                    if country:
                        geographic['base_locations'][country] += 1
        
        return geographic
    
    def _analyze_technology_data(self, graph: nx.Graph) -> Dict:
        """Analyze technology and modernization trends."""
        technology = {
            'manufacturers': Counter(),
            'technology_generations': {},
            'capability_gaps': {},
            'modernization_patterns': {}
        }
        
        # Manufacturer analysis
        for node, data in graph.nodes(data=True):
            if data.get('type') == 'vehicle':
                manufacturer = data.get('manufacturer')
                if manufacturer:
                    technology['manufacturers'][manufacturer] += 1
        
        return technology
    
    def _count_entities_by_type(self, graph: nx.Graph) -> Dict[str, int]:
        """Count entities by type."""
        counts = Counter()
        
        for node, data in graph.nodes(data=True):
            entity_type = data.get('type', 'unknown')
            counts[entity_type] += 1
        
        return dict(counts)
    
    def compare_countries(self, graph: nx.Graph, countries: List[str], 
                         databases: List[str]) -> Dict:
        """Generate a comparison analysis between countries."""
        logger.info(f"Comparing countries: {countries}")
        
        comparison = {
            'countries': {},
            'comparison_metrics': {},
            'relative_strengths': {},
            'technology_timeline': {},
            'asset_types': {},
            'organization_types': Counter()
        }
        
        # Analyze each country
        for country in countries:
            comparison['countries'][country] = self._analyze_single_country(graph, country)
        
        # Generate comparative metrics
        comparison['comparison_metrics'] = self._generate_comparison_metrics(comparison['countries'])
        
        # Analyze relative strengths
        comparison['relative_strengths'] = self._analyze_relative_strengths(comparison['countries'])
        
        # Technology timeline comparison
        comparison['technology_timeline'] = self._compare_technology_timelines(graph, countries)
        
        # Asset types distribution
        comparison['asset_types'] = self._compare_asset_types(graph, countries)
        
        return comparison
    
    def _analyze_single_country(self, graph: nx.Graph, country: str) -> Dict:
        """Analyze a single country's military capabilities."""
        country_stats = {
            'total_assets': 0,
            'vehicles': 0,
            'organizations': 0,
            'areas': 0,
            'people': 0,
            'vehicle_types': Counter(),
            'organization_types': Counter(),
            'manufacturers': Counter(),
            'timeline': defaultdict(int)
        }
        
        for node, data in graph.nodes(data=True):
            # Check if entity belongs to this country
            belongs_to_country = False
            entity_type = data.get('type')
            
            if data.get('owner', '').lower().find(country.lower()) != -1:
                belongs_to_country = True
            elif data.get('country', '').lower().find(country.lower()) != -1:
                belongs_to_country = True
            elif data.get('nationality', '').lower().find(country.lower()) != -1:
                belongs_to_country = True
            elif entity_type == 'country' and data.get('label', '').lower().find(country.lower()) != -1:
                belongs_to_country = True
            
            if belongs_to_country:
                country_stats['total_assets'] += 1
                
                if entity_type == 'vehicle':
                    country_stats['vehicles'] += 1
                    vehicle_type = data.get('vehicle_type', 'unknown')
                    country_stats['vehicle_types'][vehicle_type] += 1
                    manufacturer = data.get('manufacturer', 'unknown')
                    country_stats['manufacturers'][manufacturer] += 1
                    
                elif entity_type == 'militaryOrganization':
                    country_stats['organizations'] += 1
                    org_type = data.get('organization_type', 'unknown')
                    country_stats['organization_types'][org_type] += 1
                    
                elif entity_type == 'area':
                    country_stats['areas'] += 1
                    
                elif entity_type == 'person':
                    country_stats['people'] += 1
                
                # Timeline data
                year = data.get('year')
                if year:
                    country_stats['timeline'][year] += 1
        
        return country_stats
    
    def _generate_comparison_metrics(self, countries_data: Dict) -> Dict:
        """Generate comparative metrics between countries."""
        metrics = {
            'total_assets_ranking': [],
            'vehicle_counts': {},
            'organization_counts': {},
            'technology_diversity': {}
        }
        
        # Total assets ranking
        asset_counts = [(country, data['total_assets']) for country, data in countries_data.items()]
        metrics['total_assets_ranking'] = sorted(asset_counts, key=lambda x: x[1], reverse=True)
        
        # Vehicle and organization counts
        for country, data in countries_data.items():
            metrics['vehicle_counts'][country] = data['vehicles']
            metrics['organization_counts'][country] = data['organizations']
            metrics['technology_diversity'][country] = len(data['manufacturers'])
        
        return metrics
    
    def _analyze_relative_strengths(self, countries_data: Dict) -> Dict:
        """Analyze relative strengths and weaknesses of countries."""
        strengths = {}
        
        for country, data in countries_data.items():
            country_strengths = {
                'dominant_vehicle_types': [],
                'major_manufacturers': [],
                'organization_focus': [],
                'technology_era': None
            }
            
            # Dominant vehicle types (top 3)
            if data['vehicle_types']:
                top_vehicle_types = data['vehicle_types'].most_common(3)
                country_strengths['dominant_vehicle_types'] = top_vehicle_types
            
            # Major manufacturers (top 3)
            if data['manufacturers']:
                top_manufacturers = data['manufacturers'].most_common(3)
                country_strengths['major_manufacturers'] = top_manufacturers
            
            # Organization focus (top 3)
            if data['organization_types']:
                top_org_types = data['organization_types'].most_common(3)
                country_strengths['organization_focus'] = top_org_types
            
            # Technology era (most active decade)
            if data['timeline']:
                timeline_by_decade = defaultdict(int)
                for year, count in data['timeline'].items():
                    decade = (year // 10) * 10
                    timeline_by_decade[decade] += count
                
                if timeline_by_decade:
                    most_active_decade = max(timeline_by_decade.items(), key=lambda x: x[1])
                    country_strengths['technology_era'] = f"{most_active_decade[0]}s"
            
            strengths[country] = country_strengths
        
        return strengths
    
    def _compare_technology_timelines(self, graph: nx.Graph, countries: List[str]) -> Dict:
        """Compare technology development timelines between countries."""
        timelines = {}
        
        for country in countries:
            timeline = defaultdict(int)
            
            for node, data in graph.nodes(data=True):
                # Check if entity belongs to this country
                belongs_to_country = False
                if data.get('owner', '').lower().find(country.lower()) != -1:
                    belongs_to_country = True
                elif data.get('country', '').lower().find(country.lower()) != -1:
                    belongs_to_country = True
                
                if belongs_to_country:
                    year = data.get('year')
                    if year and data.get('type') in ['vehicle', 'militaryOrganization']:
                        timeline[year] += 1
            
            timelines[country] = dict(timeline)
        
        return timelines
    
    def _compare_asset_types(self, graph: nx.Graph, countries: List[str]) -> Dict:
        """Compare asset type distributions between countries."""
        asset_types = {}
        
        for country in countries:
            types = Counter()
            
            for node, data in graph.nodes(data=True):
                # Check if entity belongs to this country
                belongs_to_country = False
                if data.get('owner', '').lower().find(country.lower()) != -1:
                    belongs_to_country = True
                elif data.get('country', '').lower().find(country.lower()) != -1:
                    belongs_to_country = True
                
                if belongs_to_country:
                    entity_type = data.get('type', 'unknown')
                    types[entity_type] += 1
            
            asset_types[country] = dict(types)
        
        return asset_types
    
    def generate_comprehensive_report(self, graph: nx.Graph, databases: Dict, 
                                    selected_databases: List[str]) -> Dict:
        """Generate a comprehensive analysis report across multiple databases."""
        logger.info("Generating comprehensive analysis report")
        
        report = {
            'executive_summary': {},
            'database_overview': {},
            'entity_statistics': {},
            'relationship_analysis': {},
            'country_comparison': {},
            'technology_analysis': {},
            'timeline_analysis': {},
            'recommendations': {}
        }
        
        # Executive summary
        report['executive_summary'] = self._generate_executive_summary(graph, databases)
        
        # Database overview
        report['database_overview'] = self._analyze_database_coverage(databases, selected_databases)
        
        # Entity statistics
        report['entity_statistics'] = self._analyze_entities(graph)
        
        # Relationship analysis
        report['relationship_analysis'] = self._analyze_relationship_patterns(graph)
        
        # Country comparison
        major_countries = ['UK', 'USA', 'Russia', 'China', 'Iran', 'Poland', 'Sweden', 'Finland']
        report['country_comparison'] = self.compare_countries(graph, major_countries, selected_databases)
        
        # Technology analysis
        report['technology_analysis'] = self._analyze_technology_trends(graph)
        
        # Timeline analysis
        report['timeline_analysis'] = self._analyze_temporal_data(graph)
        
        # Recommendations
        report['recommendations'] = self._generate_recommendations(report)
        
        return report
    
    def _generate_executive_summary(self, graph: nx.Graph, databases: Dict) -> Dict:
        """Generate an executive summary of the analysis."""
        summary = {
            'total_entities': len(graph.nodes),
            'total_relationships': len(graph.edges),
            'databases_analyzed': len(databases),
            'key_findings': [],
            'data_quality_score': 0.0
        }
        
        # Key findings
        entity_counts = self._count_entities_by_type(graph)
        
        if entity_counts:
            largest_category = max(entity_counts.items(), key=lambda x: x[1])
            summary['key_findings'].append(f"Largest entity category: {largest_category[0]} ({largest_category[1]} entities)")
        
        # Calculate data quality score
        summary['data_quality_score'] = self._calculate_data_quality_score(graph)
        
        return summary
    
    def _analyze_database_coverage(self, databases: Dict, selected_databases: List[str]) -> Dict:
        """Analyze coverage across different databases."""
        coverage = {
            'databases_used': selected_databases,
            'coverage_by_type': {},
            'data_completeness': {},
            'database_sizes': {}
        }
        
        for db_name in selected_databases:
            if db_name in databases:
                db_data = databases[db_name]
                metadata = db_data.get('_metadata', {})
                coverage['database_sizes'][db_name] = metadata.get('entity_counts', {})
        
        return coverage
    
    def _analyze_relationship_patterns(self, graph: nx.Graph) -> Dict:
        """Analyze patterns in relationships between entities."""
        patterns = {
            'relationship_matrix': {},
            'common_patterns': [],
            'relationship_strength': {}
        }
        
        # Create relationship matrix
        relationship_counts = defaultdict(lambda: defaultdict(int))
        
        for source, target, edge_data in graph.edges(data=True):
            source_type = graph.nodes[source].get('type', 'unknown')
            target_type = graph.nodes[target].get('type', 'unknown')
            relationship = edge_data.get('relationship', 'unknown')
            
            relationship_counts[source_type][target_type] += 1
        
        patterns['relationship_matrix'] = dict(relationship_counts)
        
        return patterns
    
    def _analyze_technology_trends(self, graph: nx.Graph) -> Dict:
        """Analyze technology trends and capabilities."""
        trends = {
            'top_manufacturers': Counter(),
            'technology_generations': {},
            'capability_gaps': {},
            'innovation_leaders': {}
        }
        
        # Top manufacturers
        for node, data in graph.nodes(data=True):
            if data.get('type') == 'vehicle':
                manufacturer = data.get('manufacturer')
                if manufacturer:
                    trends['top_manufacturers'][manufacturer] += 1
        
        return trends
    
    def _calculate_data_quality_score(self, graph: nx.Graph) -> float:
        """Calculate a data quality score based on completeness and connectivity."""
        if len(graph.nodes) == 0:
            return 0.0
        
        # Factors for data quality
        connectivity_score = len(graph.edges) / max(1, len(graph.nodes))
        completeness_score = self._calculate_completeness_score(graph)
        consistency_score = self._calculate_consistency_score(graph)
        
        # Weighted average
        quality_score = (connectivity_score * 0.3 + completeness_score * 0.5 + consistency_score * 0.2)
        
        return min(1.0, quality_score)
    
    def _calculate_completeness_score(self, graph: nx.Graph) -> float:
        """Calculate completeness score based on filled fields."""
        total_fields = 0
        filled_fields = 0
        
        required_fields = ['type', 'label']
        optional_fields = ['year', 'country', 'manufacturer', 'owner']
        
        for node, data in graph.nodes(data=True):
            for field in required_fields + optional_fields:
                total_fields += 1
                if field in data and data[field]:
                    filled_fields += 1
        
        return filled_fields / max(1, total_fields)
    
    def _calculate_consistency_score(self, graph: nx.Graph) -> float:
        """Calculate consistency score based on data format uniformity."""
        # Simple consistency check - could be expanded
        consistent_items = 0
        total_items = 0
        
        for node, data in graph.nodes(data=True):
            total_items += 1
            if 'type' in data and data['type'] in ['country', 'vehicle', 'person', 'area', 'militaryOrganization']:
                consistent_items += 1
        
        return consistent_items / max(1, total_items)
    
    def _generate_recommendations(self, report: Dict) -> List[str]:
        """Generate recommendations based on the analysis."""
        recommendations = []
        
        # Data quality recommendations
        quality_score = report['executive_summary'].get('data_quality_score', 0)
        if quality_score < 0.7:
            recommendations.append("Improve data quality by filling missing fields and standardizing formats")
        
        # Coverage recommendations
        database_coverage = report['database_overview']
        if len(database_coverage.get('databases_used', [])) < 5:
            recommendations.append("Consider integrating additional databases for more comprehensive analysis")
        
        # Analysis recommendations
        entity_stats = report['entity_statistics']
        if entity_stats.get('vehicles', {}).get('total_count', 0) > entity_stats.get('organizations', {}).get('total_count', 0) * 10:
            recommendations.append("Vehicle data significantly outweighs organizational data - consider balancing")
        
        return recommendations
    
    def export_to_csv(self, graph: nx.Graph, filename: str):
        """Export graph data to CSV format."""
        logger.info(f"Exporting graph data to {filename}")
        
        # Prepare data for CSV export
        rows = []
        
        for node, data in graph.nodes(data=True):
            row = {
                'id': node,
                'type': data.get('type', ''),
                'label': data.get('label', ''),
                'country': data.get('country', ''),
                'owner': data.get('owner', ''),
                'manufacturer': data.get('manufacturer', ''),
                'year': data.get('year', ''),
                'vehicle_type': data.get('vehicle_type', ''),
                'organization_type': data.get('organization_type', ''),
                'area_type': data.get('area_type', ''),
                'connections': graph.degree(node)
            }
            rows.append(row)
        
        # Write to CSV
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            if rows:
                fieldnames = rows[0].keys()
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
        
        logger.info(f"Exported {len(rows)} entities to {filename}")
    
    def export_edges_to_csv(self, graph: nx.Graph, filename: str):
        """Export graph edges to CSV format."""
        logger.info(f"Exporting graph edges to {filename}")
        
        rows = []
        
        for source, target, data in graph.edges(data=True):
            row = {
                'source': source,
                'target': target,
                'relationship': data.get('relationship', ''),
                'weight': data.get('weight', 1)
            }
            rows.append(row)
        
        # Write to CSV
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            if rows:
                fieldnames = rows[0].keys()
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)
        
        logger.info(f"Exported {len(rows)} relationships to {filename}")