import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';

const router = express.Router();

// Path to the refined cases data
const REFINED_CASES_PATH = path.join(process.cwd(), 'data/refined_cases.json');

// Helper function to load refined cases data
async function loadRefinedCasesData() {
  try {
    const data = await fs.readFile(REFINED_CASES_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading refined cases data:', error);
    throw new Error('Failed to load refined medical cases data');
  }
}

// GET /api/clustering/data - Get clean data for clustering (simplified endpoint)
router.get('/data', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    
    // Load refined cases data
    const refinedCases = await loadRefinedCasesData();
    
    // Take only the first 'limit' cases for now
    const limitedCases = refinedCases.slice(0, limit);
    
    // Generate basic statistics
    const stats = {
      total_available: refinedCases.length,
      returned: limitedCases.length,
      body_systems: [...new Set(refinedCases.map(c => c.body_system))].sort(),
      imaging_modalities: [...new Set(refinedCases.map(c => c.imaging_modality))].sort(),
      complexity_distribution: {
        Simple: refinedCases.filter(c => c.complexity_category === 'Simple').length,
        Moderate: refinedCases.filter(c => c.complexity_category === 'Moderate').length,
        Complex: refinedCases.filter(c => c.complexity_category === 'Complex').length
      },
      avg_complexity_score: refinedCases.reduce((sum, c) => sum + (c.complexity_score || 0), 0) / refinedCases.length,
      multi_image_cases: refinedCases.filter(c => c.has_multiple_images).length
    };

    res.json({
      success: true,
      data: limitedCases,
      stats,
      message: `Retrieved ${limitedCases.length} cases for clustering analysis`
    });

  } catch (error) {
    console.error('Error fetching clustering data:', error);
    res.status(500).json({
      error: 'Failed to fetch clustering data',
      message: error.message
    });
  }
});

// GET /api/clustering/stats - Get statistics only
router.get('/stats', async (req, res) => {
  try {
    // Load refined cases data
    const refinedCases = await loadRefinedCasesData();
    
    // Generate comprehensive statistics
    const stats = {
      total_cases: refinedCases.length,
      body_systems: [...new Set(refinedCases.map(c => c.body_system))].sort(),
      imaging_modalities: [...new Set(refinedCases.map(c => c.imaging_modality))].sort(),
      complexity_distribution: {
        Simple: refinedCases.filter(c => c.complexity_category === 'Simple').length,
        Moderate: refinedCases.filter(c => c.complexity_category === 'Moderate').length,
        Complex: refinedCases.filter(c => c.complexity_category === 'Complex').length
      },
      avg_complexity_score: Math.round((refinedCases.reduce((sum, c) => sum + (c.complexity_score || 0), 0) / refinedCases.length) * 100) / 100,
      multi_image_cases: refinedCases.filter(c => c.has_multiple_images).length,
      multi_image_percentage: Math.round((refinedCases.filter(c => c.has_multiple_images).length / refinedCases.length) * 10000) / 100,
      avg_title_length: Math.round(refinedCases.reduce((sum, c) => sum + (c.title_length || 0), 0) / refinedCases.length),
      features_for_clustering: [
        'body_system',
        'imaging_modality', 
        'complexity_score',
        'complexity_category',
        'title_length',
        'has_multiple_images'
      ]
    };

    res.json({
      success: true,
      stats,
      message: 'Dataset statistics for clustering analysis'
    });

  } catch (error) {
    console.error('Error fetching clustering stats:', error);
    res.status(500).json({
      error: 'Failed to fetch clustering statistics',
      message: error.message
    });
  }
});

// POST /api/clustering/kmeans - Perform K-means clustering
router.post('/kmeans', async (req, res) => {
  try {
    const { 
      n_clusters = 3, 
      features = ['complexity_score', 'body_system', 'has_multiple_images'],
      random_state = 42 
    } = req.body;

    // Validate parameters
    if (n_clusters < 2 || n_clusters > 20) {
      return res.status(400).json({
        error: 'Invalid number of clusters',
        message: 'Number of clusters must be between 2 and 20'
      });
    }

    const validFeatures = [
      'body_system', 'imaging_modality', 'complexity_score', 
      'complexity_category', 'title_length', 'has_multiple_images'
    ];
    
    const invalidFeatures = features.filter(f => !validFeatures.includes(f));
    if (invalidFeatures.length > 0) {
      return res.status(400).json({
        error: 'Invalid features',
        message: `Invalid features: ${invalidFeatures.join(', ')}. Valid features: ${validFeatures.join(', ')}`
      });
    }

    // Path to Python script and data
    const pythonScript = path.join(process.cwd(), 'scripts/kmeans_clustering.py');
    const pythonPath = '/home/yousef/code/school/4DT911-project/Ml-Notebook/venv/bin/python';
    
    // Prepare arguments for Python script
    const args = [
      pythonScript,
      '--data_path', REFINED_CASES_PATH,
      '--n_clusters', n_clusters.toString(),
      '--random_state', random_state.toString(),
      '--features', ...features
    ];

    // Execute Python script
    const pythonProcess = spawn(pythonPath, args);
    
    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', errorOutput);
        return res.status(500).json({
          error: 'Clustering computation failed',
          message: errorOutput || 'Unknown error occurred during clustering'
        });
      }

      try {
        const result = JSON.parse(output);
        res.json(result);
      } catch (parseError) {
        console.error('Failed to parse Python output:', parseError);
        console.error('Raw output:', output);
        res.status(500).json({
          error: 'Failed to parse clustering results',
          message: 'Invalid JSON response from clustering script'
        });
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      res.status(500).json({
        error: 'Failed to start clustering process',
        message: error.message
      });
    });

  } catch (error) {
    console.error('Error in K-means clustering:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;