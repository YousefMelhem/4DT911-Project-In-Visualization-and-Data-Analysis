<template>
  <div class="similarity-search-page">
    <!-- Header -->
    <div class="page-header">
      <h1>🔍 Medical Case Similarity Search</h1>
      <p class="subtitle">Test TF-IDF vs BERT text similarity models</p>
    </div>

    <!-- Search Methods Toggle -->
    <div class="search-controls">
      <div class="method-selector">
        <label>Search Method:</label>
        <button 
          v-for="method in methods" 
          :key="method.value"
          :class="['method-btn', { active: selectedMethod === method.value }]"
          @click="selectedMethod = method.value"
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

    <!-- Search Input -->
    <div class="search-section">
      <div class="search-box">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Enter diagnosis, symptoms, or select a case below..."
          @keyup.enter="handleTextSearch"
        >
        <button @click="handleTextSearch" :disabled="!searchQuery.trim() || isLoading">
          {{ isLoading ? '⏳ Searching...' : '🔍 Search' }}
        </button>
      </div>
      <p class="search-hint">
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
          <h3>📋 Query</h3>
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
          🎯 Top {{ results.results.length }} Similar Cases 
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

    <!-- Comparison Mode -->
    <div v-if="comparisonResults" class="comparison-section">
      <h2>⚖️ TF-IDF vs BERT Comparison</h2>
      
      <div class="comparison-stats">
        <div class="stat-card">
          <h4>Overlap</h4>
          <p class="big-number">{{ comparisonResults.overlap_count }}/{{ topK }}</p>
          <p class="percentage">{{ comparisonResults.overlap_percentage }}%</p>
        </div>
        <div class="stat-card">
          <h4>Search Time</h4>
          <p class="big-number">{{ comparisonResults.search_time_ms }}ms</p>
        </div>
      </div>

      <div class="comparison-grid">
        <!-- TF-IDF Results -->
        <div class="method-column">
          <h3>🔤 TF-IDF Results</h3>
          <div class="mini-cases">
            <div v-for="(c, idx) in comparisonResults.tfidf_results" :key="'tfidf-' + idx" class="mini-card">
              <span class="rank">{{ c.rank }}</span>
              <span class="score">{{ (c.similarity * 100).toFixed(1) }}%</span>
              <p>{{ c.diagnosis.substring(0, 60) }}...</p>
            </div>
          </div>
        </div>

        <!-- BERT Results -->
        <div class="method-column">
          <h3>🧠 BERT Results</h3>
          <div class="mini-cases">
            <div v-for="(c, idx) in comparisonResults.bert_results" :key="'bert-' + idx" class="mini-card">
              <span class="rank">{{ c.rank }}</span>
              <span class="score">{{ (c.similarity * 100).toFixed(1) }}%</span>
              <p>{{ c.diagnosis.substring(0, 60) }}...</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Model Stats -->
    <div v-if="modelStats" class="stats-section">
      <h2>📊 Model Statistics</h2>
      <div class="stats-grid">
        <div class="stat-box">
          <h4>TF-IDF Model</h4>
          <ul>
            <li><strong>Features:</strong> {{ modelStats.tfidf.num_features.toLocaleString() }}</li>
            <li><strong>Sparsity:</strong> {{ (modelStats.tfidf.sparsity * 100).toFixed(1) }}%</li>
            <li><strong>Mean Similarity:</strong> {{ modelStats.tfidf.mean_similarity }}</li>
            <li><strong>Median Similarity:</strong> {{ modelStats.tfidf.median_similarity }}</li>
          </ul>
        </div>
        
        <div class="stat-box">
          <h4>BERT Model</h4>
          <ul>
            <li><strong>Model:</strong> {{ modelStats.bert.model_name }}</li>
            <li><strong>Dimension:</strong> {{ modelStats.bert.embedding_dimension }}</li>
            <li><strong>Mean Similarity:</strong> {{ modelStats.bert.mean_similarity }}</li>
            <li><strong>Median Similarity:</strong> {{ modelStats.bert.median_similarity }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

// State
const selectedMethod = ref('bert')
const topK = ref(10)
const searchQuery = ref('')
const isLoading = ref(false)
const results = ref(null)
const comparisonResults = ref(null)
const modelStats = ref(null)
const totalCases = ref(7404)
const sampleCases = ref([])

// Methods config
const methods = [
  { label: '🔤 TF-IDF', value: 'tfidf' },
  { label: '🧠 BERT', value: 'bert' },
  { label: '⚖️ Compare Both', value: 'compare' }
]

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
  comparisonResults.value = null
  
  try {
    const response = await $fetch('http://localhost:8000/api/similarity/search', {
      method: 'POST',
      body: {
        text: searchQuery.value,
        method: selectedMethod.value === 'compare' ? 'bert' : selectedMethod.value,
        top_k: topK.value
      }
    })
    results.value = response
  } catch (error) {
    console.error('Search error:', error)
    alert('Search failed. Make sure backend is running!')
  } finally {
    isLoading.value = false
  }
}

const handleCaseSearch = async (caseId) => {
  isLoading.value = true
  results.value = null
  comparisonResults.value = null
  
  try {
    if (selectedMethod.value === 'compare') {
      // Comparison mode
      const response = await $fetch(`http://localhost:8000/api/similarity/compare/${caseId}?top_k=${topK.value}`)
      comparisonResults.value = response
    } else {
      // Single method
      const response = await $fetch(
        `http://localhost:8000/api/similarity/similar/${caseId}?method=${selectedMethod.value}&top_k=${topK.value}`
      )
      results.value = response
    }
  } catch (error) {
    console.error('Search error:', error)
    alert('Search failed. Make sure backend is running!')
  } finally {
    isLoading.value = false
  }
}

const loadModelStats = async () => {
  try {
    const stats = await $fetch('http://localhost:8000/api/similarity/stats')
    modelStats.value = stats
    totalCases.value = stats.total_cases
  } catch (error) {
    console.error('Failed to load stats:', error)
  }
}

const loadSampleCases = async () => {
  try {
    const response = await $fetch('http://localhost:8000/api/cases/summary?limit=5')
    sampleCases.value = response
  } catch (error) {
    console.error('Failed to load sample cases:', error)
  }
}

// Lifecycle
onMounted(() => {
  loadModelStats()
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

.comparison-section {
  margin-top: 3rem;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.comparison-stats {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
}

.stat-card {
  flex: 1;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  text-align: center;
}

.big-number {
  font-size: 2.5rem;
  font-weight: bold;
  color: #3498db;
  margin: 0.5rem 0;
}

.percentage {
  color: #7f8c8d;
  font-size: 1.1rem;
}

.comparison-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.method-column h3 {
  margin-bottom: 1rem;
}

.mini-cases {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mini-card {
  background: white;
  padding: 0.75rem;
  border-radius: 6px;
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.mini-card .rank {
  font-weight: bold;
  color: #2c3e50;
  min-width: 30px;
}

.mini-card .score {
  background: #3498db;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  min-width: 50px;
  text-align: center;
}

.mini-card p {
  margin: 0;
  color: #7f8c8d;
  font-size: 0.9rem;
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
</style>
