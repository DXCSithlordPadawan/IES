"""
IES4 Military Database Analysis Suite
A comprehensive Python application for analyzing military databases and generating interactive visualizations.

Author: DXCSithlordPadawan
Date: 2025-08-20
Version: 1.0.0
"""

from .database_loader import DatabaseLoader
from .graph_builder import GraphBuilder
from .visualization_engine import VisualizationEngine
from .filter_system import FilterSystem
from .statistics_generator import StatisticsGenerator
from .web_interface import launch_web_interface

__version__ = "1.0.0"
__author__ = "DXCSithlordPadawan"
__email__ = "your.email@example.com"

__all__ = [
    'DatabaseLoader',
    'GraphBuilder', 
    'VisualizationEngine',
    'FilterSystem',
    'StatisticsGenerator',
    'launch_web_interface'
]