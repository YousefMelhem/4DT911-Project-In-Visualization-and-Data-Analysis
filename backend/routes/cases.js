import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import Joi from 'joi';

const router = express.Router();

// Path to the Cases.json file
const CASES_FILE_PATH = path.join(process.cwd(), '../data/archive/Cases.json');
// Path to the refined cases data
const REFINED_CASES_PATH = path.join(process.cwd(), 'data/refined_cases.json');

// Validation schemas
const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().allow('').max(100),
  sortBy: Joi.string().valid('url', 'folder', 'imageCount').default('folder'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
});

const caseIdSchema = Joi.object({
  id: Joi.string().required()
});

// Helper function to load cases data
async function loadCasesData() {
  try {
    const data = await fs.readFile(CASES_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading cases data:', error);
    throw new Error('Failed to load medical cases data');
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

// Helper function to extract case ID from folder path
function extractCaseId(caseFolder) {
  // Handle undefined or null case folders
  if (!caseFolder || typeof caseFolder !== 'string') {
    return null;
  }
  // Extract case ID from path like "medpix_data_final\\case_8892378009084536600"
  const match = caseFolder.match(/case_([^\\\\\/]+)$/);
  return match ? match[1] : null;
}

// Helper function to filter and search cases
function filterCases(cases, searchTerm) {
  if (!searchTerm) return cases;
  
  const lowerSearch = searchTerm.toLowerCase();
  return cases.filter(medCase => {
    const caseId = extractCaseId(medCase['Case Folder']);
    const url = medCase.URL.toLowerCase();
    return caseId?.includes(lowerSearch) || url.includes(lowerSearch);
  });
}

// Helper function to sort cases
function sortCases(cases, sortBy, sortOrder) {
  return cases.sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'url':
        aValue = a.URL;
        bValue = b.URL;
        break;
      case 'folder':
        aValue = a['Case Folder'];
        bValue = b['Case Folder'];
        break;
      case 'imageCount':
        aValue = a['Image Paths'].length;
        bValue = b['Image Paths'].length;
        break;
      default:
        aValue = a['Case Folder'];
        bValue = b['Case Folder'];
    }
    
    if (sortOrder === 'desc') {
      return aValue < bValue ? 1 : -1;
    }
    return aValue > bValue ? 1 : -1;
  });
}

// GET /api/cases - Get all cases with pagination and filtering
router.get('/', async (req, res) => {
  try {
    // Validate query parameters
    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.details[0].message
      });
    }
    
    const { page, limit, search, sortBy, sortOrder } = value;
    
    // Load cases data
    const allCases = await loadCasesData();
    
    // Filter cases based on search
    const filteredCases = filterCases(allCases, search);
    
    // Sort cases
    const sortedCases = sortCases(filteredCases, sortBy, sortOrder);
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCases = sortedCases.slice(startIndex, endIndex);
    
    // Transform data for frontend
    const transformedCases = paginatedCases.map((medCase, index) => ({
      id: extractCaseId(medCase['Case Folder']),
      caseNumber: startIndex + index + 1,
      url: medCase.URL,
      caseFolder: medCase['Case Folder'],
      imageCount: medCase['Image Paths'].length,
      imagePaths: medCase['Image Paths'],
      // Add preview image (first image)
      previewImage: medCase['Image Paths'][0] || null
    }));
    
    // Response with pagination info
    res.json({
      cases: transformedCases,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredCases.length / limit),
        totalCases: filteredCases.length,
        casesPerPage: limit,
        hasNextPage: endIndex < filteredCases.length,
        hasPrevPage: page > 1
      },
      filters: {
        search: search || null,
        sortBy,
        sortOrder
      }
    });
    
  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({
      error: 'Failed to fetch medical cases',
      message: error.message
    });
  }
});

// GET /api/cases/:id - Get specific case by ID
router.get('/:id', async (req, res) => {
  try {
    // Validate case ID
    const { error, value } = caseIdSchema.validate(req.params);
    if (error) {
      return res.status(400).json({
        error: 'Invalid case ID',
        details: error.details[0].message
      });
    }
    
    const { id } = value;
    
    // Load cases data
    const allCases = await loadCasesData();
    
    // Find the specific case
    const medCase = allCases.find(c => {
      const caseId = extractCaseId(c['Case Folder']);
      return caseId === id;
    });
    
    if (!medCase) {
      return res.status(404).json({
        error: 'Case not found',
        message: `Medical case with ID ${id} does not exist`
      });
    }
    
    // Transform detailed case data
    const detailedCase = {
      id: extractCaseId(medCase['Case Folder']),
      url: medCase.URL,
      caseFolder: medCase['Case Folder'],
      imageCount: medCase['Image Paths'].length,
      imagePaths: medCase['Image Paths'],
      images: medCase['Image Paths'].map((imagePath, index) => ({
        id: index + 1,
        path: imagePath,
        filename: path.basename(imagePath),
        extension: path.extname(imagePath)
      }))
    };
    
    res.json({
      case: detailedCase
    });
    
  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({
      error: 'Failed to fetch medical case',
      message: error.message
    });
  }
});

