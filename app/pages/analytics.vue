<script setup lang="ts">
/* =========================
 * Imports
 * =======================*/
import { ref, onMounted, computed, watch } from 'vue'
import GenderBar from '~/components/charts/GenderBar.vue'
import AgeHistogram from '~/components/charts/AgeHistogram.vue'
import ModalityBar from '~/components/charts/ModalityBar.vue'
import RegionBar from '~/components/charts/RegionBar.vue'
import CasesOverTime from '~/components/charts/CasesOverTime.vue'
import MultiSelect from '~/components/ui/MultiSelect.vue'

/* =========================
 * Types
 * =======================*/
type CaseSummary = {
  id: string
  title: string | null
  diagnosis: string | null
  added_on: string | null
  last_edited_on: string | null
  patient_age: number | null
  gender: string | null
  modalities: string[]
  regions: string[]
  imageCount: number
  word_count: number | null
  thumbnail: string | null
  url: string | null
}

type Bin = { binStart: number; binEnd: number; count: number }
type Item = { label: string; count: number }
type Point = { date: Date; count: number }

type Filters = {
  genders: string[]          // e.g., ['Male', 'Female']
  ageMin: number | null
  ageMax: number | null
  dateMin: string | null     // ISO yyyy-mm-dd
  dateMax: string | null
  modalities: string[]
  regions: string[]
}

type SummaryStats = {
  total: number
  medianAge: number | null
  avgImages: number
  avgWords: number
}

/* =========================
 * Constants
 * =======================*/
const AGE_EDGES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, Infinity] as const

/* =========================
 * Utilities (pure)
 * =======================*/
const normalizeGender = (g: string | null): 'Female' | 'Male' | 'Unknown' => {
  if (!g) return 'Unknown'
  const s = g.trim().toLowerCase()
  if (s === 'female' || s === 'f') return 'Female'
  if (s === 'male' || s === 'm') return 'Male'
  return 'Unknown'
}

const isFiniteNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

const makeBins = (): Bin[] => {
  const bins: Bin[] = []
  for (let i = 0; i < AGE_EDGES.length - 1; i++) {
    bins.push({ binStart: AGE_EDGES[i]!, binEnd: AGE_EDGES[i + 1]! - 1, count: 0 })
  }
  // ensure last bin is 90+
  const last = bins[bins.length - 1]
  if (last) last.binEnd = Infinity
  return bins
}

const fmtDate = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(+d)) return '—'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const joinArr = (arr?: string[]) =>
  Array.isArray(arr) && arr.length ? arr.join(', ') : '—'

/* =========================
 * State
 * =======================*/
