import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// Path to the Cases.json file
const CASES_FILE_PATH = path.join(process.cwd(), '../data/archive/Cases.json');

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

// Helper function to extract case ID from folder path
function extractCaseId(caseFolder) {
  const match = caseFolder.match(/case_([^\\\\\/]+)$/);
  return match ? match[1] : null;
}

// GET /api/stats - Get overall dataset statistics
router.get('/', async (req, res) => {
  try {
    const allCases = await loadCasesData();
    
    // Calculate basic statistics
    const totalCases = allCases.length;
    const totalImages = allCases.reduce((sum, medCase) => sum + medCase['Image Paths'].length, 0);
    
    // Image count distribution
    const imageCountDistribution = {};
    const imageCounts = allCases.map(medCase => medCase['Image Paths'].length);
    
    imageCounts.forEach(count => {
      imageCountDistribution[count] = (imageCountDistribution[count] || 0) + 1;
    });
    
    // Calculate statistics
    const minImages = Math.min(...imageCounts);
    const maxImages = Math.max(...imageCounts);
    const avgImages = Math.round((totalImages / totalCases) * 100) / 100;
    
    // Image format analysis
    const formatCounts = {};
    allCases.forEach(medCase => {
      medCase['Image Paths'].forEach(imagePath => {
        const extension = path.extname(imagePath).toLowerCase();
        formatCounts[extension] = (formatCounts[extension] || 0) + 1;
      });
    });
    
    // Cases with different image counts
    const casesWithManyImages = allCases.filter(c => c['Image Paths'].length > 10).length;
    const casesWithFewImages = allCases.filter(c => c['Image Paths'].length <= 5).length;
    
    const stats = {
      overview: {
        totalCases,
        totalImages,
        averageImagesPerCase: avgImages,
        minImagesPerCase: minImages,
        maxImagesPerCase: maxImages
      },
      distribution: {
        imageCountDistribution,
        casesWithManyImages: {
          count: casesWithManyImages,
          percentage: Math.round((casesWithManyImages / totalCases) * 100)
        },
        casesWithFewImages: {
          count: casesWithFewImages,
          percentage: Math.round((casesWithFewImages / totalCases) * 100)
        }
      },
      formats: {
        imageFormats: formatCounts,
        mostCommonFormat: Object.keys(formatCounts).reduce((a, b) => 
          formatCounts[a] > formatCounts[b] ? a : b, Object.keys(formatCounts)[0]
        )
      },
      dataQuality: {
        casesWithImages: allCases.filter(c => c['Image Paths'].length > 0).length,
        casesWithoutImages: allCases.filter(c => c['Image Paths'].length === 0).length,
        validUrls: allCases.filter(c => c.URL && c.URL.startsWith('http')).length
      }
    };
    
    res.json(stats);
    
  } catch (error) {
    console.error('Error calculating stats:', error);
    res.status(500).json({
      error: 'Failed to calculate statistics',
      message: error.message
    });
  }
});

// GET /api/stats/images - Get detailed image statistics
router.get('/images', async (req, res) => {
  try {
    const allCases = await loadCasesData();
    
    // Analyze image patterns
    const imageAnalysis = {
      totalImages: 0,
      formatBreakdown: {},
      sizePatterns: {},
      namingPatterns: {}
    };
    
    allCases.forEach(medCase => {
      medCase['Image Paths'].forEach(imagePath => {
        imageAnalysis.totalImages++;
        
        // Format analysis
        const extension = path.extname(imagePath).toLowerCase();
        imageAnalysis.formatBreakdown[extension] = 
          (imageAnalysis.formatBreakdown[extension] || 0) + 1;
        
        // Naming pattern analysis
        const filename = path.basename(imagePath, extension);
        const hasNumbers = /\d/.test(filename);
        const hasWords = /[a-zA-Z]/.test(filename);
        
        const pattern = hasNumbers && hasWords ? 'mixed' : 
                       hasNumbers ? 'numeric' : 'text';
        imageAnalysis.namingPatterns[pattern] = 
          (imageAnalysis.namingPatterns[pattern] || 0) + 1;
      });
    });
    
    res.json(imageAnalysis);
    
  } catch (error) {
    console.error('Error analyzing images:', error);
    res.status(500).json({
      error: 'Failed to analyze images',
      message: error.message
    });
  }
});

// GET /api/stats/cases/distribution - Get case distribution statistics
router.get('/cases/distribution', async (req, res) => {
  try {
    const allCases = await loadCasesData();
    
    // Group cases by image count ranges
    const ranges = [
      { name: '1-5 images', min: 1, max: 5 },
      { name: '6-10 images', min: 6, max: 10 },
      { name: '11-20 images', min: 11, max: 20 },
      { name: '21-50 images', min: 21, max: 50 },
      { name: '50+ images', min: 51, max: Infinity }
    ];
    
    const distribution = ranges.map(range => {
      const casesInRange = allCases.filter(medCase => {
        const imageCount = medCase['Image Paths'].length;
        return imageCount >= range.min && imageCount <= range.max;
      });
      
      return {
        range: range.name,
        count: casesInRange.length,
        percentage: Math.round((casesInRange.length / allCases.length) * 100),
        examples: casesInRange.slice(0, 3).map(medCase => ({
          id: extractCaseId(medCase['Case Folder']),
          imageCount: medCase['Image Paths'].length,
          url: medCase.URL
        }))
      };
    });
    
    res.json({
      totalCases: allCases.length,
      distribution
    });
    
  } catch (error) {
    console.error('Error calculating distribution:', error);
    res.status(500).json({
      error: 'Failed to calculate case distribution',
      message: error.message
    });
  }
});

export default router;
