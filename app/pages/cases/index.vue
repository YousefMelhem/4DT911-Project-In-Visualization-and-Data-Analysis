<template>
  <div class="cases-page">
    <div class="page-header">
      <h1>Medical Cases Gallery</h1>
      <p>Browse {{ totalCases }} diagnostic cases from MedPix</p>
    </div>

    <div class="cases-container">
      <div v-if="loading" class="loading">
        <div class="loader"></div>
        <p>Loading cases...</p>
      </div>

      <div v-else-if="error" class="error">
        <p>❌ Error loading cases: {{ error }}</p>
        <button @click="loadCases" class="retry-btn">Retry</button>
      </div>

      <div v-else class="cases-grid">
        <div v-for="caseItem in cases" :key="caseItem.id" class="case-card" @click="viewCase(caseItem.id)">
          <div class="case-image">
            <img v-if="caseItem.thumbnail"
              :src="`${API_URL}/images/${caseItem.thumbnail}`" :alt="caseItem.diagnosis"
              @error="handleImageError" />
            <div v-else class="no-image">
              <span>📋</span>
              <p>No Image</p>
            </div>
            <div class="image-count">
              <span>🖼️ {{ caseItem.imageCount }}</span>
            </div>
          </div>

          <div class="case-info">
            <h3>{{ truncate(caseItem.diagnosis, 60) }}</h3>
            <p class="case-id">Case ID: {{ caseItem.id }}</p>
          </div>
        </div>
      </div>

      <div v-if="!loading && cases.length === 0" class="no-results">
        <p>No cases found</p>
      </div>

      <div v-if="hasMore" class="load-more">
        <button @click="loadMore" class="load-more-btn"
          :disabled="moreLoading" :aria-busy="moreLoading ? 'true' : 'false'"
          > 
          <span v-if="!moreLoading"> Load More Cases</span>
          <span v-else>Loading...</span>
        </button>
      </div>
      <div v-show="hasMore && !loading" ref="sentinel" class="infinite-sentinel" aria-hidden="true"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { navigateTo } from '#app'

interface CaseSummary {
  id: string
  diagnosis: string
  imageCount: number
  thumbnail: string | null
  url: string
}

const cases = ref<CaseSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const totalCases = ref(0)
const offset = ref(0)
const limit = 24
const hasMore = ref(true)

// Use environment variable instead of hardcoded URL
const config = useRuntimeConfig()
const API_URL = config.public.apiUrl

const loadCases = async () => {
  try {
    loading.value = true
    error.value = null

    const response = await fetch(
      `${API_URL}/api/cases/summary?limit=${limit}&offset=${offset.value}`
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (offset.value === 0) {
      cases.value = data
    } else {
      cases.value = [...cases.value, ...data]
    }

    hasMore.value = data.length === limit

    // Get total count
    const statsResponse = await fetch(`${API_URL}/api/stats`)
    const stats = await statsResponse.json()
    totalCases.value = stats.total_cases

  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
    console.error('Error loading cases:', e)
  } finally {
    loading.value = false
  }
}
const moreLoading = ref(false)
const bottomHits = ref(0)
let bottomHitResetTimer: number | null = null

const loadMore = async () => {
  if (moreLoading.value || !hasMore.value) return
  moreLoading.value = true
  offset.value += limit

  try {
    const response = await fetch(
      `${API_URL}/api/cases/summary?limit=${limit}&offset=${offset.value}`
    )
    if (!response.ok) 
      throw new Error(`HTTP error! status: ${response.status}`)
    const data = await response.json()
    cases.value = [...cases.value, ...data]
    hasMore.value = data.length === limit
    
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  } finally {
    moreLoading.value = false
  } 
}

const viewCase = (caseId: string) => {
    // Navigate to case detail page
    navigateTo(`/cases/${caseId}`)
  }

  const truncate = (text: string, length: number) => {
    if (!text) return 'Unknown'
    return text.length > length ? text.substring(0, length) + '...' : text
  }

  const handleImageError = (event: Event) => {
    const target = event.target as HTMLImageElement
    target.style.display = 'none'
  }
  const sentinel = ref<HTMLElement | null>(null)
  let observer: IntersectionObserver | null = null

  const startObserver = () => {
    /*
    watches the page and only loads more cases
    if the user quickly reaches the bottom twice in a row. 
    */
    if (observer) observer.disconnect()
    observer = new IntersectionObserver(async entries => {
      const entry = entries[0]
      if (!entry?.isIntersecting) 
        return
      if (!hasMore.value || moreLoading.value) 
        return
      bottomHits.value += 1
      if (bottomHits.value==1){
        if (bottomHitResetTimer) clearTimeout(bottomHitResetTimer)
        bottomHitResetTimer = window.setTimeout(() => {
          bottomHits.value = 0
          bottomHitResetTimer = null
        }, 3000)
      return
      }    
      if(bottomHits.value>=2){
        bottomHits.value=0
        if (bottomHitResetTimer) {
          clearTimeout(bottomHitResetTimer)
          bottomHitResetTimer = null
        }
      await loadMore()
      }
    }, 
    { root: null, rootMargin: '200px', threshold: 0 })
    if (sentinel.value instanceof Element) observer.observe(sentinel.value)
  }

  onMounted(async () => {
    await loadCases()
    await startObserver()
  })
  onBeforeUnmount(() => observer?.disconnect())

</script>

<style scoped>
.cases-page {
  min-height: calc(100vh - 80px);
  background: #f5f7fa;
}

.page-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 3rem 2rem 2rem;
  text-align: center;
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.page-header p {
  font-size: 1.2rem;
  opacity: 0.9;
}

.cases-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.loading,
.error,
.no-results {
  text-align: center;
  padding: 4rem 2rem;
}

.loader {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.error {
  color: #e53e3e;
}

.retry-btn {
  margin-top: 1rem;
  padding: 0.75rem 2rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
}

.retry-btn:hover {
  background: #5568d3;
}

.cases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
}

.case-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
}

.case-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.case-image {
  width: 100%;
  height: 200px;
  background: #e2e8f0;
  position: relative;
  overflow: hidden;
}

.case-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #a0aec0;
}

.no-image span {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.image-count {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.9rem;
}

.case-info {
  padding: 1.25rem;
}

.case-info h3 {
  font-size: 1.1rem;
  color: #2d3748;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.case-id {
  font-size: 0.85rem;
  color: #718096;
}

.load-more {
  text-align: center;
  padding: 2rem;
}

.load-more-btn {
  padding: 1rem 3rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
}

.load-more-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.infinite-sentinel {
  height: 1px;
  width: 100%;
}
</style>
