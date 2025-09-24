<template>
  <div class="clustering-dashboard">
    <header class="dashboard-header">
      <h1>Medical Case Clustering Dashboard</h1>
      <p>Interactive K-means clustering analysis of medical cases</p>
    </header>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <h3>⚠️ Error</h3>
      <p>{{ error }}</p>
      <button @click="initializeDashboard" class="retry-button">Retry</button>
    </div>

    <!-- Main Dashboard -->
    <div v-else class="dashboard-content">
      <!-- Dataset Overview -->
      <section class="dataset-overview">
        <h2>Dataset Overview</h2>
        <div class="stats-grid" v-if="datasetStats">
          <div class="stat-card">
            <h3>{{ datasetStats.total_cases.toLocaleString() }}</h3>
            <p>Total Cases</p>
          </div>
          <div class="stat-card">
            <h3>{{ datasetStats.body_systems.length }}</h3>
            <p>Body Systems</p>
          </div>
          <div class="stat-card">
            <h3>{{ datasetStats.imaging_modalities.length }}</h3>
            <p>Imaging Modalities</p>
          </div>
          <div class="stat-card">
            <h3>{{ datasetStats.multi_image_percentage }}%</h3>
            <p>Multi-Image Cases</p>
          </div>
        </div>
      </section>

      <!-- Clustering Controls -->
      <section class="clustering-controls">
        <h2>Clustering Configuration</h2>
        <div class="controls-grid">
          
          <!-- Number of Clusters -->
          <div class="control-group">
            <label for="n-clusters">Number of Clusters:</label>
            <input 
              id="n-clusters"
              type="range" 
              v-model.number="clusteringParams.n_clusters"
              min="2" 
              max="10" 
              step="1"
              class="cluster-slider"
            />
            <span class="cluster-value">{{ clusteringParams.n_clusters }}</span>
          </div>

          <!-- Feature Selection -->
          <div class="control-group feature-selection">
            <label>Features for Clustering:</label>
            <div class="feature-checkboxes">
              <div 
                v-for="feature in availableFeatures" 
                :key="feature.key"
                class="feature-checkbox"
              >
                <input
                  :id="feature.key"
                  type="checkbox"
                  :value="feature.key"
                  v-model="clusteringParams.features"
                />
                <label :for="feature.key" class="feature-label">
                  <span class="feature-name">{{ feature.label }}</span>
                  <span class="feature-type">{{ feature.type }}</span>
                  <span class="feature-description">{{ feature.description }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Random State -->
          <div class="control-group">
            <label for="random-state">Random State (for reproducibility):</label>
            <input 
              id="random-state"
              type="number" 
              v-model.number="clusteringParams.random_state"
              min="1" 
              max="1000"
              class="random-state-input"
            />
          </div>

          <!-- Run Clustering Button -->
          <div class="control-group">
            <button 
              @click="runClustering"
              :disabled="!canRunClustering || isClusteringRunning"
              class="run-clustering-button"
            >
              {{ isClusteringRunning ? 'Running...' : 'Run K-means Clustering' }}
            </button>
          </div>
        </div>
      </section>

      <!-- Clustering Results -->
      <section v-if="clusteringResults" class="clustering-results">
        <h2>Clustering Results</h2>
        
        <!-- Metrics -->
        <div class="metrics-grid">
          <div class="metric-card">
            <h3>{{ clusteringResults.parameters.n_clusters }}</h3>
            <p>Clusters</p>
          </div>
          <div class="metric-card">
            <h3>{{ clusteringResults.clustering_results.silhouette_score?.toFixed(3) || 'N/A' }}</h3>
            <p>Silhouette Score</p>
          </div>
          <div class="metric-card">
            <h3>{{ clusteringResults.clustering_results.n_iterations }}</h3>
            <p>Iterations</p>
          </div>
          <div class="metric-card">
            <h3>{{ clusteringResults.parameters.total_samples.toLocaleString() }}</h3>
            <p>Total Samples</p>
          </div>
        </div>

        <!-- Cluster Statistics -->
        <div class="cluster-statistics">
          <h3>Cluster Distribution</h3>
          <div class="cluster-stats-grid">
            <div 
              v-for="(stats, clusterId) in clusteringResults.cluster_statistics" 
              :key="clusterId"
              class="cluster-stat-card"
              :style="{ borderLeft: `4px solid ${getClusterColor(parseInt(String(clusterId).split('_')[1]))}` }"
            >
              <h4>{{ String(clusterId).replace('_', ' ').toUpperCase() }}</h4>
              <p><strong>Size:</strong> {{ stats.size }} cases ({{ stats.percentage }}%)</p>
              
              <!-- Feature-specific stats -->
              <div class="feature-stats">
                <div v-for="feature in clusteringParams.features" :key="feature" class="feature-stat">
                  <template v-if="feature === 'complexity_score'">
                    <p><strong>Avg Complexity:</strong> {{ stats.complexity_score_mean?.toFixed(2) || 'N/A' }}</p>
                  </template>
                  <template v-else-if="feature === 'title_length'">
                    <p><strong>Avg Title Length:</strong> {{ stats.title_length_mean?.toFixed(0) || 'N/A' }}</p>
                  </template>
                  <template v-else-if="feature === 'has_multiple_images'">
                    <p><strong>Multi-Image:</strong> {{ stats.has_multiple_images_percentage?.toFixed(1) || 'N/A' }}%</p>
                  </template>
                  <template v-else-if="feature === 'body_system'">
                    <p><strong>Primary Body System:</strong> {{ stats.body_system_mode || 'N/A' }}</p>
                  </template>
                  <template v-else-if="feature === 'imaging_modality'">
                    <p><strong>Primary Modality:</strong> {{ stats.imaging_modality_mode || 'N/A' }}</p>
                  </template>
                  <template v-else-if="feature === 'complexity_category'">
                    <p><strong>Primary Complexity:</strong> {{ stats.complexity_category_mode || 'N/A' }}</p>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Visualization Container -->
        <div class="visualization-container">
          <h3>Cluster Visualization</h3>
          <ClusterVisualization 
            v-if="clusteringResults"
            :clustering-data="clusteringResults"
            :feature-names="clusteringParams.features"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { 
  ClusteringApiService, 
  CLUSTERING_FEATURES,
  type ClusteringStats,
  type KMeansResponse,
  type ClusteringFeatureKey
} from '@/services/clusteringApi'
import ClusterVisualization from '../components/ClusterVisualization.vue'

// Reactive state
const isLoading = ref(true)
const isClusteringRunning = ref(false)
const error = ref<string | null>(null)
const loadingMessage = ref('Loading dataset information...')
const datasetStats = ref<ClusteringStats | null>(null)
const clusteringResults = ref<KMeansResponse | null>(null)

// Clustering parameters
const clusteringParams = ref({
  n_clusters: 3,
  features: ['complexity_score', 'body_system', 'has_multiple_images'] as ClusteringFeatureKey[],
  random_state: 42
})

// Available features for selection
const availableFeatures = CLUSTERING_FEATURES

// Computed properties
const canRunClustering = computed(() => {
  return clusteringParams.value.features.length > 0 && 
         clusteringParams.value.n_clusters >= 2 && 
         clusteringParams.value.n_clusters <= 10
})

// Color scheme for clusters
const clusterColors = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#8e44ad'
]

