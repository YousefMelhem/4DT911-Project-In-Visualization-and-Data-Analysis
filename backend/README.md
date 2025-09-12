# MedPix API Backend

A Node.js/Express API server for serving medical case data to the Vue.js frontend.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The API will be available at `http://localhost:3001`

## 📡 API Endpoints

### Health Check
- **GET** `/api/health` - Basic health check
- **GET** `/api/health/detailed` - Detailed system health

### Medical Cases
- **GET** `/api/cases` - Get all cases with pagination
- **GET** `/api/cases/:id` - Get specific case by ID
- **GET** `/api/cases/:id/images` - Get all images for a case

### Statistics
- **GET** `/api/stats` - Overall dataset statistics
- **GET** `/api/stats/images` - Image analysis statistics
- **GET** `/api/stats/cases/distribution` - Case distribution stats

### Machine Learning
- **GET** `/api/ml/status` - ML processing status
- **GET** `/api/ml/clusters` - Get all available clusters
- **GET** `/api/ml/clusters/:clusterId` - Get cases in specific cluster
- **GET** `/api/ml/similar/:id` - Find similar cases
- **GET** `/api/ml/features/:id` - Get extracted features for a case

## 🔍 Query Parameters

### GET /api/cases
- `page` (number, default: 1) - Page number
- `limit` (number, default: 20, max: 100) - Cases per page
- `search` (string) - Search term for case ID or URL
- `sortBy` (string) - Sort by: url, folder, imageCount
- `sortOrder` (string) - asc or desc

### Example Requests

```bash
# Get first 10 cases
GET /api/cases?limit=10&page=1

# Search for specific case
GET /api/cases?search=8892378009084536600

# Sort by image count
GET /api/cases?sortBy=imageCount&sortOrder=desc

# Get specific case
GET /api/cases/8892378009084536600

# Get case images
GET /api/cases/8892378009084536600/images

# Get statistics
GET /api/stats
```

## 📊 Response Format

### Cases List Response
```json
{
  "cases": [
    {
      "id": "8892378009084536600",
      "caseNumber": 1,
      "url": "https://medpix.nlm.nih.gov/bycase?id=...",
      "caseFolder": "medpix_data_final\\case_8892378009084536600",
      "imageCount": 15,
      "imagePaths": ["path1.jpg", "path2.jpg"],
      "previewImage": "path1.jpg"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 335,
    "totalCases": 6700,
    "casesPerPage": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Statistics Response
```json
{
  "overview": {
    "totalCases": 6700,
    "totalImages": 45000,
    "averageImagesPerCase": 6.72,
    "minImagesPerCase": 1,
    "maxImagesPerCase": 50
  },
  "distribution": {
    "imageCountDistribution": {
      "1": 150,
      "5": 800,
      "10": 1200
    }
  }
}
```

## 🔒 Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin resource sharing
- **Rate Limiting** - API request throttling
- **Input Validation** - Joi schema validation
- **Error Handling** - Comprehensive error responses

## 🧪 Testing

```bash
npm test        # Run tests
npm run lint    # Check code style
npm run format  # Format code
```

## 📝 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🏗️ Project Structure

```
backend/
├── routes/
│   ├── health.js      # Health check endpoints
│   ├── cases.js       # Medical cases API
│   └── stats.js       # Statistics API
├── server.js          # Main server file
├── package.json       # Dependencies
└── README.md         # This file
```
