<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import WordCloud from '~/components/charts/WordCloud.vue'
import type { CaseSummary } from '~/composables/useCaseFilters'

type TermItem = { term: string; weight: number }

const props = defineProps<{
  cases: CaseSummary[]
  typicalCases: CaseSummary[]
  atypicalCases: CaseSummary[]
  topTerms: TermItem[]
  selectedCluster: number | null
  clusterLabels?: Record<number, string> | null
}>()

const config = useRuntimeConfig()
const API_URL = config.public.apiUrl

// Simple Record-based cache for /api/cases/{id}
type CaseDetail = {
  id: string
  title: string | null
  diagnosis: string | null
  patient_age: number | null
  gender: string | null
  modalities?: string[]
  imagePaths?: string[]
}

const caseDetails = ref<Record<string, CaseDetail | undefined>>({})
const loadingDetail = ref<Record<string, boolean>>({})

// Unique IDs we need details for (typical + atypical)
const previewIds = computed<string[]>(() => {
  const ids = new Set<string>()
  for (const c of props.typicalCases) ids.add(c.id)
  for (const c of props.atypicalCases) ids.add(c.id)
  return Array.from(ids)
})

const resolveImageUrl = (path?: string | null) => {
  return `${API_URL}/images/${path}`
}

const fetchCaseDetail = async (id: string) => {
  if (!id) return
  if (caseDetails.value[id]) return

  loadingDetail.value = { ...loadingDetail.value, [id]: true }
  try {
    const res = await fetch(`${API_URL}/api/cases/${encodeURIComponent(id)}`)
    if (!res.ok) throw new Error(`Failed to load case ${id}`)
    const data = await res.json()
    caseDetails.value = {
      ...caseDetails.value,
      [id]: data as CaseDetail,
    }
  } catch (err) {
    console.warn('Error loading case detail', id, err)
  } finally {
    loadingDetail.value = { ...loadingDetail.value, [id]: false }
  }
}

// Fetch details for any new preview IDs
watch(
  previewIds,
  (ids) => {
    for (const id of ids) {
      if (!id) continue
      if (!caseDetails.value[id] && !loadingDetail.value[id]) {
        void fetchCaseDetail(id)
      }
    }
  },
  { immediate: true }
)

const hasUMAPExamples = computed(() =>
  props.typicalCases.length > 0 || props.atypicalCases.length > 0
)

const selectionLabel = computed(() => {
  if (!props.cases.length) return 'No cases in current selection'
  if (props.selectedCluster === null) {
    return `Current selection (${props.cases.length} cases)`
  }
  const clusterName = props.clusterLabels?.[props.selectedCluster] ?? `Cluster ${props.selectedCluster}`
  return `${clusterName} (${props.cases.length} cases)`
})
</script>