const getClusterColor = (index: number): string => {
  return clusterColors[index % clusterColors.length]
}

// Methods
const initializeDashboard = async () => {
  try {
    isLoading.value = true
    error.value = null
    loadingMessage.value = 'Loading dataset information...'
    
    const stats = await ClusteringApiService.getClusteringStats()
    datasetStats.value = stats
    
    isLoading.value = false
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load dataset information'
    isLoading.value = false
  }
}

const runClustering = async () => {
  if (!canRunClustering.value) return
  
  try {
    isClusteringRunning.value = true
    loadingMessage.value = 'Running K-means clustering...'
    
    const results = await ClusteringApiService.performKMeansClustering({
      n_clusters: clusteringParams.value.n_clusters,
      features: clusteringParams.value.features,
      random_state: clusteringParams.value.random_state
    })
    
    clusteringResults.value = results
    isClusteringRunning.value = false
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to run clustering'
    isClusteringRunning.value = false
  }
}

// Initialize dashboard on mount
onMounted(() => {
  initializeDashboard()
})
</script>

<style scoped>
.clustering-dashboard {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 10px;
}

.dashboard-header h1 {
  margin: 0 0 10px 0;
  font-size: 2.5em;
  font-weight: 300;
}

.dashboard-header p {
  margin: 0;
  font-size: 1.2em;
  opacity: 0.9;
}

