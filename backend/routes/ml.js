import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import Joi from 'joi';

const router = express.Router();

// Path to ML outputs directory
const ML_OUTPUTS_PATH = path.join(process.cwd(), '../Ml-Notebook/outputs');

// Validation schemas
const similaritySchema = Joi.object({
  id: Joi.string().required(),
  limit: Joi.number().integer().min(1).max(50).default(10),
  threshold: Joi.number().min(0).max(1).default(0.7)
});

const clusterSchema = Joi.object({
  clusterId: Joi.string().required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Helper function to load ML model outputs
async function loadMLData(filename) {
  try {
    const filePath = path.join(ML_OUTPUTS_PATH, filename);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ML data from ${filename}:`, error);
    return null;
  }
}

// Helper function to check if ML outputs exist
async function checkMLOutputsExist() {
  try {
    await fs.access(ML_OUTPUTS_PATH);
    return true;
  } catch {
    return false;
  }
}

// GET /api/ml/clusters - Get all available clusters
router.get('/clusters', async (req, res) => {
  try {
    const outputsExist = await checkMLOutputsExist();
    if (!outputsExist) {
      return res.json({
        clusters: [],
        message: 'No ML clustering results available yet. Run weekly notebooks to generate clusters.',
        status: 'pending'
      });
    }

    // Try to load cluster data from latest week
    const clusterData = await loadMLData('latest/clusters.json');
    
    if (!clusterData) {
      return res.json({
        clusters: [],
        message: 'Cluster data not found. Process notebooks to generate clustering results.',
        status: 'pending'
      });
    }

    // Transform cluster data for API response
    const clusters = Object.entries(clusterData.clusters || {}).map(([clusterId, cases]) => ({
      id: clusterId,
      name: `Cluster ${clusterId}`,
      caseCount: cases.length,
      description: clusterData.descriptions?.[clusterId] || `Medical cases grouped by similarity`,
      centroid: clusterData.centroids?.[clusterId] || null,
      topTerms: clusterData.topTerms?.[clusterId] || []
    }));

    res.json({
      clusters,
      totalClusters: clusters.length,
      generatedAt: clusterData.timestamp || new Date().toISOString(),
      algorithm: clusterData.algorithm || 'K-Means',
      status: 'available'
    });

  } catch (error) {
    console.error('Error fetching clusters:', error);
    res.status(500).json({
      error: 'Failed to fetch clusters',
      message: error.message
    });
  }
});

// GET /api/ml/clusters/:clusterId - Get cases in a specific cluster
router.get('/clusters/:clusterId', async (req, res) => {
  try {
    const { error, value } = clusterSchema.validate({
      ...req.params,
      ...req.query
    });
    
    if (error) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: error.details[0].message
      });
    }

    const { clusterId, page, limit } = value;

    const clusterData = await loadMLData('latest/clusters.json');
    if (!clusterData || !clusterData.clusters[clusterId]) {
      return res.status(404).json({
        error: 'Cluster not found',
        message: `Cluster ${clusterId} does not exist`
      });
    }

    const clusterCases = clusterData.clusters[clusterId];
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCases = clusterCases.slice(startIndex, endIndex);

    res.json({
      cluster: {
        id: clusterId,
        name: `Cluster ${clusterId}`,
        description: clusterData.descriptions?.[clusterId] || `Medical cases cluster ${clusterId}`,
        totalCases: clusterCases.length,
        centroid: clusterData.centroids?.[clusterId] || null,
        topTerms: clusterData.topTerms?.[clusterId] || []
      },
      cases: paginatedCases,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(clusterCases.length / limit),
        totalCases: clusterCases.length,
        casesPerPage: limit,
        hasNextPage: endIndex < clusterCases.length,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching cluster cases:', error);
    res.status(500).json({
      error: 'Failed to fetch cluster cases',
      message: error.message
    });
  }
});

// GET /api/ml/similar/:id - Find similar cases to a given case
router.get('/similar/:id', async (req, res) => {
  try {
    const { error, value } = similaritySchema.validate({
      ...req.params,
      ...req.query
    });
    
    if (error) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: error.details[0].message
      });
    }

    const { id, limit, threshold } = value;

    const similarityData = await loadMLData('latest/similarity_matrix.json');
    if (!similarityData) {
      return res.json({
        targetCase: id,
        similarCases: [],
        message: 'Similarity data not available. Run similarity analysis notebooks.',
        status: 'pending'
      });
    }

    // Find similar cases for the given ID
    const similarities = similarityData.similarities?.[id] || [];
    
    // Filter by threshold and limit results
    const filteredSimilarities = similarities
      .filter(sim => sim.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    res.json({
      targetCase: id,
      similarCases: filteredSimilarities,
      threshold,
      algorithm: similarityData.algorithm || 'Cosine Similarity',
      generatedAt: similarityData.timestamp || new Date().toISOString(),
      status: 'available'
    });

  } catch (error) {
    console.error('Error finding similar cases:', error);
    res.status(500).json({
      error: 'Failed to find similar cases',
      message: error.message
    });
  }
});

// GET /api/ml/features/:id - Get extracted features for a case
router.get('/features/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const featuresData = await loadMLData('latest/features.json');
    if (!featuresData || !featuresData.features[id]) {
      return res.status(404).json({
        error: 'Features not found',
        message: `Features for case ${id} not available. Run feature extraction notebooks.`
      });
    }

    const caseFeatures = featuresData.features[id];

    res.json({
      caseId: id,
      features: {
        textFeatures: caseFeatures.textFeatures || null,
        imageFeatures: caseFeatures.imageFeatures || null,
        medicalTerms: caseFeatures.medicalTerms || [],
        categories: caseFeatures.categories || [],
        embeddings: caseFeatures.embeddings || null
      },
      extractedAt: caseFeatures.timestamp || new Date().toISOString(),
      methods: featuresData.methods || {}
    });

  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({
      error: 'Failed to fetch features',
      message: error.message
    });
  }
});

// GET /api/ml/status - Get ML processing status
router.get('/status', async (req, res) => {
  try {
    const outputsExist = await checkMLOutputsExist();
    
    if (!outputsExist) {
      return res.json({
        status: 'not_started',
        message: 'No ML processing outputs found',
        availableFeatures: [],
        lastProcessed: null
      });
    }

    // Check which ML outputs are available
    const features = [];
    const checks = [
      { name: 'clusters', file: 'latest/clusters.json', description: 'Case clustering analysis' },
      { name: 'similarity', file: 'latest/similarity_matrix.json', description: 'Case similarity analysis' },
      { name: 'features', file: 'latest/features.json', description: 'Feature extraction' },
      { name: 'statistics', file: 'latest/ml_stats.json', description: 'ML processing statistics' }
    ];

    for (const check of checks) {
      const data = await loadMLData(check.file);
      if (data) {
        features.push({
          name: check.name,
          description: check.description,
          available: true,
          lastUpdated: data.timestamp || null
        });
      } else {
        features.push({
          name: check.name,
          description: check.description,
          available: false,
          lastUpdated: null
        });
      }
    }

    const availableCount = features.filter(f => f.available).length;
    const status = availableCount === 0 ? 'not_started' : 
                  availableCount < features.length ? 'partial' : 'complete';

    res.json({
      status,
      message: `${availableCount}/${features.length} ML features available`,
      availableFeatures: features,
      lastProcessed: features
        .filter(f => f.lastUpdated)
        .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))[0]?.lastUpdated || null
    });

  } catch (error) {
    console.error('Error checking ML status:', error);
    res.status(500).json({
      error: 'Failed to check ML status',
      message: error.message
    });
  }
});

export default router;
