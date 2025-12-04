<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import WordCloud from '~/components/charts/WordCloud.vue'
import type { CaseSummary } from '~/composables/useCaseFilters'

type TermItem = { term: string; weight: number }

type GroupSummary = {
  id: string
  name: string
  color: string
  size: number
  topTerms: TermItem[]
  typicalCases: CaseSummary[]
  atypicalCases: CaseSummary[]
}

const props = defineProps<{
  groups: GroupSummary[]
}>()

const config = useRuntimeConfig()
const API_URL = config.public.apiUrl

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

// all IDs across all groups (typical + atypical)
const previewIds = computed<string[]>(() => {
  const ids = new Set<string>()
  for (const g of props.groups) {
    for (const c of g.typicalCases) ids.add(c.id)
    for (const c of g.atypicalCases) ids.add(c.id)
  }
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

// fetch details when groups / preview ids change
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
</script>

<template>
  <section class="selection-summary-comparison" v-if="groups && groups.length">
    <header class="summary-header">
      <div>
        <h2>Group overviews</h2>
        <p>Comparison mode – each card summarizes one group</p>
      </div>
    </header>

    <div class="groups-column">
      <article
        v-for="group in groups"
        :key="group.id"
        class="group-card"
      >
        <header class="group-header">
          <div class="group-title">
            <span
              class="color-dot"
              :style="{ backgroundColor: group.color }"
            />
            <h3>{{ group.name }}</h3>
            <span class="group-size">
              ({{ group.size.toLocaleString() }} cases)
            </span>
          </div>
        </header>

        <div class="group-content">
          <!-- Left: word cloud -->
          <div class="summary-block">
            <h4>Key terms</h4>
            <WordCloud :terms="group.topTerms" />
          </div>

          <!-- Right: examples -->
          <div class="summary-block examples-block">
            <h4>Representative cases</h4>

            <div
              v-if="!group.typicalCases.length && !group.atypicalCases.length"
              class="empty"
            >
              Not enough UMAP information to identify typical or atypical
              cases for this group.
            </div>

            <div v-else class="examples-grid">
              <!-- Typical -->
              <div class="examples-column">
                <h5>Typical</h5>
                <ul class="case-list">
                  <li
                    v-for="c in group.typicalCases"
                    :key="group.id + '-typical-' + c.id"
                    class="case-card"
                  >
                    <NuxtLink :to="`/cases/${c.id}`" class="card-link">
                      <div class="thumb-wrapper">
                        <div
                          v-if="loadingDetail[c.id]"
                          class="thumb loading"
                        ></div>
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
                <h5>Atypical</h5>
                <ul class="case-list">
                  <li
                    v-for="c in group.atypicalCases"
                    :key="group.id + '-atypical-' + c.id"
                    class="case-card"
                  >
                    <NuxtLink :to="`/cases/${c.id}`" class="card-link">
                      <div class="thumb-wrapper">
                        <div
                          v-if="loadingDetail[c.id]"
                          class="thumb loading"
                        ></div>
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
      </article>
    </div>
  </section>
</template>

<style scoped>
.selection-summary-comparison {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 0.5rem 0.7rem 0.6rem;
  margin-bottom: 0.55rem;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.4rem;
}

.summary-header h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #2d3748;
}

.summary-header p {
  margin: 0.05rem 0 0;
  color: #718096;
  font-size: 0.85rem;
}

.groups-column {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

/* Individual group card */

.group-card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f9fafb;
  padding: 0.45rem 0.55rem 0.5rem;
}

.group-header {
  margin-bottom: 0.35rem;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
}

.group-title h3 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 600;
  color: #2d3748;
}

.group-size {
  font-size: 0.82rem;
  color: #718096;
}

.group-content {
  display: flex;
  gap: 0.55rem;
  align-items: stretch;
}

@media (max-width: 900px) {
  .group-content {
    flex-direction: column;
  }
}

/* Blocks inside each group */

.summary-block {
  flex: 1 1 0;
  background: white;
  border-radius: 8px;
  padding: 0.45rem 0.55rem;
  display: flex;
  flex-direction: column;
}

.summary-block h4 {
  margin: 0 0 0.3rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #4a5568;
}

.examples-block {
  flex: 1.6 1 0;
  overflow: hidden;
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
}

@media (max-width: 900px) {
  .examples-grid {
    grid-template-columns: 1fr;
  }
}

.examples-column h5 {
  margin: 0 0 0.25rem;
  font-size: 0.84rem;
  font-weight: 600;
  color: #4c51bf;
}

/* Case cards (same style as SelectionSummary but a bit tighter) */

.case-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.3rem;
}

.case-card {
  background: #f9fafb;
  border-radius: 7px;
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
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.22);
  border-color: #667eea;
  transform: translateY(-1px);
}

.thumb-wrapper {
  flex: 0 0 64px;
  display: flex;
  align-items: stretch;
}

.thumb {
  width: 64px;
  height: 64px;
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
  padding: 0.3rem 0.45rem;
  flex: 1 1 auto;
  min-width: 0;
}

.title {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #2d3748;
  max-height: 2.4em;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: #718096;
}

.empty {
  font-size: 0.82rem;
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
