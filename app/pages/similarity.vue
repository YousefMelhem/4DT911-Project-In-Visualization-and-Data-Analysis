<template>
  <div class="similarity-search-page">
    <!-- Header -->
    <div class="page-header">
      <h1>🔍 Medical Case Similarity Search</h1>
      <p class="subtitle">Search by text, images, or both using AI-powered similarity models</p>
    </div>

    <!-- Search Methods Toggle -->
    <div class="search-controls">
      <div class="method-selector">
        <label>Search Method:</label>
        <button 
          v-for="method in methods" 
          :key="method.value"
          :class="['method-btn', { active: selectedMethod === method.value }]"
          @click="selectMethod(method.value)"
          :title="method.description"
        >
          {{ method.label }}
        </button>
      </div>
      
      <div class="results-count">
        <label for="topK">Results to show:</label>
        <input 
          id="topK" 
          v-model.number="topK" 
          type="number" 
          min="5" 
          max="20" 
          step="5"
        >
      </div>
    </div>

    <!-- Hybrid Weight Slider (only for hybrid mode) -->
    <div v-if="selectedMethod === 'hybrid'" class="hybrid-controls">
      <div class="weight-slider">
        <label>
          <span class="slider-label">
            Text Weight: <strong>{{ (textWeight * 100).toFixed(0) }}%</strong>
            <span class="slider-hint">Image: {{ ((1 - textWeight) * 100).toFixed(0) }}%</span>
          </span>
        </label>
        <input 
          v-model.number="textWeight" 
          type="range" 
          min="0" 
          max="1" 
          step="0.1"
          class="weight-range"
        >
        <div class="weight-presets">
          <button @click="textWeight = 0.3" :class="{ active: textWeight === 0.3 }">
            🖼️ Visual Focus
          </button>
          <button @click="textWeight = 0.5" :class="{ active: textWeight === 0.5 }">
            ⚖️ Balanced
          </button>
          <button @click="textWeight = 0.7" :class="{ active: textWeight === 0.7 }">
            📝 Text Focus
          </button>
        </div>
      </div>
    </div>

    <!-- Search Input -->
    <div class="search-section">
      <div class="search-box">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Enter diagnosis, symptoms, or select a case below..."
          @keyup.enter="handleTextSearch"
          :disabled="selectedMethod === 'image'"
        >
        <button 
          @click="handleTextSearch" 
          :disabled="!searchQuery.trim() || isLoading || selectedMethod === 'image' || selectedMethod === 'hybrid'"
        >
          {{ isLoading ? '⏳ Searching...' : '🔍 Search' }}
        </button>
      </div>
      <p class="search-hint" v-if="selectedMethod === 'image'">
        ⚠️ Image search requires selecting a case below (cannot search from text)
      </p>
      <p class="search-hint" v-else-if="selectedMethod === 'hybrid'">
        ⚠️ Hybrid search requires selecting a case below (combines text + images from that case)
      </p>
      <p class="search-hint" v-else>
        💡 Try: "pneumonia", "fracture humerus", "brain tumor", etc.
      </p>
    </div>

    <!-- Quick Case Selection -->
    <div class="quick-cases">
      <h3>Or select a case to find similar:</h3>
      <div class="case-buttons">
        <button 
          v-for="(caseItem, idx) in sampleCases" 
          :key="idx"
          @click="handleCaseSearch(caseItem.id)"
          :disabled="isLoading"
        >
          {{ caseItem.diagnosis.substring(0, 50) }}...
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <p>Searching through {{ totalCases.toLocaleString() }} cases...</p>
    </div>

    <!-- Results -->
    <div v-if="results" class="results-section">
      <!-- Query Info -->
      <div class="query-info">
        <div class="info-card">
          <h3>Query</h3>
          <p v-if="results.query_case_id">
            <strong>Case ID:</strong> {{ results.query_case_id }}
          </p>
          <p v-if="results.query_text">
            <strong>Text:</strong> {{ results.query_text }}
          </p>
          <p><strong>Method:</strong> {{ results.method.toUpperCase() }}</p>
          <p><strong>Search Time:</strong> {{ results.search_time_ms }}ms</p>
          <p><strong>Cases Searched:</strong> {{ results.total_cases_searched.toLocaleString() }}</p>
        </div>
      </div>

      <!-- Similar Cases -->
      <div class="similar-cases">
        <h2>
          Top {{ results.results.length }} Similar Cases 
          <span class="method-badge">{{ results.method.toUpperCase() }}</span>
        </h2>
        
        <div class="cases-grid">
          <div 
            v-for="(similarCase, idx) in results.results" 
            :key="similarCase.id"
            class="case-card"
          >
            <div class="case-header">
              <span class="rank">#{{ similarCase.rank }}</span>
              <span :class="['similarity-score', getSimilarityClass(similarCase.similarity)]">
                {{ (similarCase.similarity * 100).toFixed(1) }}% match
              </span>
            </div>

            <!-- Hybrid Breakdown (if available) -->
            <div v-if="similarCase.text_similarity !== null && similarCase.image_similarity !== null" class="similarity-breakdown">
              <div class="breakdown-bar">
                <div class="bar-segment text-segment" :style="{ width: (similarCase.text_similarity * 100) + '%' }">
                  <span>📝 {{ (similarCase.text_similarity * 100).toFixed(0) }}%</span>
                </div>
                <div class="bar-segment image-segment" :style="{ width: (similarCase.image_similarity * 100) + '%' }">
                  <span>🖼️ {{ (similarCase.image_similarity * 100).toFixed(0) }}%</span>
                </div>
              </div>
            </div>
            
            <div class="case-content">
              <h4>{{ similarCase.diagnosis }}</h4>
              
              <div v-if="similarCase.history" class="case-section">
                <strong>History:</strong>
                <p>{{ similarCase.history.substring(0, 150) }}...</p>
              </div>
              
              <div v-if="similarCase.findings" class="case-section">
                <strong>Findings:</strong>
                <p>{{ similarCase.findings.substring(0, 150) }}...</p>
              </div>
              
              <div class="case-footer">
                <span class="image-count">🖼️ {{ similarCase.imageCount }} images</span>
                <NuxtLink :to="`/cases/${similarCase.id}`" class="view-btn">
                  View Details →
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <DialogBox />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import DialogBox from '~/components/popup/DialogBox.vue'