.loading-container, .error-container {
  text-align: center;
  padding: 60px 20px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-container {
  color: #e74c3c;
}

.retry-button {
  background: #e74c3c;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
}

.retry-button:hover {
  background: #c0392b;
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.dataset-overview, .clustering-controls, .clustering-results {
  background: white;
  border-radius: 10px;
  padding: 25px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.dataset-overview h2, .clustering-controls h2, .clustering-results h2 {
  margin: 0 0 20px 0;
  color: #2c3e50;
  border-bottom: 2px solid #ecf0f1;
  padding-bottom: 10px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.stat-card h3 {
  margin: 0 0 5px 0;
  font-size: 2em;
  color: #667eea;
  font-weight: bold;
}

.stat-card p {
  margin: 0;
  color: #7f8c8d;
  font-weight: 500;
}

.controls-grid {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.control-group label {
  font-weight: 600;
  color: #2c3e50;
}

.cluster-slider {
  width: 200px;
}

.cluster-value {
  font-weight: bold;
  color: #667eea;
  font-size: 1.2em;
}

.feature-selection {
  border: 1px solid #ecf0f1;
  padding: 15px;
  border-radius: 8px;
  background: #f8f9fa;
}

.feature-checkboxes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
}

.feature-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.feature-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
}

.feature-name {
  font-weight: 600;
  color: #2c3e50;
}

.feature-type {
  font-size: 0.8em;
  color: #667eea;
  font-weight: 500;
  text-transform: uppercase;
}

.feature-description {
  font-size: 0.85em;
  color: #7f8c8d;
}

.random-state-input {
  width: 100px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.run-clustering-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  align-self: flex-start;
}

.run-clustering-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.run-clustering-button:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
  transform: none;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}

.metric-card {
  text-align: center;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #2ecc71;
}

.metric-card h3 {
  margin: 0 0 5px 0;
  font-size: 1.8em;
  color: #2ecc71;
  font-weight: bold;
}

.metric-card p {
  margin: 0;
  color: #7f8c8d;
  font-weight: 500;
}

.cluster-statistics h3 {
  margin: 0 0 15px 0;
  color: #2c3e50;
}

.cluster-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.cluster-stat-card {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #e74c3c;
}

.cluster-stat-card h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.cluster-stat-card p {
  margin: 5px 0;
  color: #34495e;
}

.feature-stats {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #ecf0f1;
}

.feature-stat p {
  font-size: 0.9em;
  margin: 3px 0;
}

.visualization-container {
  margin-top: 25px;
  padding-top: 25px;
  border-top: 1px solid #ecf0f1;
}

.visualization-container h3 {
  margin: 0 0 20px 0;
  color: #2c3e50;
}

@media (max-width: 768px) {
  .stats-grid, .metrics-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
  
  .feature-checkboxes {
    grid-template-columns: 1fr;
  }
  
  .cluster-stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>