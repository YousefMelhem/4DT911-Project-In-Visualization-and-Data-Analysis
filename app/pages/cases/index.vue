<template>
  <div class="cases-page">
    <div class="page-header">
      <h1>Medical Cases Gallery</h1>
      <p>Browse {{ totalCases.toLocaleString() }} diagnostic cases from MedPix</p>
    </div>

    <div class="cases-layout">
      <!-- Left Sidebar: Filters -->
      <aside class="filters-sidebar">
        <CaseFiltersPanel
          v-model="filters"
          :allModalities="allModalities"
          :regionGroups="regionGroups"
          @reset="resetFilters"
        />
      </aside>

      <!-- Main Content -->
      <main class="cases-main-content">
        <!-- Cluster Visualization Filter -->
        <div class="cluster-filter-section">
          <ClientOnly>
            <DiagnosisUMAPCompact 
              :selectedCluster="selectedCluster"
              @clusterClick="handleClusterClick"
            />
          </ClientOnly>
        </div>

        <div v-if="loading" class="loading">
        <div class="loader"></div>
        <p>Loading cases...</p>
      </div>

      <div v-else-if="error" class="error">
        <p>❌ Error loading cases: {{ error }}</p>
        <button @click="loadCases" class="retry-btn">Retry</button>
      </div>

      <div v-else class="cases-grid">
        <div
          v-for="caseItem in visibleCases"
          :key="caseItem.id"
          class="case-card"
          @click="viewCase(caseItem.id)"
        >
          <div class="case-image">
            <img
              v-if="caseItem.thumbnail"
              :src="`${API_URL}/images/${caseItem.thumbnail}`"
              :alt="caseItem.diagnosis ?? 'Case thumbnail'"
              @error="handleImageError"
            />
            <div v-else class="no-image">
              <span>📋</span>
              <p>No Image</p>
            </div>
            <div class="image-count">
              <span>🖼️ {{ caseItem.imageCount }}</span>
            </div>
          </div>

          <div class="case-info">
            <h3 class="case-title" :title="caseItem.diagnosis ?? undefined">
              {{ caseItem.diagnosis || 'Untitled case' }}
            </h3>
            <div class="case-details">
              <div class="detail-row">
                <span class="detail-label">Age:</span>
                <span class="detail-value">
                  {{ caseItem.patient_age ?? 'Not specified' }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Gender:</span>
                <span class="detail-value">
                  {{ caseItem.gender ?? 'Not specified' }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Region:</span>
                <span class="detail-value">
                  {{
                    caseItem.regions
                      ? Object.keys(caseItem.regions).join(', ')
                      : 'Not specified'
                  }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!loading && visibleCases.length === 0" class="no-results">
        <p>No cases match the current filters</p>
      </div>

      <div v-if="hasMore" class="load-more">
        <button
          @click="loadMore"
          class="load-more-btn"
        >
          Load More Cases
        </button>
      </div>

      <div
        v-show="hasMore && !loading"
        ref="sentinel"
        class="infinite-sentinel"
        aria-hidden="true"
      ></div>
      </main>
    </div>

    <DialogBox />
  </div>
</template>


<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { navigateTo } from '#app'
import DialogBox from '~/components/popup/DialogBox.vue'
import CaseFiltersPanel from '~/components/filters/CaseFiltersPanel.vue'
import DiagnosisUMAPCompact from '~/components/charts/DiagnosisUMAPCompact.vue'
import { useCaseFilters, type CaseSummary } from '~/composables/useCaseFilters'

const rawData = ref<CaseSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const fetchedAt = ref<Date | null>(null)

const config = useRuntimeConfig()
const API_URL = config.public.apiUrl

const { warning, success, error: showError } = useDialog()

// Cluster filtering
const selectedCluster = ref<number | null>(null)
const clusterData = ref<Map<string, number>>(new Map())

// Load cluster mapping
const loadClusterMapping = async () => {
  try {
    const response = await fetch(`${API_URL}/data/features/diagnosis_biobert_clusters.json`)
    if (response.ok) {
      const data = await response.json()
      const mapping = new Map<string, number>()
      data.diagnoses.forEach((diag: string, i: number) => {
        mapping.set(diag.toLowerCase(), data.clusters[i])
      })
      clusterData.value = mapping
      console.log(`✅ Loaded ${mapping.size} diagnosis-cluster mappings for cases page`)
    }
  } catch (e) {
    console.warn('Could not load cluster mapping:', e)
  }
}

// Shared filters + filtered data via composable
const {
  filters,
  allModalities,
  regionGroups,
  filteredData,
  resetFiltersLocal,
} = useCaseFilters(rawData)

// Apply cluster filter on top of existing filters
const clusterFilteredData = computed(() => {
  if (selectedCluster.value === null) return filteredData.value
  
  return filteredData.value.filter(row => {
    if (!row.diagnosis) return false
    const diagLower = row.diagnosis.toLowerCase()
    const cluster = clusterData.value.get(diagLower)
    return cluster === selectedCluster.value
  })
})

const handleClusterClick = (clusterId: number) => {
  if (clusterId === -1 || selectedCluster.value === clusterId) {
    selectedCluster.value = null
    success('Cluster Filter Cleared', 'Showing all cases')
  } else {
    selectedCluster.value = clusterId
    const count = clusterFilteredData.value.length
    success('Cluster Filter Applied', `Showing ${count.toLocaleString()} cases in this cluster`)
  }
}

const totalCases = computed(() => rawData.value.length)

// ===== Filters actions =====
const resetFilters = async () => {
  try {
    const confirmed = await warning(
      'Reset Filters',
      'This will clear all active filters and show all cases. Continue?'
    )
    if (confirmed) {
      resetFiltersLocal()
      success('Filters Reset', 'All filters have been cleared.')
    }
  } catch (e) {
    showError(
      'Reset Failed',
      'An error occurred while resetting filters. Would you like to try again?',
      {
        onConfirm: () => resetFilters(),
      }
    )
  }
}

// ===== Local "pagination" over filteredData =====
const PAGE_SIZE = 24
const visibleLimit = ref(PAGE_SIZE)

const visibleCases = computed(() =>
  clusterFilteredData.value.slice(0, visibleLimit.value)
)
const hasMore = computed(
  () => clusterFilteredData.value.length > visibleLimit.value
)

const loadMore = () => {
  if (!hasMore.value) return
  visibleLimit.value += PAGE_SIZE
}

// When filters or cluster selection change, reset back to first "page"
watch(
  [filters, selectedCluster],
  () => {
    visibleLimit.value = PAGE_SIZE
  },
  { deep: true }
)

// ===== Fetch all cases once =====
const loadCases = async () => {
  try {
    loading.value = true
    error.value = null

    const response = await fetch(`${API_URL}/api/cases/summary_all`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    if (!Array.isArray(data)) {
      throw new Error('Unexpected response shape')
    }

    rawData.value = data as CaseSummary[]
    fetchedAt.value = new Date()

    success(
      'Cases Loaded',
      `Successfully loaded ${totalCases.value.toLocaleString()} cases from MedPix`
    )
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
    console.error('Error loading cases:', e)
    showError(
      'Load Failed',
      'An error occurred while loading cases. Would you like to try again?',
      {
        onConfirm: () => loadCases(),
      }
    )
  } finally {
    loading.value = false
  }
}

// ===== Navigation & helpers =====
const viewCase = (caseId: string) => {
  navigateTo(`/cases/${caseId}`)
}

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
  showError(
    'Image Load Failed',
    'Unable to load the case image. The image may be unavailable or corrupted.'
  )
}

// ===== Infinite scroll sentinel =====
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
const bottomHits = ref(0)
let bottomHitResetTimer: number | null = null

const startObserver = () => {
  if (observer) observer.disconnect()

  observer = new IntersectionObserver(
    entries => {
      const entry = entries[0]
      if (!entry?.isIntersecting) return
      if (!hasMore.value) return

      bottomHits.value += 1
      if (bottomHits.value === 1) {
        if (bottomHitResetTimer) clearTimeout(bottomHitResetTimer)
        bottomHitResetTimer = window.setTimeout(() => {
          bottomHits.value = 0
          bottomHitResetTimer = null
        }, 3000)
        return
      }

      if (bottomHits.value >= 2) {
        bottomHits.value = 0
        if (bottomHitResetTimer) {
          clearTimeout(bottomHitResetTimer)
          bottomHitResetTimer = null
        }
        loadMore()
      }
    },
    { root: null, rootMargin: '200px', threshold: 0 }
  )

  if (sentinel.value instanceof Element) {
    observer.observe(sentinel.value)
  }
}

onMounted(async () => {
  await loadCases()
  await loadClusterMapping()
  startObserver()
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

.cases-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 0;
  max-width: 1800px;
  margin: 0 auto;
  min-height: calc(100vh - 250px);
}

@media (max-width: 1200px) {
  .cases-layout {
    grid-template-columns: 280px 1fr;
  }
}

@media (max-width: 900px) {
  .cases-layout {
    grid-template-columns: 1fr;
  }
  
  .filters-sidebar {
    position: static !important;
    max-height: none !important;
    border-right: none !important;
  }
}

.filters-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  background: white;
  border-right: 1px solid #e5e7eb;
  padding: 1.5rem 1rem;
}

.filters-sidebar::-webkit-scrollbar {
  width: 8px;
}

.filters-sidebar::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.filters-sidebar::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}

.filters-sidebar::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

.cases-main-content {
  padding: 2rem;
  background: #f5f7fa;
}

.cluster-filter-section {
  margin-bottom: 2rem;
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
