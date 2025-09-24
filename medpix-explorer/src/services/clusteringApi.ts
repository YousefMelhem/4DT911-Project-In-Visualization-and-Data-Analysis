import axios from 'axios'

const API_BASE_URL = 'http://localhost:3001/api'

// Configure axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for clustering operations
  headers: {
    'Content-Type': 'application/json'
  }
})

// Types for API responses
export interface ClusteringStats {
  total_cases: number
  body_systems: string[]
  imaging_modalities: string[]
  complexity_distribution: {
    Simple: number
    Moderate: number
    Complex: number
  }
  avg_complexity_score: number
  multi_image_cases: number
  multi_image_percentage: number
  avg_title_length: number
  features_for_clustering: string[]
}

export interface ClusteringParameters {
  n_clusters: number
  features_used: string[]
  random_state: number
  total_samples: number
}

export interface ClusteringResults {
  cluster_labels: number[]
  cluster_centers: number[][]
  silhouette_score: number | null
  inertia: number
  n_iterations: number
}

export interface ClusterStatistics {
  [key: string]: {
    size: number
    percentage: number
    [key: string]: any
  }
}

export interface CaseWithCluster {
  url: string
  case_folder: string
  case_title: string
  cluster: number
  features: {
    [key: string]: any
  }
}

export interface KMeansResponse {
  success: boolean
  parameters: ClusteringParameters
  clustering_results: ClusteringResults
  cluster_statistics: ClusterStatistics
  cases_with_clusters: CaseWithCluster[]
}

export interface MedicalCase {
  URL: string
  'Case Folder': string
  'Image Paths': string[]
  'Case Title': string
  body_system: string
  imaging_modality: string
  complexity_score: number
  complexity_category: string
  title_length: number
  has_multiple_images: boolean
}

export interface ClusteringDataResponse {
  success: boolean
  data: MedicalCase[]
  stats: ClusteringStats
  message: string
}

export interface ApiError {
  error: string
  message: string
}

// API service class
export class ClusteringApiService {
  
  /**
   * Get dataset statistics for clustering
   */
  static async getClusteringStats(): Promise<ClusteringStats> {
    try {
      const response = await apiClient.get('/clustering/stats')
      return response.data.stats
    } catch (error) {
      console.error('Error fetching clustering stats:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Get sample data for preview
   */
  static async getClusteringData(limit: number = 100): Promise<ClusteringDataResponse> {
    try {
      const response = await apiClient.get('/clustering/data', {
        params: { limit }
      })
      return response.data
    } catch (error) {
      console.error('Error fetching clustering data:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Perform K-means clustering
   */
  static async performKMeansClustering(params: {
    n_clusters: number
    features: string[]
    random_state?: number
  }): Promise<KMeansResponse> {
    try {
      const response = await apiClient.post('/clustering/kmeans', {
        n_clusters: params.n_clusters,
        features: params.features,
        random_state: params.random_state || 42
      })
      return response.data
    } catch (error) {
      console.error('Error performing K-means clustering:', error)
      throw this.handleError(error)
    }
  }

  /**
   * Handle API errors consistently
   */
  private static handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.message) {
        return new Error(error.response.data.message)
      } else if (error.response?.data?.error) {
        return new Error(error.response.data.error)
      } else if (error.message) {
        return new Error(error.message)
      }
    }
    return new Error('An unexpected error occurred')
  }
}

// Available clustering features with descriptions
export const CLUSTERING_FEATURES = [
  {
    key: 'complexity_score',
    label: 'Complexity Score',
    type: 'numerical',
    description: 'Numerical score indicating case complexity (0-10)'
  },
  {
    key: 'body_system',
    label: 'Body System',
    type: 'categorical',
    description: 'Medical body system (Neurological, Cardiovascular, etc.)'
  },
  {
    key: 'imaging_modality',
    label: 'Imaging Modality',
    type: 'categorical',
    description: 'Type of medical imaging used (CT, MRI, X-ray, etc.)'
  },
  {
    key: 'complexity_category',
    label: 'Complexity Category',
    type: 'categorical',
    description: 'Categorical complexity level (Simple, Moderate, Complex)'
  },
  {
    key: 'title_length',
    label: 'Title Length',
    type: 'numerical',
    description: 'Number of characters in case title'
  },
  {
    key: 'has_multiple_images',
    label: 'Multiple Images',
    type: 'boolean',
    description: 'Whether case has multiple medical images'
  }
] as const

export type ClusteringFeatureKey = typeof CLUSTERING_FEATURES[number]['key']