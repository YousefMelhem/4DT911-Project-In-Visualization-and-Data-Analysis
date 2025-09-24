import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import Joi from 'joi';

const router = express.Router();

// Path to ML outputs directory
const ML_OUTPUTS_PATH = path.join(process.cwd(), '../Ml-Notebook/outputs');
// Path to refined cases data
const REFINED_CASES_PATH = path.join(process.cwd(), 'data/refined_cases.json');

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

const kmeansSchema = Joi.object({
  k: Joi.number().integer().min(2).max(20).default(3),
  features: Joi.array().items(Joi.string().valid(
    'body_system', 'imaging_modality', 'complexity_score', 
    'title_length', 'has_multiple_images'
  )).min(1).default(['body_system', 'imaging_modality']),
  max_cases: Joi.number().integer().min(100).max(5000).default(1000)
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

// POST /api/ml/kmeans - Perform K-means clustering on refined cases
router.post('/kmeans', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = kmeansSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Invalid clustering parameters',
        details: error.details[0].message
      });
    }

    const { k, features, max_cases } = value;

    // Load refined cases data
    let casesData = await loadRefinedCasesData();

    // Limit cases for performance
    if (casesData.length > max_cases) {
      casesData = casesData.slice(0, max_cases);
    }

    // Simple feature encoding for clustering
    const encodedData = casesData.map((case_, index) => {
      const encoded = { case_id: case_.case_id, original_index: index };
      
      features.forEach(feature => {
        switch (feature) {
          case 'body_system':
            // One-hot encoding for body systems
            const systems = ['Neurological', 'Cardiovascular', 'Respiratory', 'Abdominal', 'Musculoskeletal', 'Reproductive', 'Other'];
            systems.forEach(system => {
              encoded[`body_system_${system}`] = case_.body_system === system ? 1 : 0;
            });
            break;
          
          case 'imaging_modality':
            // One-hot encoding for imaging modalities
            const modalities = ['CT', 'MRI', 'X-Ray', 'Ultrasound', 'Nuclear Medicine', 'Mammography', 'Other'];
            modalities.forEach(modality => {
              encoded[`imaging_modality_${modality}`] = case_.imaging_modality === modality ? 1 : 0;
            });
            break;
          
          case 'complexity_score':
            encoded.complexity_score = case_.complexity_score || 0;
            break;
          
          case 'title_length':
            encoded.title_length = (case_.title_length || 0) / 1000; // Normalize
            break;
          
          case 'has_multiple_images':
            encoded.has_multiple_images = case_.has_multiple_images ? 1 : 0;
            break;
        }
      });
      
      return encoded;
    });

    // Simple K-means implementation (basic centroid-based clustering)
    const clusters = performSimpleKMeans(encodedData, k);

    // Add cluster assignments back to original data
    const clusteredCases = casesData.map((case_, index) => ({
      ...case_,
      cluster_id: clusters.assignments[index],
      cluster_distance: clusters.distances[index]
    }));

    // Generate cluster statistics
    const clusterStats = Array.from({ length: k }, (_, clusterId) => {
      const clusterCases = clusteredCases.filter(c => c.cluster_id === clusterId);
      return {
        cluster_id: clusterId,
        size: clusterCases.length,
        avg_complexity: clusterCases.reduce((sum, c) => sum + c.complexity_score, 0) / clusterCases.length,
        dominant_body_system: getMostCommon(clusterCases.map(c => c.body_system)),
        dominant_imaging: getMostCommon(clusterCases.map(c => c.imaging_modality)),
        multi_image_percentage: (clusterCases.filter(c => c.has_multiple_images).length / clusterCases.length) * 100
      };
    });

    res.json({
      success: true,
      clustering_params: { k, features, cases_processed: casesData.length },
      clusters: clusterStats,
      cases: clusteredCases,
      centroids: clusters.centroids,
      inertia: clusters.inertia,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error performing K-means clustering:', error);
    res.status(500).json({
      error: 'Failed to perform K-means clustering',
      message: error.message
    });
  }
});

// Helper function for simple K-means clustering
function performSimpleKMeans(data, k, maxIterations = 100) {
  const featureKeys = Object.keys(data[0]).filter(key => 
    key !== 'case_id' && key !== 'original_index'
  );
  const numFeatures = featureKeys.length;
  
  // Initialize centroids randomly
  let centroids = Array.from({ length: k }, () => {
    const centroid = {};
    featureKeys.forEach(key => {
      const values = data.map(point => point[key]).filter(v => v !== undefined);
      centroid[key] = values[Math.floor(Math.random() * values.length)];
    });
    return centroid;
  });

  let assignments = new Array(data.length);
  let distances = new Array(data.length);
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let changed = false;
    
    // Assign points to closest centroid
    for (let i = 0; i < data.length; i++) {
      let minDistance = Infinity;
      let closestCentroid = 0;
      
      for (let j = 0; j < k; j++) {
        const distance = euclideanDistance(data[i], centroids[j], featureKeys);
        if (distance < minDistance) {
          minDistance = distance;
          closestCentroid = j;
        }
      }
      
      if (assignments[i] !== closestCentroid) {
        changed = true;
        assignments[i] = closestCentroid;
      }
      distances[i] = minDistance;
    }
    
    // Update centroids
    for (let j = 0; j < k; j++) {
      const clusterPoints = data.filter((_, i) => assignments[i] === j);
      if (clusterPoints.length > 0) {
        featureKeys.forEach(key => {
          const values = clusterPoints.map(point => point[key]).filter(v => v !== undefined);
          centroids[j][key] = values.reduce((sum, val) => sum + val, 0) / values.length;
        });
      }
    }
    
    if (!changed) break;
  }
  
  // Calculate inertia (within-cluster sum of squares)
  const inertia = distances.reduce((sum, dist) => sum + dist * dist, 0);
  
  return { assignments, distances, centroids, inertia };
}

// Helper function to calculate Euclidean distance
function euclideanDistance(point1, point2, featureKeys) {
  let sum = 0;
  featureKeys.forEach(key => {
    const val1 = point1[key] || 0;
    const val2 = point2[key] || 0;
    sum += Math.pow(val1 - val2, 2);
  });
  return Math.sqrt(sum);
}

// Helper function to get most common value
function getMostCommon(arr) {
  const counts = {};
  arr.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });
  return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
}

export default router;