const rawData = ref<CaseSummary[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const totalCases = ref(0)
const fetchedAt = ref<Date | null>(null)

const config = useRuntimeConfig()
const API_URL = config.public.apiUrl

const filters = ref<Filters>({
  genders: [],
  ageMin: null,
  ageMax: null,
  dateMin: null,
  dateMax: null,
  modalities: [],
  regions: [],
})

/* =========================
 * Available values (computed)
 * =======================*/
const allModalities = computed(() =>
  Array.from(new Set(rawData.value.flatMap(c => c.modalities || []))).sort()
)
const allRegions = computed(() =>
  Array.from(new Set(rawData.value.flatMap(c => c.regions || []))).sort()
)

/* =========================
 * Filtered data
 * =======================*/
const filteredData = computed(() => {
  // Normalize selected modality/region values once
  const norm = (s: string) => s.trim().toLowerCase()
  const selMods = new Set(filters.value.modalities.map(norm))
  const selRegs = new Set(filters.value.regions.map(norm))

  return rawData.value.filter(row => {
    // Gender
    const g = normalizeGender(row.gender)
    if (filters.value.genders.length > 0 && !filters.value.genders.includes(g)) return false

    // Age range
    const min = filters.value.ageMin
    const max = filters.value.ageMax
    if (isFiniteNum(min)) {
      if (row.patient_age == null || row.patient_age < min) return false
    }
    if (isFiniteNum(max)) {
      if (row.patient_age == null || row.patient_age > max) return false
    }

    // Date range
    if (filters.value.dateMin || filters.value.dateMax) {
      if (!row.added_on) return false // exclude unknown dates when a range is set
      const d = new Date(row.added_on)
      if (filters.value.dateMin && d < new Date(filters.value.dateMin)) return false
      if (filters.value.dateMax && d > new Date(filters.value.dateMax)) return false
    }

    // Modalities (match ANY selected)
    if (selMods.size > 0) {
      const mods = (row.modalities || []).map(norm)
      const hasAny = mods.some(m => selMods.has(m))
      if (!hasAny) return false
    }

    // Regions (match ANY selected)
    if (selRegs.size > 0) {
      const regs = (row.regions || []).map(norm)
      const hasAny = regs.some(r => selRegs.has(r))
      if (!hasAny) return false
    }

    return true
  })
})

/* =========================
 * Filters actions
 * =======================*/
const resetFilters = () => {
  filters.value = {
    genders: [],
    ageMin: null,
    ageMax: null,
    dateMin: null,
    dateMax: null,
    modalities: [],
    regions: [],
  }
}

/* =========================
 * KPI summary (computed)
 * =======================*/
const summaryStats = computed<SummaryStats>(() => {
  const n = filteredData.value.length
  if (n === 0) {
    return { total: 0, medianAge: null, avgImages: 0, avgWords: 0 }
  }

  // Median age
  const ages = filteredData.value
    .map(c => c.patient_age)
    .filter((a): a is number => typeof a === 'number' && Number.isFinite(a))
  ages.sort((a, b) => a - b)

  let medianAge: number | null = null
  if (ages.length > 0) {
    const mid = Math.floor(ages.length / 2)
    medianAge = ages.length % 2 !== 0
      ? ages[mid]!
      : (ages[mid - 1]! + ages[mid]!) / 2
  }

  // Averages
  const avgImages =
    filteredData.value.reduce((sum, c) => sum + (c.imageCount || 0), 0) / n
  const avgWords =
    filteredData.value.reduce((sum, c) => sum + (c.word_count || 0), 0) / n

  return { total: n, medianAge, avgImages, avgWords }
})

/* =========================
 * Chart series (computed)
 * =======================*/
const genderCounts = computed<Item[]>(() => {
  const counts = { Female: 0, Male: 0, Unknown: 0 }
  for (const row of filteredData.value) counts[normalizeGender(row.gender)]++
  return Object.entries(counts).map(([label, count]) => ({ label, count }))
})

const ageBins = computed<Bin[]>(() => {
  const bins = makeBins()
  for (const row of filteredData.value) {
    if (row.patient_age == null || isNaN(Number(row.patient_age))) continue
    const a = Number(row.patient_age)
    for (let i = 0; i < AGE_EDGES.length - 1; i++) {
      const start = AGE_EDGES[i]
      const end = AGE_EDGES[i + 1]
      if (start !== undefined && end !== undefined && a >= start && a < end) {
        bins[i]!.count++
        break
      }
    }
  }
  return bins
})

const unknownAgeCount = computed(() =>
  filteredData.value.filter(r => r.patient_age == null || isNaN(Number(r.patient_age))).length
)

const modalityCounts = computed<Item[]>(() => {
  const map = new Map<string, number>()
  for (const row of filteredData.value) {
    for (const mod of row.modalities || []) {
      if (mod) map.set(mod, (map.get(mod) ?? 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
})

const regionCounts = computed<Item[]>(() => {
  const map = new Map<string, number>()
  for (const row of filteredData.value) {
    for (const r of row.regions || []) {
      if (r) map.set(r, (map.get(r) ?? 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
})

const casesOverTime = computed<Point[]>(() => {
  const monthCounts = new Map<string, number>()
  const re = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/

  for (const row of filteredData.value) {
    const s = row.added_on
    if (!s) continue
    const m = re.exec(s.trim())
    if (!m) continue
    const y = Number(m[1])
    const mon = Number(m[2])
    if (!Number.isFinite(y) || !Number.isFinite(mon) || y < 1900 || y > 2100 || mon < 1 || mon > 12) continue
    const key = `${y}-${String(mon).padStart(2, '0')}-01`
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1)
  }

  if (monthCounts.size === 0) return []
  const keys = Array.from(monthCounts.keys()).sort()
  const start = new Date(keys[0]!)
  const end = new Date(keys[keys.length - 1]!)

  const series: Point[] = []
  const d = new Date(start)
  d.setDate(1)
  while (d <= end) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    series.push({ date: new Date(d), count: monthCounts.get(key) ?? 0 })
    d.setMonth(d.getMonth() + 1)
  }
  return series
})

/* =========================
 * Table (computed & actions)
 * =======================*/
const tableLimit = ref(50)
const visibleRows = computed(() => filteredData.value.slice(0, tableLimit.value))
const hasMoreRows = computed(() => filteredData.value.length > tableLimit.value)
const showMoreRows = () => { tableLimit.value += 50 }

// Reset paging when filters change (nice UX + avoids stale pagination)
watch(filters, () => { tableLimit.value = 50 }, { deep: true })

// Signature to force clean table remount when any filter changes (avoids stale DOM reuse)
const filtersSignature = computed(() =>
  JSON.stringify({
    genders: [...filters.value.genders].sort(),
    ageMin: filters.value.ageMin,
    ageMax: filters.value.ageMax,
    dateMin: filters.value.dateMin,
    dateMax: filters.value.dateMax,
    modalities: [...filters.value.modalities].map(s => s.trim().toLowerCase()).sort(),
    regions: [...filters.value.regions].map(s => s.trim().toLowerCase()).sort(),
  })
)

/* =========================
 * Fetch
 * =======================*/
const loadData = async () => {
  try {
    loading.value = true
    error.value = null
    const res = await fetch(`${API_URL}/api/cases/summary_all`)
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
    const json = await res.json()
    if (!Array.isArray(json)) throw new Error('Unexpected response shape')
    rawData.value = json as CaseSummary[]
    totalCases.value = rawData.value.length
    fetchedAt.value = new Date()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="analytics-page">
    <div class="container">
      <div class="page-header">
        <h1>Analytics</h1>
        <p v-if="!loading && !error">
          Loaded <strong>{{ totalCases }}</strong> cases • Fetched at {{ fetchedAt?.toLocaleString() }}
          <button class="refresh-btn" @click="loadData" :disabled="loading" title="Refresh data">⟳ Refresh</button>
        </p>
      </div>

      <!-- Filters -->
      <div class="filters-panel">
        <!-- Gender -->
        <div class="filter-group">
          <h4>Gender</h4>
          <div class="pill-group">
            <button
              v-for="g in ['Male','Female','Unknown']"
              :key="g"
              :class="['pill', filters.genders.includes(g) && 'active']"
              @click="filters.genders.includes(g)
                ? filters.genders = filters.genders.filter(x => x !== g)
                : filters.genders.push(g)"
            >
              {{ g }}
            </button>
          </div>
        </div>

        <!-- Age -->
        <div class="filter-group">
          <h4>Age range</h4>
          <div class="range-group">
            <input type="number" v-model.number="filters.ageMin" placeholder="Min" />
            <span>–</span>
            <input type="number" v-model.number="filters.ageMax" placeholder="Max" />
          </div>
        </div>

        <!-- Modalities -->
        <div class="filter-group push-bottom">
          <MultiSelect label="Modalities" :options="allModalities" v-model="filters.modalities" />
        </div>

        <!-- Regions -->
        <div class="filter-group push-bottom">
          <MultiSelect label="Regions" :options="allRegions" v-model="filters.regions" />
        </div>

        <!-- Date -->
        <div class="filter-group">
          <h4>Date added</h4>
          <div class="range-group">
            <input type="date" v-model="filters.dateMin" />
            <span>–</span>
            <input type="date" v-model="filters.dateMax" />
          </div>
        </div>

        <div class="filters-footer">
          <button class="reset-btn" @click="resetFilters">Reset filters</button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="summary-grid" v-if="!loading && !error">
        <div class="summary-card">
          <h3>{{ summaryStats.total.toLocaleString() }}</h3>
          <p>Filtered Cases</p>
        </div>
        <div class="summary-card">
          <h3 v-if="summaryStats.medianAge !== null">{{ summaryStats.medianAge }}</h3>
          <h3 v-else>—</h3>
          <p>Median Age</p>
        </div>
        <div class="summary-card">
          <h3>{{ summaryStats.avgImages.toFixed(1) }}</h3>
          <p>Avg. Images per Case</p>
        </div>
        <div class="summary-card">
          <h3>{{ summaryStats.avgWords.toFixed(0) }}</h3>
          <p>Avg. Word Count</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="center-block">
        <div class="loader"></div>
        <p>Loading analytics data…</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="center-block error">
        <p>❌ Error loading analytics: {{ error }}</p>
        <button @click="loadData" class="retry-btn">Retry</button>
      </div>

      <!-- Charts + Table -->
      <div v-else class="content">
        <div class="charts-grid">
          <!-- Top row -->
          <div class="chart-card">
            <ClientOnly><GenderBar :items="genderCounts" /></ClientOnly>
          </div>
          <div class="chart-card">
            <ClientOnly><AgeHistogram :bins="ageBins" :unknown-count="unknownAgeCount" /></ClientOnly>
          </div>

          <!-- Middle row (full width) -->
          <div class="chart-card full">
            <ClientOnly><CasesOverTime :series="casesOverTime" /></ClientOnly>
          </div>

          <!-- Bottom row -->
          <div class="chart-card">
            <ClientOnly><ModalityBar :items="modalityCounts" /></ClientOnly>
          </div>
          <div class="chart-card">
            <ClientOnly><RegionBar :items="regionCounts" :max-visible="15" /></ClientOnly>
          </div>
        </div>

        <!-- Data table -->
        <div class="table-card">
          <div class="table-header">
            <div class="left">
              <h3>Cases</h3>
              <p>Showing {{ visibleRows.length.toLocaleString() }} of {{ filteredData.length.toLocaleString() }}</p>
            </div>
          </div>

          <div class="table-scroll">
            <!-- Key forces remount when filters change to avoid stale DOM -->
            <table class="cases-table" :key="filtersSignature">
              <thead>
                <tr>
                  <th>Diagnosis</th>
                  <th>Added</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Modalities</th>
                  <th>Regions</th>
                  <th>Images</th>
                  <th>Words</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in visibleRows" :key="row.id + ':' + i">
                  <td class="id wrap" :title="row.diagnosis ?? undefined">
                    <NuxtLink :to="`/cases/${row.id}`">{{ row.diagnosis }}</NuxtLink>
                  </td>
                  <td>{{ fmtDate(row.added_on) }}</td>
                  <td>{{ row.patient_age ?? '—' }}</td>
                  <td>{{ row.gender ?? '—' }}</td>
                  <td class="wrap" :title="joinArr(row.modalities)">{{ joinArr(row.modalities) }}</td>
                  <td class="wrap" :title="joinArr(row.regions)">{{ joinArr(row.regions) }}</td>
                  <td class="num">{{ row.imageCount ?? 0 }}</td>
                  <td class="num">{{ row.word_count ?? 0 }}</td>
                </tr>
                <tr v-if="visibleRows.length === 0">
                  <td colspan="8" class="empty">No cases match the current filters.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="hasMoreRows" class="table-footer right">
            <button class="show-more-btn" @click="showMoreRows">Show more</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Page */
.analytics-page { min-height: calc(100vh - 80px); background: #f5f7fa; }
.container { max-width: 1200px; margin: 0 auto; padding: 2rem; }

/* Header */
.page-header { text-align: center; margin-bottom: 1.25rem; }
.page-header h1 { font-size: 2rem; font-weight: 700; color: #2d3748; margin-bottom: 0.25rem; }
.page-header p { color: #4a5568; }
.refresh-btn {
  margin-left: .5rem; padding: .25rem .6rem; border: 1px solid #cbd5e0; border-radius: 6px;
  background: #f7fafc; color: #2d3748; font-size: .85rem; cursor: pointer;
}
.refresh-btn:hover { background: #e2e8f0; }
.refresh-btn:disabled { opacity: .6; cursor: not-allowed; }

/* Loader / error */
.center-block { text-align: center; padding: 4rem 1rem; }
.loader {
  border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%;
  width: 48px; height: 48px; animation: spin 1s linear infinite; margin: 0 auto 1rem;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.error { color: #e53e3e; }
.retry-btn {
  margin-top: 1rem; padding: 0.6rem 1.25rem; background: #667eea; color: white;
  border: none; border-radius: 8px; cursor: pointer;
}
.retry-btn:hover { background: #5568d3; }

/* Content grid */
.content { display: grid; gap: 1rem; }

/* Charts grid (12-col) */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 1.5rem;
  align-items: start;
}
.chart-card {
  grid-column: span 6;
  background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); padding: 1rem;
  min-width: 0; /* allow shrinking */
}
.chart-card.full { grid-column: 1 / -1; }

@media (max-width: 900px) {
  .chart-card, .chart-card.full { grid-column: 1 / -1; }
}

/* Filters panel */
.filters-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.2rem;
  background: white; padding: 1.25rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  margin-bottom: 1.75rem;
}
.filter-group { display: flex; flex-direction: column; justify-content: flex-start; }
.filter-group h4 { margin-bottom: 0.5rem; font-size: 0.95rem; font-weight: 700; color: #2d3748; }
.range-group { display: flex; align-items: center; gap: 0.5rem; }
.range-group input {
  width: 100%; padding: 0.4rem 0.6rem; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 0.9rem;
}
.pill-group { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.pill {
  border: 1px solid #cbd5e0; background: #edf2f7; color: #2d3748; border-radius: 20px;
  padding: 0.3rem 0.8rem; font-size: 0.85rem; cursor: pointer; transition: all .15s ease;
}
.pill:hover { background: #e2e8f0; }
.pill.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-color: transparent;
}

/* Push MultiSelects to bottom of their tile */
.push-bottom { display: flex; flex-direction: column; justify-content: flex-end; }
:deep(.ms) { width: 100%; }
:deep(.ms-btn) { min-height: 36px; }

/* Filters footer */
.filters-footer {
  grid-column: 1 / -1; display: flex; justify-content: flex-end; margin-top: 0.5rem;
}
.reset-btn {
  background: #edf2f7; color: #2d3748; border: 1px solid #cbd5e0; border-radius: 8px;
  padding: 0.4rem 0.9rem; font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.15s ease;
}
.reset-btn:hover { background: #e2e8f0; }

/* KPIs */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem; margin-bottom: 1.75rem;
}
.summary-card {
  background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 1rem; text-align: center;
}
.summary-card h3 { font-size: 1.5rem; color: #2d3748; margin-bottom: 0.25rem; }
.summary-card p { color: #718096; font-size: 0.9rem; }

/* Table */
.table-card {
  background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 1rem; margin-top: .5rem; min-width: 0; /* allow shrinking */
}
.table-header, .table-footer {
  display: flex; justify-content: space-between; align-items: center; gap: .75rem; margin-bottom: .75rem;
}
.table-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #2d3748; }
.table-header p { margin: 0; color: #718096; font-size: .9rem; }
.table-footer { margin-top: 0.75rem; display: flex; justify-content: flex-end; }

.table-scroll {
  overflow: auto; border: 1px solid #e2e8f0; border-radius: 10px;
  max-width: 100%; width: 100%;
}
.cases-table {
  width: 100%; border-collapse: separate; border-spacing: 0; background: white;
  min-width: 720px; /* allow horizontal scroll on small screens */
}
.cases-table thead th {
  position: sticky; top: 0; background: #f7fafc; color: #4a5568;
  font-weight: 700; font-size: .9rem; text-align: left; padding: .6rem .75rem;
  border-bottom: 1px solid #e2e8f0; white-space: nowrap;
}
.cases-table tbody td {
  padding: .55rem .75rem; border-bottom: 1px solid #edf2f7; color: #2d3748; font-size: .92rem; vertical-align: top;
}
.cases-table tbody tr:last-child td { border-bottom: none; }
.cases-table td.wrap { white-space: nowrap; max-width: 280px; overflow: hidden; text-overflow: ellipsis; }
.cases-table td.num { text-align: right; }
.cases-table td.id a { color: #4c51bf; text-decoration: none; font-weight: 600; }
.cases-table td.id a:hover { text-decoration: underline; }
.cases-table td.empty { text-align: center; color: #718096; padding: 1rem; }

/* Buttons */
.show-more-btn {
  padding: 0.5rem 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 500; cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}
.show-more-btn:hover { background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%); transform: translateY(-1px); }
.show-more-btn:active { transform: translateY(0); }

/* Container safety on mobile */
.container { overflow-x: hidden; }
</style>