// GET /api/cases/:id/images - Get all images for a specific case
router.get('/:id/images', async (req, res) => {
  try {
    const { error, value } = caseIdSchema.validate(req.params);
    if (error) {
      return res.status(400).json({
        error: 'Invalid case ID',
        details: error.details[0].message
      });
    }
    
    const { id } = value;
    
    // Load cases data
    const allCases = await loadCasesData();
    
    // Find the specific case
    const medCase = allCases.find(c => {
      const caseId = extractCaseId(c['Case Folder']);
      return caseId === id;
    });
    
    if (!medCase) {
      return res.status(404).json({
        error: 'Case not found',
        message: `Medical case with ID ${id} does not exist`
      });
    }
    
    // Return images with metadata
    const images = medCase['Image Paths'].map((imagePath, index) => ({
      id: index + 1,
      path: imagePath,
      filename: path.basename(imagePath),
      extension: path.extname(imagePath),
      size: null, // Could be populated by checking actual file
      url: `/api/cases/${id}/images/${index + 1}` // Future endpoint for serving actual images
    }));
    
    res.json({
      caseId: id,
      imageCount: images.length,
      images
    });
    
  } catch (error) {
    console.error('Error fetching case images:', error);
    res.status(500).json({
      error: 'Failed to fetch case images',
      message: error.message
    });
  }
});

// GET /api/cases/refined - Get refined cases data optimized for clustering
router.get('/refined', async (req, res) => {
  try {
    // Validate query parameters for optional filtering
    const querySchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(1000).default(1000), // Higher limit for ML processing
      body_system: Joi.string().allow(''),
      imaging_modality: Joi.string().allow(''),
      complexity_category: Joi.string().valid('Simple', 'Moderate', 'Complex').allow('')
    });

    const { error, value } = querySchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.details[0].message
      });
    }

    const { page, limit, body_system, imaging_modality, complexity_category } = value;

    // Load refined cases data
    let refinedCases = await loadRefinedCasesData();

    // Apply filters if provided
    if (body_system) {
      refinedCases = refinedCases.filter(case_ => 
        case_.body_system?.toLowerCase().includes(body_system.toLowerCase())
      );
    }

    if (imaging_modality) {
      refinedCases = refinedCases.filter(case_ => 
        case_.imaging_modality?.toLowerCase().includes(imaging_modality.toLowerCase())
      );
    }

    if (complexity_category) {
      refinedCases = refinedCases.filter(case_ => 
        case_.complexity_category === complexity_category
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCases = refinedCases.slice(startIndex, endIndex);

    // Generate summary statistics
    const stats = {
      total_cases: refinedCases.length,
      body_systems: [...new Set(refinedCases.map(c => c.body_system))].sort(),
      imaging_modalities: [...new Set(refinedCases.map(c => c.imaging_modality))].sort(),
      complexity_distribution: {
        Simple: refinedCases.filter(c => c.complexity_category === 'Simple').length,
        Moderate: refinedCases.filter(c => c.complexity_category === 'Moderate').length,
        Complex: refinedCases.filter(c => c.complexity_category === 'Complex').length
      },
      avg_complexity_score: refinedCases.reduce((sum, c) => sum + c.complexity_score, 0) / refinedCases.length,
      multi_image_cases: refinedCases.filter(c => c.has_multiple_images).length
    };

    res.json({
      success: true,
      data: paginatedCases,
      pagination: {
        page,
        limit,
        total: refinedCases.length,
        pages: Math.ceil(refinedCases.length / limit)
      },
      stats,
      message: `Retrieved ${paginatedCases.length} refined medical cases`
    });

  } catch (error) {
    console.error('Error fetching refined cases:', error);
    res.status(500).json({
      error: 'Failed to fetch refined cases',
      message: error.message
    });
  }
});

export default router;
