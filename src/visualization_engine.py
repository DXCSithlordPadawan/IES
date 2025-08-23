"""
Visualization Engine for IES4 Military Database Analysis Suite
Creates interactive visualizations using Plotly and other libraries.
"""

import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import networkx as nx
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any
import logging
from collections import defaultdict, Counter
import math

logger = logging.getLogger(__name__)

class VisualizationEngine:
    """Creates interactive visualizations for military database analysis."""
    
    def __init__(self):
        """Initialize the visualization engine."""
        self.default_layout_params = {
            'spring': {'k': 3, 'iterations': 50, 'seed': 42},
            'hierarchical': {'seed': 42},
            'circular': {'seed': 42},
            'force': {'k': 1, 'iterations': 50, 'seed': 42}
        }
        
        # Color schemes
        self.entity_colors = {
            'country': '#FF6B6B',           # Red
            'vehicle': '#4ECDC4',           # Teal  
            'person': '#45B7D1',            # Blue
            'area': '#96CEB4',              # Green
            'militaryOrganization': '#FECA57',  # Yellow
            'vehicleType': '#A8E6CF',       # Light Green
            'peopleType': '#DDA0DD',        # Plum
            'representation': '#F8B500'     # Orange
        }
        
        self.relationship_colors = {
            'owner': '#FF4444',
            'country': '#44FF44', 
            'vehicleType': '#4444FF',
            'personTypes': '#FF44FF',
            'parentArea': '#FFFF44',
            'headquarters': '#44FFFF'
        }
        
        self.country_colors = {
            'UK': '#C8102E',     # British Red
            'USA': '#002868',    # Navy Blue
            'Russia': '#DA020E', # Russian Red
            'China': '#DE2910'   # Chinese Red
        }
    
    def create_interactive_mindmap(self, graph: nx.Graph, title: str = "Military Database Analysis",
                                 layout_type: str = 'spring', show_labels: bool = True,
                                 filter_info: Optional[Dict] = None) -> go.Figure:
        """Create an interactive mind map visualization."""
        logger.info(f"Creating mind map with {len(graph.nodes)} nodes using {layout_type} layout")
        
        if len(graph.nodes) == 0:
            return self._create_empty_figure("No data to visualize")
        
        # Calculate layout
        pos = self._calculate_layout(graph, layout_type)
        
        # Create traces for edges
        edge_traces = self._create_edge_traces(graph, pos)
        
        # Create traces for nodes
        node_traces = self._create_node_traces(graph, pos, show_labels)
        
        # Create figure
        fig = go.Figure()
        
        # Add edge traces
        for trace in edge_traces:
            fig.add_trace(trace)
        
        # Add node traces
        for trace in node_traces:
            fig.add_trace(trace)
        
        # Update layout
        self._update_layout(fig, title, filter_info)
        
        return fig
    
    def _calculate_layout(self, graph: nx.Graph, layout_type: str) -> Dict[str, Tuple[float, float]]:
        """Calculate node positions using the specified layout algorithm."""
        params = self.default_layout_params.get(layout_type, {})
        
        if layout_type == 'spring':
            return nx.spring_layout(graph, **params)
        elif layout_type == 'circular':
            return nx.circular_layout(graph)
        elif layout_type == 'hierarchical':
            return self._hierarchical_layout(graph)
        elif layout_type == 'force':
            return nx.spring_layout(graph, **params)
        else:
            logger.warning(f"Unknown layout type: {layout_type}, using spring")
            return nx.spring_layout(graph, **self.default_layout_params['spring'])
    
    def _hierarchical_layout(self, graph: nx.Graph) -> Dict[str, Tuple[float, float]]:
        """Create a hierarchical layout based on entity types."""
        # Group nodes by type
        node_types = defaultdict(list)
        for node, data in graph.nodes(data=True):
            node_type = data.get('type', 'unknown')
            node_types[node_type].append(node)
        
        # Define y-positions for different types
        y_positions = {
            'country': 4,
            'militaryOrganization': 3,
            'area': 2,
            'vehicleType': 1.5,
            'vehicle': 1,
            'peopleType': 0.5,
            'person': 0,
            'representation': -1
        }
        
        pos = {}
        for node_type, nodes in node_types.items():
            y = y_positions.get(node_type, 0)
            
            # Arrange nodes of same type horizontally
            if len(nodes) == 1:
                x_positions = [0]
            else:
                x_positions = np.linspace(-len(nodes)/2, len(nodes)/2, len(nodes))
            
            for i, node in enumerate(nodes):
                pos[node] = (x_positions[i], y)
        
        return pos
    
    def _create_edge_traces(self, graph: nx.Graph, pos: Dict) -> List[go.Scatter]:
        """Create edge traces for the graph."""
        # Group edges by relationship type
        edge_groups = defaultdict(list)
        
        for edge in graph.edges(data=True):
            source, target, data = edge
            relationship = data.get('relationship', 'unknown')
            edge_groups[relationship].append((source, target))
        
        traces = []
        
        # Create a trace for each relationship type
        for relationship, edges in edge_groups.items():
            edge_x, edge_y = [], []
            
            for source, target in edges:
                if source in pos and target in pos:
                    x0, y0 = pos[source]
                    x1, y1 = pos[target]
                    edge_x.extend([x0, x1, None])
                    edge_y.extend([y0, y1, None])
            
            if edge_x:  # Only create trace if there are edges
                color = self.relationship_colors.get(relationship, '#888888')
                trace = go.Scatter(
                    x=edge_x, y=edge_y,
                    mode='lines',
                    line=dict(width=1, color=color),
                    hoverinfo='none',
                    showlegend=True,
                    name=f'{relationship.replace("_", " ").title()} ({len(edges)})',
                    legendgroup='edges'
                )
                traces.append(trace)
        
        return traces
    
    def _create_node_traces(self, graph: nx.Graph, pos: Dict, show_labels: bool) -> List[go.Scatter]:
        """Create node traces grouped by entity type."""
        # Group nodes by type
        node_groups = defaultdict(list)
        
        for node, data in graph.nodes(data=True):
            if node in pos:
                node_type = data.get('type', 'unknown')
                node_groups[node_type].append((node, data))
        
        traces = []
        
        # Create a trace for each entity type
        for node_type, nodes in node_groups.items():
            x_coords, y_coords = [], []
            text_labels, hover_texts = [], []
            
            for node_id, node_data in nodes:
                x, y = pos[node_id]
                x_coords.append(x)
                y_coords.append(y)
                
                # Text label
                label = node_data.get('label', node_id)
                text_labels.append(label if show_labels else '')
                
                # Hover information
                hover_text = self._create_hover_text(node_id, node_data, graph)
                hover_texts.append(hover_text)
            
            # Create trace
            color = self.entity_colors.get(node_type, '#808080')
            trace = go.Scatter(
                x=x_coords, y=y_coords,
                mode='markers+text' if show_labels else 'markers',
                text=text_labels,
                textposition='middle center',
                hovertext=hover_texts,
                hoverinfo='text',
                marker=dict(
                    size=self._get_node_size(node_type),
                    color=color,
                    line=dict(width=2, color='white'),
                    opacity=0.8
                ),
                textfont=dict(size=8, color='black'),
                name=f'{node_type.title()} ({len(nodes)})',
                showlegend=True,
                legendgroup='nodes'
            )
            traces.append(trace)
        
        return traces
    
    def _get_node_size(self, node_type: str) -> int:
        """Get node size based on entity type."""
        size_map = {
            'country': 25,
            'militaryOrganization': 20,
            'vehicle': 15,
            'area': 15,
            'person': 12,
            'vehicleType': 12,
            'peopleType': 12,
            'representation': 10
        }
        return size_map.get(node_type, 12)
    
    def _create_hover_text(self, node_id: str, node_data: Dict, graph: nx.Graph) -> str:
        """Create detailed hover text for a node."""
        label = node_data.get('label', node_id)
        node_type = node_data.get('type', 'unknown')
        
        hover_parts = [
            f"<b>{label}</b>",
            f"Type: {node_type.replace('_', ' ').title()}",
            f"ID: {node_id}",
            f"Connections: {len(list(graph.neighbors(node_id)))}"
        ]
        
        # Add type-specific information
        entity_data = node_data.get('data', {})
        
        if node_type == 'country':
            if 'currency' in entity_data:
                hover_parts.append(f"Currency: {entity_data['currency']}")
            if 'languages' in entity_data:
                hover_parts.append(f"Languages: {', '.join(entity_data['languages'])}")
        
        elif node_type == 'vehicle':
            if 'make' in entity_data:
                hover_parts.append(f"Manufacturer: {entity_data['make']}")
            if 'model' in entity_data:
                hover_parts.append(f"Model: {entity_data['model']}")
            if 'year' in entity_data:
                hover_parts.append(f"Year: {entity_data['year']}")
        
        elif node_type == 'person':
            if 'birthDate' in entity_data:
                hover_parts.append(f"Born: {entity_data['birthDate']}")
            if 'nationality' in entity_data:
                hover_parts.append(f"Nationality: {entity_data['nationality']}")
        
        elif node_type == 'militaryOrganization':
            if 'personnelStrength' in entity_data:
                hover_parts.append(f"Personnel: {entity_data['personnelStrength']:,}")
            if 'organizationType' in entity_data:
                hover_parts.append(f"Type: {entity_data['organizationType']}")
        
        elif node_type == 'area':
            if 'areaType' in entity_data:
                hover_parts.append(f"Area Type: {entity_data['areaType']}")
            if 'country' in entity_data:
                hover_parts.append(f"Country: {entity_data['country']}")
        
        return '<br>'.join(hover_parts)
    
    def _update_layout(self, fig: go.Figure, title: str, filter_info: Optional[Dict] = None):
        """Update the figure layout with styling and annotations."""
        subtitle_parts = []
        if filter_info:
            for key, value in filter_info.items():
                subtitle_parts.append(f"{key}: {value}")
        
        subtitle = f"Filters: {', '.join(subtitle_parts)}" if subtitle_parts else "Interactive Network Visualization"
        
        fig.update_layout(
            title=dict(
                text=f"{title}<br><sub>{subtitle}</sub>",
                x=0.5,
                font=dict(size=18)
            ),
            showlegend=True,
            legend=dict(
                orientation="v",
                yanchor="top",
                y=1,
                xanchor="left",
                x=1.01,
                bgcolor="rgba(255,255,255,0.8)"
            ),
            hovermode='closest',
            margin=dict(b=40, l=40, r=150, t=80),
            annotations=[
                dict(
                    text="Hover over nodes for details. Click legend items to show/hide categories.",
                    showarrow=False,
                    xref="paper", yref="paper",
                    x=0.005, y=-0.002,
                    xanchor='left', yanchor='bottom',
                    font=dict(color="gray", size=10)
                )
            ],
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            plot_bgcolor='white',
            paper_bgcolor='white',
            height=700
        )
    
    def _create_empty_figure(self, message: str = "No data to display") -> go.Figure:
        """Create an empty figure with a message."""
        fig = go.Figure()
        fig.add_annotation(
            text=message,
            xref="paper", yref="paper",
            x=0.5, y=0.5,
            showarrow=False,
            font=dict(size=16, color="gray")
        )
        fig.update_layout(
            xaxis=dict(visible=False),
            yaxis=dict(visible=False),
            plot_bgcolor='white'
        )
        return fig
    
    def create_country_comparison(self, comparison_data: Dict) -> go.Figure:
        """Create a country comparison visualization."""
        logger.info("Creating country comparison visualization")
        
        # Create subplots for different metrics
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=('Vehicle Counts by Country', 'Organization Types', 
                          'Technology Timeline', 'Asset Types Distribution'),
            specs=[[{"type": "bar"}, {"type": "pie"}],
                   [{"type": "scatter"}, {"type": "bar"}]]
        )
        
        # Vehicle counts by country
        countries = list(comparison_data.get('countries', {}).keys())
        vehicle_counts = [comparison_data['countries'][country].get('vehicle_count', 0) for country in countries]
        
        colors = [self.country_colors.get(country, '#888888') for country in countries]
        
        fig.add_trace(
            go.Bar(x=countries, y=vehicle_counts, name='Vehicles', marker_color=colors),
            row=1, col=1
        )
        
        # Organization types pie chart
        org_types = comparison_data.get('organization_types', {})
        if org_types:
            fig.add_trace(
                go.Pie(labels=list(org_types.keys()), values=list(org_types.values()), name='Organizations'),
                row=1, col=2
            )
        
        # Technology timeline
        timeline_data = comparison_data.get('timeline', {})
        for country in countries:
            if country in timeline_data:
                years = list(timeline_data[country].keys())
                counts = list(timeline_data[country].values())
                fig.add_trace(
                    go.Scatter(
                        x=years, y=counts, 
                        mode='lines+markers', 
                        name=f'{country} Timeline',
                        line=dict(color=self.country_colors.get(country, '#888888'))
                    ),
                    row=2, col=1
                )
        
        # Asset types distribution
        asset_types = comparison_data.get('asset_types', {})
        if asset_types:
            fig.add_trace(
                go.Bar(
                    x=list(asset_types.keys()), 
                    y=list(asset_types.values()), 
                    name='Asset Types',
                    marker_color='lightblue'
                ),
                row=2, col=2
            )
        
        # Update layout
        fig.update_layout(
            title_text="Military Capabilities Comparison",
            showlegend=True,
            height=800
        )
        
        return fig
    
    def create_dashboard(self, report_data: Dict) -> go.Figure:
        """Create a comprehensive dashboard visualization."""
        logger.info("Creating comprehensive dashboard")
        
        # Create a dashboard with multiple subplots
        fig = make_subplots(
            rows=3, cols=2,
            subplot_titles=(
                'Entity Distribution', 'Country Asset Comparison',
                'Technology Evolution', 'Relationship Density',
                'Manufacturer Analysis', 'Database Coverage'
            ),
            specs=[
                [{"type": "pie"}, {"type": "bar"}],
                [{"type": "scatter"}, {"type": "heatmap"}],
                [{"type": "bar"}, {"type": "bar"}]
            ]
        )
        
        # Entity distribution pie chart
        entity_counts = report_data.get('entity_counts', {})
        if entity_counts:
            fig.add_trace(
                go.Pie(
                    labels=[k.replace('_', ' ').title() for k in entity_counts.keys()],
                    values=list(entity_counts.values()),
                    name="Entity Distribution"
                ),
                row=1, col=1
            )
        
        # Country asset comparison
        country_data = report_data.get('country_comparison', {})
        if country_data:
            countries = list(country_data.keys())
            asset_counts = [country_data[country].get('total_assets', 0) for country in countries]
            colors = [self.country_colors.get(country, '#888888') for country in countries]
            
            fig.add_trace(
                go.Bar(x=countries, y=asset_counts, name='Total Assets', marker_color=colors),
                row=1, col=2
            )
        
        # Technology evolution timeline
        timeline = report_data.get('technology_timeline', {})
        for country, data in timeline.items():
            if data:
                years = sorted(data.keys())
                counts = [data[year] for year in years]
                fig.add_trace(
                    go.Scatter(
                        x=years, y=counts, 
                        mode='lines+markers', 
                        name=f'{country}',
                        line=dict(color=self.country_colors.get(country, '#888888'))
                    ),
                    row=2, col=1
                )
        
        # Relationship density heatmap
        relationship_matrix = report_data.get('relationship_matrix', {})
        if relationship_matrix:
            entities = list(relationship_matrix.keys())
            matrix_data = [[relationship_matrix[e1].get(e2, 0) for e2 in entities] for e1 in entities]
            
            fig.add_trace(
                go.Heatmap(
                    z=matrix_data,
                    x=[e.replace('_', ' ').title() for e in entities],
                    y=[e.replace('_', ' ').title() for e in entities],
                    colorscale='Blues',
                    showscale=True
                ),
                row=2, col=2
            )
        
        # Manufacturer analysis
        manufacturers = report_data.get('top_manufacturers', {})
        if manufacturers:
            fig.add_trace(
                go.Bar(
                    x=list(manufacturers.keys()),
                    y=list(manufacturers.values()),
                    name='Top Manufacturers',
                    marker_color='lightgreen'
                ),
                row=3, col=1
            )
        
        # Database coverage
        db_coverage = report_data.get('database_coverage', {})
        if db_coverage:
            fig.add_trace(
                go.Bar(
                    x=list(db_coverage.keys()),
                    y=list(db_coverage.values()),
                    name='Database Coverage',
                    marker_color='orange'
                ),
                row=3, col=2
            )
        
        # Update layout
        fig.update_layout(
            title_text="Military Database Analysis Dashboard",
            showlegend=True,
            height=1200
        )
        
        return fig
    
    def create_timeline_visualization(self, timeline_data: Dict) -> go.Figure:
        """Create a timeline visualization showing technology development."""
        fig = go.Figure()
        
        for country, data in timeline_data.items():
            if data:
                years = sorted(data.keys())
                counts = [data[year] for year in years]
                
                fig.add_trace(go.Scatter(
                    x=years,
                    y=counts,
                    mode='lines+markers',
                    name=country,
                    line=dict(color=self.country_colors.get(country, '#888888'), width=3),
                    marker=dict(size=8)
                ))
        
        fig.update_layout(
            title="Military Technology Development Timeline",
            xaxis_title="Year",
            yaxis_title="Number of New Systems",
            hovermode='x unified',
            height=500
        )
        
        return fig
    
    def create_sankey_diagram(self, flow_data: Dict) -> go.Figure:
        """Create a Sankey diagram showing relationships between entity types."""
        # Prepare data for Sankey diagram
        labels = []
        sources = []
        targets = []
        values = []
        
        # Create node labels
        entity_types = set()
        for source_type, connections in flow_data.items():
            entity_types.add(source_type)
            for target_type in connections.keys():
                entity_types.add(target_type)
        
        labels = list(entity_types)
        label_map = {label: i for i, label in enumerate(labels)}
        
        # Create flows
        for source_type, connections in flow_data.items():
            for target_type, count in connections.items():
                if count > 0:
                    sources.append(label_map[source_type])
                    targets.append(label_map[target_type])
                    values.append(count)
        
        fig = go.Figure(data=[go.Sankey(
            node=dict(
                pad=15,
                thickness=20,
                line=dict(color="black", width=0.5),
                label=[label.replace('_', ' ').title() for label in labels],
                color="blue"
            ),
            link=dict(
                source=sources,
                target=targets,
                value=values
            )
        )])
        
        fig.update_layout(title_text="Entity Relationship Flow", font_size=10)
        return fig
    
    def create_geographic_map(self, geographic_data: Dict) -> go.Figure:
        """Create a geographic visualization of military assets."""
        fig = go.Figure()
        
        # Add country centers (approximate)
        country_coords = {
            'UK': {'lat': 54.7, 'lon': -2.5},
            'USA': {'lat': 39.8, 'lon': -98.6},
            'Russia': {'lat': 60.0, 'lon': 100.0},
            'China': {'lat': 35.0, 'lon': 105.0}
        }
        
        for country, data in geographic_data.items():
            if country in country_coords:
                coords = country_coords[country]
                asset_count = data.get('total_assets', 0)
                
                fig.add_trace(go.Scattergeo(
                    lon=[coords['lon']],
                    lat=[coords['lat']],
                    text=f"{country}<br>Assets: {asset_count}",
                    mode='markers',
                    marker=dict(
                        size=max(10, asset_count / 10),
                        color=self.country_colors.get(country, '#888888'),
                        line=dict(width=2, color='white')
                    ),
                    name=country
                ))
        
        fig.update_layout(
            title_text="Global Military Asset Distribution",
            geo=dict(
                showframe=False,
                showcoastlines=True,
                projection_type='equirectangular'
            ),
            height=500
        )
        
        return fig
    
    def create_network_metrics_chart(self, metrics: Dict) -> go.Figure:
        """Create a chart showing network analysis metrics."""
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=('Centrality Measures', 'Connectivity Metrics', 
                          'Node Degree Distribution', 'Component Analysis'),
            specs=[[{"type": "bar"}, {"type": "bar"}],
                   [{"type": "histogram"}, {"type": "pie"}]]
        )
        
        # Centrality measures
        centrality_data = metrics.get('centrality', {})
        if centrality_data:
            nodes = list(centrality_data.keys())[:10]  # Top 10
            values = list(centrality_data.values())[:10]
            
            fig.add_trace(
                go.Bar(x=nodes, y=values, name='Degree Centrality'),
                row=1, col=1
            )
        
        # Connectivity metrics
        connectivity = metrics.get('connectivity', {})
        if connectivity:
            metric_names = list(connectivity.keys())
            metric_values = list(connectivity.values())
            
            fig.add_trace(
                go.Bar(x=metric_names, y=metric_values, name='Metrics'),
                row=1, col=2
            )
        
        # Node degree distribution
        degree_dist = metrics.get('degree_distribution', {})
        if degree_dist:
            degrees = list(degree_dist.keys())
            counts = list(degree_dist.values())
            
            fig.add_trace(
                go.Histogram(x=degrees, y=counts, name='Degree Distribution'),
                row=2, col=1
            )
        
        # Component analysis
        components = metrics.get('components', {})
        if components:
            fig.add_trace(
                go.Pie(labels=list(components.keys()), values=list(components.values()), name='Components'),
                row=2, col=2
            )
        
        fig.update_layout(title_text="Network Analysis Metrics", height=800)
        return fig