// State
const selectedMethod = ref('bert')
const topK = ref(10)
const textWeight = ref(0.5) // For hybrid search: 0.0 = all image, 1.0 = all text
const searchQuery = ref('')
const isLoading = ref(false)
const results = ref(null)
const totalCases = ref(7404)
const sampleCases = ref([])
const {success, error: showError } = useDialog()

// Methods config
const methods = [
  { label: '🔤 TF-IDF', value: 'tfidf', description: 'Keyword-based text matching' },
  { label: '🧠 BERT', value: 'bert', description: 'Semantic text understanding' },
  { label: '🖼️ Image', value: 'image', description: 'Visual similarity from medical images' },
  { label: '🔬 Hybrid', value: 'hybrid', description: 'Combined text + image similarity' }
]

// Method selection handler
const selectMethod = async (method) => {
  selectedMethod.value = method
  // Reset results when changing method
  results.value = null
  comparisonResults.value = null
  }

// Utility function
const getSimilarityClass = (score) => {
  if (score > 0.7) return 'high'
  if (score > 0.4) return 'medium'
  return 'low'
}

// API Calls
const handleTextSearch = async () => {
  if (!searchQuery.value.trim()) return
  
  isLoading.value = true
  results.value = null
  
  try {
    const response = await $fetch('http://localhost:8000/api/similarity/search', {
      method: 'POST',
      body: {
        text: searchQuery.value,
        method: selectedMethod.value,
        top_k: topK.value
      }
    })
    results.value = response
    success('Search Complete', `Found ${response.results.length} similar cases in ${response.search_time_ms}ms`)
  } catch (error) {
    console.error('Search error:', error)
    showError(
      'Search Failed',
      'The search request failed. Make sure the backend is running and try again.',
      {
        onConfirm: () => handleTextSearch()
      }
    )
  } finally {
    isLoading.value = false
  }
}

const handleCaseSearch = async (caseId) => {
  isLoading.value = true
  results.value = null
  
  try {
    // Single method (including image and hybrid)
    let url = `http://localhost:8000/api/similarity/similar/${caseId}?method=${selectedMethod.value}&top_k=${topK.value}`
    
    // Add text_weight for hybrid search
    if (selectedMethod.value === 'hybrid') {
      url += `&text_weight=${textWeight.value}`
    }
    
    console.log('Fetching from URL:', url)
    const response = await $fetch(url)
    console.log('Response received:', response)
    console.log('Results count:', response.results?.length)
    results.value = response
    success('Search Complete', `Found ${response.results.length} similar cases in ${response.search_time_ms}ms`)
  } catch (error) {
    console.error('Search error:', error)
    showError(
      'Search Failed',
      'The search request failed. Make sure the backend is running and try again.',
      {
        onConfirm: () => handleCaseSearch(caseId)
      }
    )
  } finally {
    isLoading.value = false
  }
}

const loadSampleCases = async () => {
  try {
    const response = await $fetch('http://localhost:8000/api/cases/summary?limit=5')
    sampleCases.value = response
  } catch (error) {
    console.error('Failed to load sample cases:', error)
    showError(
      'Failed to Load Sample Cases',
      'Unable to load sample cases. The backend may be unavailable.'
    )
  }
}

