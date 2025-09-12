#!/usr/bin/env python3
"""
Test script for ML notebooks
Validates that notebooks can be executed without errors
"""

import os
import sys
import nbformat
from nbconvert.preprocessors import ExecutePreprocessor
import pytest


def find_notebooks():
    """Find all Jupyter notebook files in the current directory"""
    notebooks = []
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.ipynb'):
                notebooks.append(os.path.join(root, file))
    return notebooks


def test_notebook_execution(notebook_path):
    """Test that a notebook can be executed without errors"""
    print(f"Testing notebook: {notebook_path}")
    
    with open(notebook_path, 'r', encoding='utf-8') as f:
        nb = nbformat.read(f, as_version=4)
    
    # Configure executor
    ep = ExecutePreprocessor(timeout=600, kernel_name='python3')
    
    try:
        # Execute the notebook
        ep.preprocess(nb, {'metadata': {'path': os.path.dirname(notebook_path)}})
        print(f"✅ {notebook_path} executed successfully")
        return True
    except Exception as e:
        print(f"❌ {notebook_path} failed to execute: {str(e)}")
        return False


def test_all_notebooks():
    """Test all notebooks in the directory"""
    notebooks = find_notebooks()
    
    if not notebooks:
        print("No notebooks found to test")
        return True
    
    results = []
    for notebook in notebooks:
        result = test_notebook_execution(notebook)
        results.append(result)
    
    success_count = sum(results)
    total_count = len(results)
    
    print(f"\n📊 Test Results: {success_count}/{total_count} notebooks passed")
    
    if success_count == total_count:
        print("🎉 All notebook tests passed!")
        return True
    else:
        print("❌ Some notebook tests failed")
        return False


if __name__ == "__main__":
    success = test_all_notebooks()
    sys.exit(0 if success else 1)
