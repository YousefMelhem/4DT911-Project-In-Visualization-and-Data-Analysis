# Test configuration file for pytest
import os
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Test configuration
pytest_plugins = [
    "pytest_cov",  # Coverage plugin
    "pytest_mock", # Mocking plugin
    "pytest_asyncio", # Async testing
]

# Test markers
markers = [
    "unit: Unit tests",
    "integration: Integration tests", 
    "slow: Slow running tests",
    "notebook: Jupyter notebook tests",
    "frontend: Vue.js frontend tests",
    "backend: Backend/API tests",
    "data: Data validation tests",
]

# Coverage configuration
coverage_config = {
    "source": [".", "medpix-explorer/src", "Ml-Notebook"],
    "omit": [
        "*/tests/*",
        "*/test_*",
        "*/__pycache__/*",
        "*/node_modules/*",
        "*/venv/*",
        "*/.git/*"
    ],
    "report": {
        "exclude_lines": [
            "pragma: no cover",
            "def __repr__",
            "raise AssertionError",
            "raise NotImplementedError",
        ]
    }
}
