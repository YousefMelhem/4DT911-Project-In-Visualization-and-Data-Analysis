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
            <h3 class="case-title" :title="caseItem.diagnosis">{{ caseItem.diagnosis }}</h3>
            <div class="case-details">
              <div class="detail-row">
                <span class="detail-label">Age:</span>
                <span class="detail-value">{{ caseItem.patient_age || 'Not specified' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Gender:</span>
                <span class="detail-value">{{ caseItem.gender || 'Not specified' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Region:</span>
                <span class="detail-value">{{ caseItem.regions || 'Not specified' }}</span>
              </div>
            </div>
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
    <DialogBox />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { navigateTo } from '#app'
import DialogBox from '~/components/popup/DialogBox.vue'

interface CaseSummary {
  id: string
  diagnosis: string
  imageCount: number
  thumbnail: string | null
  url: string
  patient_age?: number
  gender: string | null
  modalities: string | null
  regions: string | null
}

const cases = ref<CaseSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const totalCases = ref(0)
const offset = ref(0)
const limit = 24
const hasMore = ref(true)
const { warning, success, error: showError } = useDialog()

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
    if (offset.value === 0) {
      success('Cases Loaded', `Successfully loaded ${totalCases.value} cases from MedPix`)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
    console.error('Error loading cases:', e)
    showError(
      'Load Failed',
      'An error occurred while loading cases. Would you like to try again?',
    {
      onConfirm: () => loadCases()
      }
    )
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
    success('More Cases Loaded', `Successfully loaded ${data.length} additional cases`)

  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
    showError(
      'Load More Failed',
      'An error occurred while loading more cases. Would you like to try again?',
      {
        onConfirm: () => loadMore()
      }
    )
  } finally {
    moreLoading.value = false
  } 
}

const viewCase = async (caseId: string) => {
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
    showError(
      'Image Load Failed',
      'Unable to load the case image. The image may be unavailable or corrupted.',
    )
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
  margin-bottom: 2rem;
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
  padding: 14px 16px;        
  display: flex;
  flex-direction: column;
  gap: 12px;                 
}

.case-info .case-title {
  margin: 0;                 
  padding: 0 2px; 
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.35;
  color: #0f172a;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: calc(1.35em * 2);
}

.case-details {
  margin: 0;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)); 
  gap: 8px;
}

.detail-row {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.85rem;
  background: linear-gradient(135deg, #fafbff 0%, #f8f9ff 100%);
  border-left: 3px solid;
  border-radius: 6px;
  font-size: 0.82rem;
  transition: all 0.2s ease;
  max-width: 100%;
}

.detail-row:hover {
  background: linear-gradient(135deg, #f0f4ff 0%, #e8ecff 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
}

.detail-row:nth-child(3) {
  grid-column: 1 / -1;
  min-width: 0;
  position: relative;
  cursor: pointer;
  overflow: visible;
}

.detail-row:nth-child(3) .detail-value {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  transition: all 0.3s ease;
}

.detail-row:nth-child(3):hover .detail-value {
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  overflow: visible;
}

.detail-row:nth-child(3):hover {
  z-index: 10;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.25);
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.detail-row:nth-child(1) {
  border-left-color: #4a334c;
}

.detail-row:nth-child(2) {
  border-left-color: #4a334c;
}

.detail-row:nth-child(3) {
  border-left-color: #4a334c;
}

.detail-label {
  font-weight: 700;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  white-space: nowrap;
  padding-top: 0.1rem;
}

.detail-label::before {
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  font-weight: bold;
}

.detail-row:nth-child(1) .detail-label {
  color: #030303;
}

.detail-row:nth-child(1) .detail-label::before {
  content: "👤";
}

.detail-row:nth-child(2) .detail-label {
  color: #090909;
}

.detail-row:nth-child(2) .detail-label::before {
  content: "⚧";
}

.detail-row:nth-child(3) .detail-label {
  color: #0c0c0c;
}

.detail-row:nth-child(3) .detail-label::before {
  content: "📍";
}

.detail-value {
  color: #2d3748;
  font-weight: 500;
  font-size: 0.85rem;
  line-height: 1.5;
  word-wrap: break-word;
  overflow-wrap: break-word;
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