<template>
  <section class="selection-summary">
    <header class="summary-header">
      <div>
        <h2>Cluster overview</h2>
        <p>{{ selectionLabel }}</p>
      </div>
    </header>

    <div class="summary-content">
      <!-- Left: word cloud -->
      <div class="summary-block">
        <h3>Key terms in this cluster</h3>
        <WordCloud :terms="topTerms" />
      </div>

      <!-- Right: typical/atypical examples -->
      <div class="summary-block examples-block">
        <h3>Typical & atypical cases</h3>

        <div v-if="!hasUMAPExamples" class="empty">
          Not enough UMAP information to identify typical or atypical cases for this selection.
        </div>

        <div v-else class="examples-grid">
          <!-- Typical -->
          <div class="examples-column">
            <h4>Most typical</h4>
            <ul class="case-list">
              <li v-for="c in typicalCases" :key="'typical-' + c.id" class="case-card">
                <NuxtLink :to="`/cases/${c.id}`" class="card-link">
                  <div class="thumb-wrapper">
                    <div v-if="loadingDetail[c.id]" class="thumb loading"></div>
                    <img
                      v-else-if="caseDetails[c.id]?.imagePaths && caseDetails[c.id]?.imagePaths!.length"
                      class="thumb"
                      :src="resolveImageUrl(caseDetails[c.id]!.imagePaths![0])"
                      alt="Case image"
                      loading="lazy"
                    />
                    <div v-else class="thumb placeholder">
                      <span>no image</span>
                    </div>
                  </div>
                  <div class="card-text">
                    <p class="title">
                      {{ caseDetails[c.id]?.diagnosis || c.diagnosis || 'Untitled case' }}
                    </p>
                    <p class="meta">
                      <span v-if="caseDetails[c.id]?.patient_age !== null">
                        Age {{ caseDetails[c.id]?.patient_age }}
                      </span>
                      <span v-if="caseDetails[c.id]?.gender">
                        • {{ caseDetails[c.id]?.gender }}
                      </span>
                    </p>
                  </div>
                </NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Atypical -->
          <div class="examples-column">
            <h4>Most atypical</h4>
            <ul class="case-list">
              <li v-for="c in atypicalCases" :key="'atypical-' + c.id" class="case-card">
                <NuxtLink :to="`/cases/${c.id}`" class="card-link">
                  <div class="thumb-wrapper">
                    <div v-if="loadingDetail[c.id]" class="thumb loading"></div>
                    <img
                      v-else-if="caseDetails[c.id]?.imagePaths && caseDetails[c.id]?.imagePaths!.length"
                      class="thumb"
                      :src="resolveImageUrl(caseDetails[c.id]!.imagePaths![0])"
                      alt="Case image"
                      loading="lazy"
                    />
                    <div v-else class="thumb placeholder">
                      <span>no image</span>
                    </div>
                  </div>
                  <div class="card-text">
                    <p class="title">
                      {{ caseDetails[c.id]?.diagnosis || c.diagnosis || 'Untitled case' }}
                    </p>
                    <p class="meta">
                      <span v-if="caseDetails[c.id]?.patient_age !== null">
                        Age {{ caseDetails[c.id]?.patient_age }}
                      </span>
                      <span v-if="caseDetails[c.id]?.gender">
                        • {{ caseDetails[c.id]?.gender }}
                      </span>
                    </p>
                  </div>
                </NuxtLink>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.selection-summary {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 0.6rem 0.8rem 0.75rem;
  margin-bottom: 0.6rem; 
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.5rem;
}

.summary-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #2d3748;
}

.summary-header p {
  margin: 0.1rem 0 0;
  color: #718096;
  font-size: 0.9rem;
}

.summary-content {
  display: flex;
  gap: 0.75rem;
  align-items: stretch;
}

.examples-block {
  flex: 1.5 1 0;
}

@media (max-width: 900px) {
  .summary-content {
    flex-direction: column;
  }
}

.summary-block {
  flex: 1 1 0;
  background: #f9fafb;
  border-radius: 10px;
  padding: 0.6rem 0.7rem;

  display: flex; 
  flex-direction: column;
}

.examples-block {
  flex: 1.5 1 0;
  overflow: hidden;
}

.summary-block h3 {
  margin: 0 0 0.4rem;
  font-size: 0.98rem;
  font-weight: 600;
  color: #4a5568;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

@media (max-width: 900px) {
  .examples-grid {
    grid-template-columns: 1fr;
  }
}

.examples-column h4 {
  margin: 0 0 0.35rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #4c51bf;
}

.case-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}

.case-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  transition: box-shadow 0.15s ease, transform 0.1s ease, border-color 0.15s ease;
}

.card-link {
  display: flex;
  text-decoration: none;
  color: inherit;
}

.case-card:hover {
  box-shadow: 0 3px 10px rgba(99, 102, 241, 0.24);
  border-color: #667eea;
  transform: translateY(-1px);
}

.thumb-wrapper {
  flex: 0 0 72px;
  display: flex;
  align-items: stretch;
}

.thumb {
  width: 72px;
  height: 72px;
  object-fit: cover;
  display: block;
}

.thumb.loading {
  background: linear-gradient(90deg, #e2e8f0, #edf2f7, #e2e8f0);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}

.thumb.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #edf2f7;
  color: #a0aec0;
  font-size: 0.7rem;
  text-transform: uppercase;
}

.card-text {
  padding: 0.35rem 0.5rem;
  flex: 1 1 auto;
  min-width: 0;
}

.title {
  margin: 0;
  font-size: 0.86rem;
  font-weight: 600;
  color: #2d3748;
  max-height: 2.5em;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  color: #718096;
}

.empty {
  font-size: 0.9rem;
  color: #718096;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