// Lifecycle
onMounted(() => {
  loadSampleCases()
})
</script>

<style scoped>
.similarity-search-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  text-align: center;
  margin-bottom: 3rem;
}

.page-header h1 {
  font-size: 2.5rem;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #7f8c8d;
  font-size: 1.1rem;
}

.search-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 2rem;
}

.method-selector {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.method-btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 1rem;
}

.method-btn:hover {
  border-color: #3498db;
}

.method-btn.active {
  background: #3498db;
  color: white;
  border-color: #3498db;
}

.results-count {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.results-count input {
  width: 80px;
  padding: 0.5rem;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 1rem;
}

.search-section {
  margin-bottom: 2rem;
}

.search-box {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.search-box input {
  flex: 1;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1.1rem;
}

.search-box input:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
  border-color: #ddd;
}

.search-box input:focus:not(:disabled) {
  outline: none;
  border-color: #3498db;
}

.search-box button {
  padding: 1rem 2rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: background 0.3s;
}

.search-box button:hover:not(:disabled) {
  background: #2980b9;
}

.search-box button:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.search-hint {
  color: #7f8c8d;
  font-style: italic;
  margin: 0.5rem 0;
}

.search-hint:has(⚠️) {
  color: #e67e22;
  font-weight: 500;
  background: #fff3cd;
  padding: 0.75rem;
  border-radius: 6px;
  border-left: 4px solid #e67e22;
}

.quick-cases {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.quick-cases h3 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.case-buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.case-buttons button {
  padding: 0.75rem;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s;
}

.case-buttons button:hover:not(:disabled) {
  background: #ecf0f1;
  border-color: #3498db;
}

.case-buttons button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 3rem;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.query-info {
  margin-bottom: 2rem;
}

.info-card {
  background: #ecf0f1;
  padding: 1.5rem;
  border-radius: 8px;
}

.info-card h3 {
  margin-bottom: 1rem;
}

.info-card p {
  margin: 0.5rem 0;
}

.similar-cases h2 {
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.method-badge {
  background: #3498db;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.cases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
}

.case-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
}

.case-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.case-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
}

.rank {
  font-weight: bold;
  font-size: 1.2rem;
  color: #2c3e50;
}

.similarity-score {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.9rem;
}

.similarity-score.high {
  background: #2ecc71;
  color: white;
}

.similarity-score.medium {
  background: #f39c12;
  color: white;
}

.similarity-score.low {
  background: #95a5a6;
  color: white;
}

.case-content {
  padding: 1rem;
}

.case-content h4 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.case-section {
  margin-bottom: 1rem;
}

.case-section strong {
  color: #34495e;
}

.case-section p {
  margin-top: 0.25rem;
  color: #7f8c8d;
  line-height: 1.5;
}

.case-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.image-count {
  color: #7f8c8d;
}

.view-btn {
  color: #3498db;
  text-decoration: none;
  font-weight: bold;
  transition: color 0.3s;
}

.view-btn:hover {
  color: #2980b9;
}

.stats-section {
  margin-top: 3rem;
  padding: 2rem;
  background: #ecf0f1;
  border-radius: 8px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-top: 1rem;
}

.stat-box {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
}

.stat-box h4 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.stat-box ul {
  list-style: none;
  padding: 0;
}

.stat-box li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #ecf0f1;
}

.stat-box li:last-child {
  border-bottom: none;
}

/* Hybrid Controls */
.hybrid-controls {
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.weight-slider {
  color: white;
}

.slider-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
}

.slider-label strong {
  font-size: 1.3rem;
}

.slider-hint {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  margin-left: 1rem;
}

.weight-range {
  width: 100%;
  height: 8px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.3);
  outline: none;
  margin: 0.5rem 0 1rem 0;
  -webkit-appearance: none;
}

.weight-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s;
}

.weight-range::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.weight-range::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  border: none;
  transition: transform 0.2s;
}

.weight-range::-moz-range-thumb:hover {
  transform: scale(1.2);
}

.weight-presets {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.weight-presets button {
  flex: 1;
  padding: 0.6rem 1rem;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.4);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s;
}

.weight-presets button:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.6);
  transform: translateY(-2px);
}

.weight-presets button.active {
  background: white;
  color: #667eea;
  border-color: white;
  font-weight: bold;
}

/* Similarity Breakdown */
.similarity-breakdown {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #e0e0e0;
}

.breakdown-bar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.bar-segment {
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: white;
  min-width: 60px;
  transition: all 0.3s;
}

.text-segment {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.image-segment {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.bar-segment span {
  white-space: nowrap;
  padding: 0 0.5rem;
}
</style>
