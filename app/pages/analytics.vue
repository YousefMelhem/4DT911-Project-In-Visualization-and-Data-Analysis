<script setup lang="ts">
/* =========================
 * Imports
 * =======================*/
import { ref, onMounted, computed, watch } from 'vue'
import GenderBar from '~/components/charts/GenderBar.vue'
import GenderBarComparison from '~/components/charts/GenderBarComparison.vue'
import AgeHistogram from '~/components/charts/AgeHistogram.vue'
import AgeComparisonKDE from '~/components/charts/AgeComparisonKDE.vue'
import ModalityBar from '~/components/charts/ModalityBar.vue'
import RegionBar from '~/components/charts/RegionBar.vue'
import CasesOverTime from '~/components/charts/CasesOverTime.vue'
import CasesOverTimeComparison from '~/components/charts/CasesOverTimeComparison.vue'
import DiagnosisUMAP from '~/components/charts/DiagnosisUMAP.vue'
import SectionsCoverageBar from '~/components/charts/SectionsCoverageBar.vue'
import SectionByGroupHeatmap from '~/components/charts/SectionByGroupHeatmap.vue'
import ModalityHeatmap from '~/components/charts/ModalityHeatmap.vue'
import ModalityGroupHeatmap from '~/components/charts/ModalityGroupHeatmap.vue'
import RegionGroupHeatmap from '~/components/charts/RegionGroupHeatmap.vue'
import RegionHeatmap from '~/components/charts/RegionHeatmap.vue'
import ModalityRegionHeatmap from '~/components/charts/ModalityRegionHeatmap.vue'
import DialogBox from '~/components/popup/DialogBox.vue'
import CaseFiltersPanel from '~/components/filters/CaseFiltersPanel.vue'
import SelectionSummaryPanel from '~/components/analytics/SelectionSummaryPanel.vue'
import SelectionSummaryComparisonPanel from '~/components/analytics/SelectionSummaryComparisonPanel.vue'
import CohortPanel from '~/components/analytics/CohortPanel.vue'
import {
  useCaseFilters,
  type CaseSummary,
} from '~/composables/useCaseFilters'

/* =========================
 * Types
 * =======================*/
type Item = { label: string; count: number }
type Point = { date: Date; count: number }
type ModalityMatrix = { labels: string[]; grid: number[][] }
type RegionMatrix = ModalityMatrix
type ModalityRegionMatrix = { rowLabels: string[]; colLabels: string[]; grid: number[][] }

type ModalityGroupMatrix = {
  modalities: string[]
  groups: {
    id: string
    name: string
    color: string
    total: number
  }[]
  counts: number[][]
}

type SectionGroupMatrix = {
  sections: string[]
  groups: {
    id: string
    name: string
    color: string
    total: number
  }[]
  counts: number[][]
}

type RegionGroupMatrix = {
  regions: string[]
  groups: {
    id: string
    name: string
    color: string
    total: number
  }[]
  counts: number[][]
}


type DiagnosisUMAPInfo = {
  x: number
  y: number
  cluster: number
  frequency: number
}

type CaseWithCoords = {
  caseData: CaseSummary
  x: number
  y: number
  dist?: number
}

type Cohort = {
  id: string
  name: string
  caseIds: Array<CaseSummary['id']>
  size: number
  createdAt: string
  color: string
}

type ComparisonGroupSummary = {
  id: string
  name: string
  color: string
  size: number
  topTerms: TermItem[]
  typicalCases: CaseSummary[]
  atypicalCases: CaseSummary[]
}

type GenderComparisonSeries = {
  cohortId: string
  cohortName: string
  color: string
  items: Item[]
  total: number
}

type TimeComparisonSeries = {
  id: string
  name: string
  color: string
  size: number
  series: Point[]
}


type TermItem = { term: string; weight: number }

/**Brushing & linking selection**/
type InteractionSelection =
  | { type: 'gender'; value: string }
  | { type: 'ageBin'; binStart: number; binEnd: number | 'Infinity' }
  | { type: 'modality'; value: string }
  | { type: 'region'; value: string }
  | { type: 'section'; value: string }
  | { type: 'modality-region'; modality: string; region: string }

type TimeBrushRange = { start: Date; end: Date }

/* =========================
 * Utilities (pure)
 * =======================*/
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

/** Basic tokenizer for diagnosis text */
const STOPWORDS = new Set([
  'and', 'the', 'case', 'patient', 'with', 'for', 'of', 'in', 'on', 'from',
  'a', 'an', 'to', 'at', 'by', 'without', 'male', 'female', 'old', 'year',
  'years', 'man', 'woman', 'boy', 'girl'
])

const tokenizeDiagnosis = (text: string): string[] => {
  return text
    .toLowerCase()
    .split(/[^a-z]+/i)
    .map(s => s.trim())
    .filter(s => s.length >= 3 && !STOPWORDS.has(s))
}

/** Generic symmetric co-occurrence matrix builder */
const buildCoocMatrix = (
  rows: CaseSummary[],
  allLabels: string[],
  getLabelsForRow: (row: CaseSummary) => readonly string[]
): ModalityMatrix => {
  // fixed axes from the full dataset
  const labels = allLabels.slice()
  const n = labels.length

  const index = new Map<string, number>()
  labels.forEach((label, i) => index.set(label, i))

  const grid: number[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => 0)
  )

  for (const row of rows) {
    const raw = getLabelsForRow(row) ?? []
    const unique = Array.from(new Set(raw.filter(Boolean)))

    for (let i = 0; i < unique.length; i++) {
      const a = index.get(unique[i]!)
      if (a === undefined) continue
      for (let j = i; j < unique.length; j++) {
        const b = index.get(unique[j]!)
        if (b === undefined) continue

        const rowA = grid[a]!
        rowA[b] = (rowA[b] ?? 0) + 1
        if (a !== b) {
          const rowB = grid[b]!
          rowB[a] = (rowB[a] ?? 0) + 1
        }
      }
    }
  }

  return { labels, grid }
}

/** Modality × Region matrix (rows = regions, cols = modalities) */
const buildModalityRegionMatrix = (
  rows: CaseSummary[],
  allRegions: string[],
  allModalities: string[],
  getRegionsForRow: (row: CaseSummary) => readonly string[],
  getModalitiesForRow: (row: CaseSummary) => readonly string[]
): ModalityRegionMatrix => {
  const rowLabels = allRegions.slice()
  const colLabels = allModalities.slice()

  const rCount = rowLabels.length
  const cCount = colLabels.length

  const rowIndex = new Map<string, number>()
  rowLabels.forEach((label, i) => rowIndex.set(label, i))

  const colIndex = new Map<string, number>()
  colLabels.forEach((label, i) => colIndex.set(label, i))

  const grid: number[][] = Array.from({ length: rCount }, () =>
    Array.from({ length: cCount }, () => 0)
  )

  for (const row of rows) {
    const regions = Array.from(new Set(getRegionsForRow(row).filter(Boolean)))
    const mods = Array.from(new Set(getModalitiesForRow(row).filter(Boolean)))
    if (!regions.length || !mods.length) continue

    for (const reg of regions) {
      const ri = rowIndex.get(reg)
      if (ri === undefined) continue
      const rowArr = grid[ri]!
      for (const mod of mods) {
        const ci = colIndex.get(mod)
        if (ci === undefined) continue
        rowArr[ci] = (rowArr[ci] ?? 0) + 1
      }
    }
  }

  return { rowLabels, colLabels, grid }
}

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

const { error: showError } = useDialog()


/* =========================
 * Cohorts (saved groups)
 * =======================*/
const cohorts = ref<Cohort[]>([])
const activeCohortId = ref<string | null>(null)
const comparisonMode = ref(false)

/**
 * Base dataset for all downstream filtering.
 * If a cohort is active, we restrict the raw data to that cohort's case IDs.
 * Otherwise we use the full rawData.
 */
const effectiveRawData = computed<CaseSummary[]>(() => {
  const currentId = activeCohortId.value
  if (!currentId) return rawData.value

  const cohort = cohorts.value.find(c => c.id === currentId)
  if (!cohort) return rawData.value

  const idSet = new Set<CaseSummary['id']>(cohort.caseIds)
  return rawData.value.filter(row => idSet.has(row.id))
})

/* Cohort Colors */
const COHORT_COLORS = [
  '#E53E3E', // red
  '#3182CE', // blue
  '#38A169', // green
  '#D69E2E', // gold
  '#805AD5', // purple
  '#DD6B20', // orange
  '#319795', // teal
]

const nextCohortColor = (): string => {
  const paletteSize = COHORT_COLORS.length
  if (paletteSize === 0) {
    // Fallback color (should never really happen)
    return '#667eea'
  }

  const index = cohorts.value.length % paletteSize
  // `||` (or `??`) guarantees a string even with noUncheckedIndexedAccess
  return COHORT_COLORS[index] || '#667eea'
}




// Shared filters + filtered data via composable
const {
  filters,
  allModalities,
  regionGroups,
  filteredData,
  summaryStats,
  ageBins,
  unknownAgeCount,
  resetFiltersLocal,
  normalizeGender,
  getCaseMainRegions,
  getCaseSubregions,
} = useCaseFilters(effectiveRawData)

/* =========================
 * Derived lists for axes
 * =======================*/

// Main regions list for axes (all cases, not just filtered)
// ensures regions always show even if 0 in current selection
const allMainRegions = computed<string[]>(() => {
  const set = new Set<string>()
  for (const row of rawData.value) {
    for (const main of getCaseMainRegions(row)) {
      if (main) set.add(main)
    }
  }
  return Array.from(set).sort()
})

// All regions list for axes (based on subregions, new Imaging Category style)
const allRegions = computed<string[]>(() => {
  const set = new Set<string>()
  for (const row of rawData.value) {
    for (const r of getCaseSubregions(row)) {
      if (r) set.add(r)
    }
  }
  return Array.from(set).sort()
})


/* =========================
 * Filters actions
 * =======================*/
const resetFilters = () => {
  resetFiltersLocal()
}

/* =========================
 * Chart series (computed)
 * =======================*/
const genderCounts = computed<Item[]>(() => {
  const counts = { Female: 0, Male: 0, Unknown: 0 }
  for (const row of filteredData.value) counts[normalizeGender(row.gender)]++
  return Object.entries(counts).map(([label, count]) => ({ label, count }))
})

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



// Text-section coverage (base, all filtered cases)
const sectionCoverage = computed<Item[]>(() => {
  const counts: {
    History: number
    Exam: number
    Findings: number
    Diagnosis: number
    Treatment: number
    Discussion: number
  } = {
    History: 0,
    Exam: 0,
    Findings: 0,
    Diagnosis: 0,
    Treatment: 0,
    Discussion: 0,
  }

  for (const row of filteredData.value) {
    if (row.has_history) counts.History++
    if (row.has_exam) counts.Exam++
    if (row.has_findings) counts.Findings++
    if (row.has_diagnosis) counts.Diagnosis++
    if (row.has_treatment) counts.Treatment++
    if (row.has_discussion) counts.Discussion++
  }

  return Object.entries(counts).map(([label, count]) => ({ label, count }))
})

// Modality co-occurrence (base, all filtered cases)
const modalityCooc = computed<ModalityMatrix>(() =>
  buildCoocMatrix(filteredData.value, allModalities.value, (row) => row.modalities ?? [])
)

// Region co-occurrence (main regions only, base)
const regionCooc = computed<RegionMatrix>(() =>
  buildCoocMatrix(filteredData.value, allMainRegions.value, getCaseMainRegions)
)

// Modality × Region (base, all filtered cases)
const modalityRegionMatrix = computed<ModalityRegionMatrix>(() =>
  buildModalityRegionMatrix(
    filteredData.value,
    allMainRegions.value,
    allModalities.value,
    getCaseMainRegions,
    (row) => row.modalities ?? []
  )
)


type AgeComparisonSeries = {
  id: string
  name: string
  color: string
  values: number[]
  total: number
  unknown: number
}

const ageComparisonSeries = computed<AgeComparisonSeries[]>(() => {
  return cohorts.value
    .map(cohort => {
      const idSet = new Set<CaseSummary['id']>(cohort.caseIds)
      const rows = rawData.value.filter(row => idSet.has(row.id))

      const values: number[] = []
      let unknown = 0

      for (const row of rows) {
        const age = row.patient_age
        if (typeof age === 'number' && Number.isFinite(age)) {
          values.push(age)
        } else {
          unknown++
        }
      }

      return {
        id: cohort.id,
        name: cohort.name,
        color: cohort.color,
        values,
        total: rows.length,
        unknown,
      }
    })
    // need at least a couple of ages to form a curve
    .filter(s => s.values.length >= 2)
})


const modalityGroupMatrix = computed<ModalityGroupMatrix>(() => {
  // Only meaningful in comparison mode with cohorts
  if (!comparisonMode.value || cohorts.value.length === 0) {
    return { modalities: [], groups: [], counts: [] }
  }

  const modalities = allModalities.value.slice()

  // Build group metadata (static cohorts, using rawData)
  const groups = cohorts.value
    .map(cohort => {
      const idSet = new Set<CaseSummary['id']>(cohort.caseIds)
      const rows = rawData.value.filter(row => idSet.has(row.id))
      return {
        id: cohort.id,
        name: cohort.name,
        color: cohort.color,
        total: rows.length,
      }
    })
    .filter(g => g.total > 0)

  if (!modalities.length || !groups.length) {
    return { modalities: [], groups: [], counts: [] }
  }

  // counts[rowIdx][colIdx] = number of cases in group colIdx that have modality rowIdx
  const counts: number[][] = modalities.map(() => Array(groups.length).fill(0))

  for (let gIdx = 0; gIdx < groups.length; gIdx++) {
    const groupMeta = groups[gIdx]!
    const cohort = cohorts.value.find(c => c.id === groupMeta.id)
    if (!cohort) continue

    const idSet = new Set<CaseSummary['id']>(cohort.caseIds)

    for (const row of rawData.value) {
      if (!idSet.has(row.id)) continue
      const rowMods = row.modalities ?? []
      if (!rowMods.length) continue

      for (let mIdx = 0; mIdx < modalities.length; mIdx++) {
        const mod = modalities[mIdx]!
        if (rowMods.includes(mod)) {
          counts[mIdx]![gIdx]!++
        }
      }
    }
  }

  return { modalities, groups, counts }
})


const SECTION_LABELS = [
  'History',
  'Exam',
  'Findings',
  'Diagnosis',
  'Treatment',
  'Discussion',
] as const

const sectionGroupMatrix = computed<SectionGroupMatrix>(() => {
  const sections = SECTION_LABELS.slice() as string[]

  // Only meaningful in comparison mode with cohorts
  if (!comparisonMode.value || cohorts.value.length === 0) {
    return { sections, groups: [], counts: [] }
  }

  // Build group metadata (static cohorts, using rawData)
  const groups = cohorts.value
    .map(cohort => {
      const idSet = new Set<CaseSummary['id']>(cohort.caseIds)
      const rows = rawData.value.filter(row => idSet.has(row.id))
      return {
        id: cohort.id,
        name: cohort.name,
        color: cohort.color,
        total: rows.length,
      }
    })
    .filter(g => g.total > 0)

  if (!sections.length || !groups.length) {
    return { sections, groups: [], counts: [] }
  }

  // counts[sectionIdx][groupIdx] = number of cases in group g that have that section
  const counts: number[][] = sections.map(
    () => Array.from({ length: groups.length }, () => 0)
  )

  for (let gIdx = 0; gIdx < groups.length; gIdx++) {
    const groupMeta = groups[gIdx]!
    const cohort = cohorts.value.find(c => c.id === groupMeta.id)
    if (!cohort) continue

    const idSet = new Set<CaseSummary['id']>(cohort.caseIds)

    // helper so TS is happy with indexing
    const inc = (sectionIndex: number) => {
      const rowArr = counts[sectionIndex]
      if (!rowArr) return
      const current = rowArr[gIdx] ?? 0
      rowArr[gIdx] = current + 1
    }

    for (const row of rawData.value) {
      if (!idSet.has(row.id)) continue

      if (row.has_history)   inc(0)
      if (row.has_exam)      inc(1)
      if (row.has_findings)  inc(2)
      if (row.has_diagnosis) inc(3)
      if (row.has_treatment) inc(4)
      if (row.has_discussion)inc(5)
    }
  }

  return { sections, groups, counts }
})


const regionGroupMatrix = computed<RegionGroupMatrix>(() => {
  const regions = allRegions.value.slice()

  // Only meaningful in comparison mode with cohorts
  if (!comparisonMode.value || cohorts.value.length === 0) {
    return { regions, groups: [], counts: [] }
  }

  // Build group metadata (static cohorts, using rawData)
  const groups = cohorts.value
    .map(cohort => {
      const idSet = new Set<CaseSummary['id']>(cohort.caseIds)
      const rows = rawData.value.filter(row => idSet.has(row.id))
      return {
        id: cohort.id,
        name: cohort.name,
        color: cohort.color,
        total: rows.length,
      }
    })
    .filter(g => g.total > 0)

  if (!regions.length || !groups.length) {
    return { regions, groups: [], counts: [] }
  }

  const regionIndex = new Map<string, number>()
  regions.forEach((label, i) => regionIndex.set(label, i))

  // counts[regionIdx][groupIdx] = #cases in group that have that region
  const counts: number[][] = regions.map(
    () => Array.from({ length: groups.length }, () => 0)
  )

  for (let gIdx = 0; gIdx < groups.length; gIdx++) {
    const groupMeta = groups[gIdx]!
    const cohort = cohorts.value.find(c => c.id === groupMeta.id)
    if (!cohort) continue

    const idSet = new Set<CaseSummary['id']>(cohort.caseIds)

    for (const row of rawData.value) {
      if (!idSet.has(row.id)) continue

      const rowRegions = getCaseSubregions(row)
      if (!rowRegions.length) continue

      // Unique regions per case (you currently have max 1, but this is safe)
      const unique = Array.from(new Set(rowRegions.filter(Boolean)))

      for (const reg of unique) {
        const rIdx = regionIndex.get(reg)
        if (rIdx === undefined) continue
        const rowArr = counts[rIdx]
        if (!rowArr) continue
        rowArr[gIdx] = (rowArr[gIdx] ?? 0) + 1
      }
    }
  }

  return { regions, groups, counts }
})



/* =========================
 * UMAP Cluster Interaction
 * =======================*/
const umapMode = ref<'text' | 'image'>('text')
const selectedCluster = ref<number | null>(null)
const selectedDiagnoses = ref<Set<string>>(new Set())

// Load diagnosis→cluster mapping for filtering
const clusterData = ref<Map<string, number>>(new Map())
const imageClusterData = ref<Map<string, number>>(new Map())

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
      console.log(`Loaded ${mapping.size} text diagnosis-cluster mappings`)
    }
  } catch (e) {
    console.warn('Could not load text cluster mapping:', e)
  }
}

const loadImageClusterMapping = async () => {
  try {
    const response = await fetch(`${API_URL}/data/features/diagnosis_image_clusters.json`)
    if (response.ok) {
      const data = await response.json()
      const mapping = new Map<string, number>()
      data.diagnoses.forEach((diag: string, i: number) => {
        mapping.set(diag.toLowerCase(), data.clusters[i])
      })
      imageClusterData.value = mapping
      console.log(`Loaded ${mapping.size} image diagnosis-cluster mappings`)
    }
  } catch (e) {
    console.warn('Could not load image cluster mapping:', e)
  }
}

// Filter data by selected cluster
const clusterFilteredData = computed<CaseSummary[]>(() => {
  if (selectedCluster.value === null) return filteredData.value

  const activeClusterData = umapMode.value === 'text' ? clusterData.value : imageClusterData.value

  return filteredData.value.filter(row => {
    if (!row.diagnosis) return false
    const diagLower = row.diagnosis.toLowerCase()
    const cluster = activeClusterData.get(diagLower)
    return cluster === selectedCluster.value
  })
});

const handleClusterClick = (clusterId: number) => {
  if (selectedCluster.value === clusterId) {
    selectedCluster.value = null
  } else {
    selectedCluster.value = clusterId
  }
}

const handleDiagnosisClick = (diagnosis: string) => {
  // Navigate to cases page filtered by this diagnosis
  navigateTo(`/cases?diagnosis=${encodeURIComponent(diagnosis)}`)
}

// Handle UMAP point selection
interface DiagnosisPoint {
  diagnosis: string
  cluster: number
  frequency: number
  umap_x: number
  umap_y: number
}

const selectedUMAPPoints = ref<DiagnosisPoint[]>([])
const selectedDiagnosisNames = ref<Set<string>>(new Set())

const handleUMAPSelection = (points: DiagnosisPoint[]) => {
  selectedUMAPPoints.value = points
  selectedDiagnosisNames.value = new Set(points.map(p => p.diagnosis.toLowerCase()))

  // Show summary of selected clusters
  const clusterSet = new Set(points.map(p => p.cluster))
  const clusterCount = clusterSet.size

  if (points.length > 0) {
    console.log(`📊 Selected ${points.length} points from ${clusterCount} cluster(s)`)
  }
}

// Filter data by UMAP selection (diagnosis-level)
const selectionFilteredData = computed<CaseSummary[]>(() => {
  // First apply cluster filter
  let data = clusterFilteredData.value

  // Then apply UMAP selection filter if any points are selected
  if (selectedDiagnosisNames.value.size > 0) {
    data = data.filter(row => {
      if (!row.diagnosis) return false
      return selectedDiagnosisNames.value.has(row.diagnosis.toLowerCase())
    })
  }

  return data
})

// Brushing & Linking State (charts)
const interactionSelection = ref<InteractionSelection | null>(null)
const timeBrush = ref<TimeBrushRange | null>(null)
/** Used to force re-mount time chart on clear */
const chartResetKey = ref(0)

/** Cases after sidebar filters + cluster + UMAP + chart interactions */
const interactionFilteredData = computed<CaseSummary[]>(() => {
  let rows = selectionFilteredData.value

  if (timeBrush.value) {
    const { start, end } = timeBrush.value
    rows = rows.filter(row => {
      if (!row.added_on) return false
      const d = new Date(row.added_on)
      if (Number.isNaN(+d)) return false
      return d >= start && d <= end
    })
  }

  const sel = interactionSelection.value
  if (!sel) return rows

  if (sel.type === 'gender') {
    return rows.filter(row => normalizeGender(row.gender) === sel.value)
  }

  if (sel.type === 'ageBin') {
    const end = sel.binEnd === 'Infinity' ? Infinity : sel.binEnd
    return rows.filter(row => {
      const age = row.patient_age
      return typeof age === 'number' && age >= sel.binStart && age <= end
    })
  }

  if (sel.type === 'modality') {
    return rows.filter(row => (row.modalities ?? []).includes(sel.value))
  }

  if (sel.type === 'region') {
    return rows.filter(row => {
      const mains = getCaseMainRegions(row)
      const subs = getCaseSubregions(row)
      return mains.includes(sel.value) || subs.includes(sel.value)
    })
  }

  if (sel.type === 'section') {
    const key = sel.value.toLowerCase()
    return rows.filter(row => {
      switch (key) {
        case 'history': return !!row.has_history
        case 'exam': return !!row.has_exam
        case 'findings': return !!row.has_findings
        case 'diagnosis': return !!row.has_diagnosis
        case 'treatment': return !!row.has_treatment
        case 'discussion': return !!row.has_discussion
        default: return true
      }
    })
  }

  if (sel.type === 'modality-region') {
    return rows.filter(row => {
      const hasMod = (row.modalities ?? []).includes(sel.modality)
      if (!hasMod) return false
      const mains = getCaseMainRegions(row)
      const subs = getCaseSubregions(row)
      return mains.includes(sel.region) || subs.includes(sel.region)
    })
  }

  return rows
})
const selectedAgeBin = computed<{ binStart: number; binEnd: number } | null>(() => {
  const sel = interactionSelection.value
  if (!sel || sel.type !== 'ageBin') return null

  const end = sel.binEnd === 'Infinity' ? Infinity : sel.binEnd
  return { binStart: sel.binStart, binEnd: end }
})

/** diagnoses present in the *currently* linked subset – usable by UMAP for dimming */
const activeDiagnoses = computed(() => {
  const set = new Set<string>()
  for (const row of interactionFilteredData.value) {
    if (row.diagnosis) {
      set.add(row.diagnosis.toLowerCase())
    }
  }
  return Array.from(set)
})

const handleItemSelect = (payload: InteractionSelection | null) => {
  if (!payload) {
    interactionSelection.value = null
    return
  }
  const current = interactionSelection.value
  if (current && JSON.stringify(current) === JSON.stringify(payload)) {
    interactionSelection.value = null
  } else {
    interactionSelection.value = payload
  }
}

const handleTimeBrushChange = (range: TimeBrushRange | null) => {
  timeBrush.value = range
}

const handleClearInteractions = () => {
  interactionSelection.value = null
  timeBrush.value = null
  chartResetKey.value++
}


/* =========================
 * Cohort actions
 * =======================*/

/**
 * Save the current selection (interactionFilteredData) as a new static cohort.
 * Cohort membership never changes after creation.
 */
const handleCreateCohortFromSelection = () => {
  const cases = interactionFilteredData.value
  if (!cases.length) return

  const id = `cohort-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const defaultName = `Group ${cohorts.value.length + 1}`
  const caseIds = cases.map(c => c.id)

  cohorts.value.push({
    id,
    name: defaultName,
    caseIds,
    size: caseIds.length,
    createdAt: new Date().toISOString(),
    color: nextCohortColor(),   // <-- NEW
  })
}


/**
 * Clicking a cohort focuses the whole page on that cohort's cases.
 * Clicking it again clears the cohort filter.
 */
const handleToggleCohort = (id: string) => {
  if (activeCohortId.value === id) {
    activeCohortId.value = null
  } else {
    activeCohortId.value = id
  }
}

/**
 * Remove a saved cohort. If it was active, clear the cohort filter.
 */
const handleRemoveCohort = (id: string) => {
  const idx = cohorts.value.findIndex(c => c.id === id)
  if (idx !== -1) {
    cohorts.value.splice(idx, 1)
  }
  if (activeCohortId.value === id) {
    activeCohortId.value = null
  }
}


/* =========================
 * Comparison-mode series (static cohorts)
 * =======================*/

const genderComparisonSeries = computed<GenderComparisonSeries[]>(() => {
  if (!comparisonMode.value) return []
  if (!cohorts.value.length) return []

  return cohorts.value.map((cohort) => {
    const idSet = new Set<CaseSummary['id']>(cohort.caseIds)

    // IMPORTANT: use rawData (full dataset), not effectiveRawData,
    // so cohorts are static and ignore current filters.
    const cases = rawData.value.filter(row => idSet.has(row.id))

    const counts = { Female: 0, Male: 0, Unknown: 0 }
    for (const row of cases) {
      counts[normalizeGender(row.gender)]++
    }

    const items: Item[] = [
      { label: 'Female', count: counts.Female },
      { label: 'Male', count: counts.Male },
      { label: 'Unknown', count: counts.Unknown },
    ]

    const total = items.reduce((sum, d) => sum + d.count, 0)

    return {
      cohortId: cohort.id,
      cohortName: cohort.name,
      color: cohort.color,
      items,
      total,
    }
  })
})


const comparisonGroupSummaries = computed<ComparisonGroupSummary[]>(() => {
  if (!comparisonMode.value) return []
  if (!cohorts.value.length) return []

  return cohorts.value
    .map((cohort) => {
      const idSet = new Set<CaseSummary['id']>(cohort.caseIds)
      const rows = rawData.value.filter(row => idSet.has(row.id))
      if (!rows.length) return null

      const { typicalCases, atypicalCases } = buildUMAPSummaryForRows(rows)
      const topTerms = buildTopTermsForRows(rows)

      return {
        id: cohort.id,
        name: cohort.name,
        color: cohort.color,
        size: rows.length,
        typicalCases,
        atypicalCases,
        topTerms,
      }
    })
    .filter((g): g is ComparisonGroupSummary => g !== null)
})



/**
 * Toggle comparison mode from the CohortPanel.
 * Requires at least 2 cohorts.
 */
const handleToggleComparisonMode = () => {
  if (cohorts.value.length < 2) {
    comparisonMode.value = false
    return
  }
  comparisonMode.value = !comparisonMode.value
}

// If cohorts drop below 2, automatically exit comparison mode
watch(
  cohorts,
  (list) => {
    if (list.length < 2 && comparisonMode.value) {
      comparisonMode.value = false
    }
  },
  { deep: true }
)




/* =========================
 * Chart metrics based on interactionFilteredData
 * =======================*/

const finalGenderCounts = computed<Item[]>(() => {
  const counts = { Female: 0, Male: 0, Unknown: 0 }
  for (const row of interactionFilteredData.value) counts[normalizeGender(row.gender)]++
  return Object.entries(counts).map(([label, count]) => ({ label, count }))
})

const finalModalityCounts = computed<Item[]>(() => {
  const map = new Map<string, number>()
  for (const row of interactionFilteredData.value) {
    for (const mod of row.modalities || []) {
      if (mod) map.set(mod, (map.get(mod) ?? 0) + 1)
    }
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
})

// Base region counts (filters applied, before UMAP / chart interactions)
const regionCounts = computed<Item[]>(() => {
  const map = new Map<string, number>()
  for (const row of filteredData.value) {
    for (const sub of getCaseSubregions(row)) {
      if (sub) {
        map.set(sub, (map.get(sub) ?? 0) + 1)
      }
    }
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
})

// Region counts for interaction-filtered data (what the chart uses)
const finalRegionCounts = computed<Item[]>(() => {
  const map = new Map<string, number>()
  for (const row of interactionFilteredData.value) {
    for (const sub of getCaseSubregions(row)) {
      if (sub) {
        map.set(sub, (map.get(sub) ?? 0) + 1)
      }
    }
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
})


const clusterAgeBins = computed(() => {
  const bins = [
    { binStart: 0, binEnd: 9, count: 0 },
    { binStart: 10, binEnd: 19, count: 0 },
    { binStart: 20, binEnd: 29, count: 0 },
    { binStart: 30, binEnd: 39, count: 0 },
    { binStart: 40, binEnd: 49, count: 0 },
    { binStart: 50, binEnd: 59, count: 0 },
    { binStart: 60, binEnd: 69, count: 0 },
    { binStart: 70, binEnd: 79, count: 0 },
    { binStart: 80, binEnd: 89, count: 0 },
    { binStart: 90, binEnd: Infinity, count: 0 },
  ]
  for (const row of interactionFilteredData.value) {
    const age = row.patient_age
    if (typeof age === 'number' && age >= 0) {
      const binIndex = Math.min(Math.floor(age / 10), 9)
      const bin = bins[binIndex]
      if (bin) bin.count++
    }
  }
  return bins
})

const finalAgeBins = clusterAgeBins

const finalUnknownAgeCount = computed(() => {
  return interactionFilteredData.value.filter(row =>
    row.patient_age === null || row.patient_age === undefined
  ).length
})

const finalCasesOverTime = computed<Point[]>(() => {
  const monthCounts = new Map<string, number>()
  const re = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/

  for (const row of interactionFilteredData.value) {
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

// Text-section coverage for interaction-filtered data
const finalSectionCoverage = computed<Item[]>(() => {
  const counts: {
    History: number
    Exam: number
    Findings: number
    Diagnosis: number
    Treatment: number
    Discussion: number
  } = {
    History: 0,
    Exam: 0,
    Findings: 0,
    Diagnosis: 0,
    Treatment: 0,
    Discussion: 0,
  }

  for (const row of interactionFilteredData.value) {
    if (row.has_history) counts.History++
    if (row.has_exam) counts.Exam++
    if (row.has_findings) counts.Findings++
    if (row.has_diagnosis) counts.Diagnosis++
    if (row.has_treatment) counts.Treatment++
    if (row.has_discussion) counts.Discussion++
  }

  return Object.entries(counts).map(([label, count]) => ({ label, count }))
})

// Modality co-occurrence for interaction-filtered data
const finalModalityCooc = computed<ModalityMatrix>(() =>
  buildCoocMatrix(interactionFilteredData.value, allModalities.value, (row) => row.modalities ?? [])
)

// Region co-occurrence for interaction-filtered data (main regions)
const finalRegionCooc = computed<RegionMatrix>(() =>
  buildCoocMatrix(interactionFilteredData.value, allMainRegions.value, getCaseMainRegions)
)

// Modality × Region for interaction-filtered data
const finalModalityRegionMatrix = computed<ModalityRegionMatrix>(() =>
  buildModalityRegionMatrix(
    interactionFilteredData.value,
    allMainRegions.value,
    allModalities.value,
    getCaseMainRegions,
    (row) => row.modalities ?? []
  )
)

const casesOverTimeComparisonSeries = computed<TimeComparisonSeries[] | null>(() => {
  if (!comparisonMode.value) return null
  if (!cohorts.value.length || !rawData.value.length) return null

  const idToRow = new Map<CaseSummary['id'], CaseSummary>()
  for (const row of rawData.value) {
    idToRow.set(row.id, row)
  }

  // Helper: parse added_on into a canonical month key
  const monthCountsPerCohort: {
    cohortId: string
    cohortName: string
    color: string
    size: number
    counts: Map<string, number>
  }[] = []

  const monthKeyRegex = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?$/

  for (const cohort of cohorts.value) {
    const counts = new Map<string, number>()

    for (const id of cohort.caseIds) {
      const row = idToRow.get(id)
      if (!row?.added_on) continue
      const s = row.added_on.trim()
      const m = monthKeyRegex.exec(s)
      if (!m) continue

      const y = Number(m[1])
      const mon = Number(m[2])
      if (!Number.isFinite(y) || !Number.isFinite(mon) || y < 1900 || y > 2100 || mon < 1 || mon > 12) {
        continue
      }
      const key = `${y}-${String(mon).padStart(2, '0')}-01`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }

    monthCountsPerCohort.push({
      cohortId: cohort.id,
      cohortName: cohort.name,
      color: cohort.color,
      size: cohort.size,
      counts,
    })
  }

  // Collect all month keys across cohorts to get global axis
  const allMonthKeys = new Set<string>()
  for (const c of monthCountsPerCohort) {
    for (const key of c.counts.keys()) {
      allMonthKeys.add(key)
    }
  }

  if (!allMonthKeys.size) return null

  const sortedKeys = Array.from(allMonthKeys).sort()

  return monthCountsPerCohort.map(c => ({
    id: c.cohortId,
    name: c.cohortName,
    color: c.color,
    size: c.size,
    series: sortedKeys.map(key => ({
      date: new Date(key),
      count: c.counts.get(key) ?? 0,
    })),
  }))
})


/** what we actually feed to charts (always interaction-based) */
const displayGenderCounts = finalGenderCounts
const displayModalityCounts = finalModalityCounts
const displayRegionCounts = finalRegionCounts
const displayAgeBins = finalAgeBins
const displayUnknownAgeCount = finalUnknownAgeCount
const displayCasesOverTime = finalCasesOverTime
const displaySectionCoverage = finalSectionCoverage
const displayModalityCooc = finalModalityCooc
const displayRegionCooc = finalRegionCooc
const displayModalityRegionMatrix = finalModalityRegionMatrix

/* =========================
 * Task 1: UMAP-based typical/atypical + TF-IDF word cloud
 * =======================*/

// Diagnosis → UMAP metadata
const diagnosisUMAPMap = ref<Map<string, DiagnosisUMAPInfo>>(new Map())
const clusterLabelLookup = ref<Record<number, string>>({})
// Limit the number of points used for KNN density scoring (for performance)
const MAX_KNN_POINTS_FOR_SCORING = 600


// Load UMAP metadata for diagnoses (for typical/atypical + labels)
const loadDiagnosisUMAPMeta = async () => {
  try {
    const base = `${API_URL}/data/features`

    // UMAP coords + cluster + frequency
    const umapRes = await fetch(`${base}/diagnosis_umap_coords.json`)
    if (umapRes.ok) {
      const umap = await umapRes.json()
      const map = new Map<string, DiagnosisUMAPInfo>()
      umap.diagnoses.forEach((diag: string, i: number) => {
        const key = diag.toLowerCase()
        map.set(key, {
          x: umap.umap_x[i],
          y: umap.umap_y[i],
          cluster: umap.clusters[i],
          frequency: umap.frequencies[i],
        })
      })
      diagnosisUMAPMap.value = map
      console.log(`✅ Loaded UMAP info for ${map.size} diagnoses`)
    }

    // Cluster labels
    const labelsRes = await fetch(`${base}/cluster_labels.json`)
    if (labelsRes.ok) {
      const labelsJson = await labelsRes.json()
      const labels: Record<number, string> = {}
      for (const [k, v] of Object.entries(labelsJson.cluster_labels || {})) {
        const idx = Number(k)
        if (!Number.isNaN(idx)) labels[idx] = String(v)
      }
      clusterLabelLookup.value = labels
    }
  } catch (err) {
    console.warn('Could not load diagnosis UMAP metadata:', err)
  }
}

// Build UMAP points for an arbitrary set of rows
const buildPointsForRows = (rows: CaseSummary[]): CaseWithCoords[] => {
  const map = diagnosisUMAPMap.value
  if (!map.size) return []

  const out: CaseWithCoords[] = []
  for (const row of rows) {
    const diag = row.diagnosis?.trim().toLowerCase()
    if (!diag) continue
    const info = map.get(diag)
    if (!info) continue
    out.push({
      caseData: row,
      x: info.x,
      y: info.y,
    })
  }
  return out
}

// KNN-based density scoring for an arbitrary set of points
const scoreCasesForPoints = (pts: CaseWithCoords[]): ScoredCase[] => {
  let n = pts.length
  if (n <= 1) return []

  let workingPts: CaseWithCoords[] = pts

  if (n > MAX_KNN_POINTS_FOR_SCORING) {
    const step = n / MAX_KNN_POINTS_FOR_SCORING
    const sampled: CaseWithCoords[] = []
    for (let i = 0; i < MAX_KNN_POINTS_FOR_SCORING; i++) {
      const idx = Math.floor(i * step)
      const p = pts[idx]
      if (p) sampled.push(p)
    }
    workingPts = sampled
    n = workingPts.length
  }

  const k = Math.min(10, n - 1)
  if (k <= 0) return []

  const scored: ScoredCase[] = []

  for (let i = 0; i < n; i++) {
    const p = workingPts[i]!
    const dists: number[] = []

    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const q = workingPts[j]!
      const dx = p.x - q.x
      const dy = p.y - q.y
      dists.push(Math.sqrt(dx * dx + dy * dy))
    }

    dists.sort((a, b) => a - b)
    const neighbors = dists.slice(0, k)
    const avg =
      neighbors.reduce((sum, v) => sum + v, 0) /
      (neighbors.length || 1)

    scored.push({ ...p, score: avg })
  }

  return scored.sort((a, b) => a.score - b.score)
}

// normalize diagnosis for uniqueness
const normalizeDiagKey = (diag: string | null | undefined): string =>
  diag ? diag.trim().toLowerCase() : ''

// Turn scored points into typical & atypical lists
const buildTypicalAtypicalFromScored = (scored: ScoredCase[]): {
  typicalCases: CaseSummary[]
  atypicalCases: CaseSummary[]
} => {
  if (!scored.length) return { typicalCases: [], atypicalCases: [] }

  const seenTypical = new Set<string>()
  const typicalCases: CaseSummary[] = []

  for (const p of scored) {
    const key = normalizeDiagKey(p.caseData.diagnosis)
    if (!key || seenTypical.has(key)) continue
    seenTypical.add(key)
    typicalCases.push(p.caseData)
    if (typicalCases.length >= 4) break
  }

  const typicalDiagKeys = new Set(
    typicalCases.map(c => normalizeDiagKey(c.diagnosis))
  )

  const seenAtypical = new Set<string>()
  const atypicalCases: CaseSummary[] = []

  for (let idx = scored.length - 1; idx >= 0; idx--) {
    const p = scored[idx]!
    const key = normalizeDiagKey(p.caseData.diagnosis)
    if (!key) continue
    if (typicalDiagKeys.has(key)) continue
    if (seenAtypical.has(key)) continue

    seenAtypical.add(key)
    atypicalCases.push(p.caseData)
    if (atypicalCases.length >= 4) break
  }

  return { typicalCases, atypicalCases }
}

// Convenience: full UMAP summary for a set of rows
const buildUMAPSummaryForRows = (rows: CaseSummary[]) => {
  const pts = buildPointsForRows(rows)
  const scored = scoreCasesForPoints(pts)
  return buildTypicalAtypicalFromScored(scored)
}


// Use the full interaction-filtered subset (filters + cluster + UMAP + chart interactions)
const currentSelectionCases = computed<CaseSummary[]>(() => {
  return interactionFilteredData.value
})

const selectionUMAPSummary = computed(() =>
  buildUMAPSummaryForRows(currentSelectionCases.value)
)

// Cases in current selection that have UMAP coords (via diagnosis)
const selectionWithCoords = computed<CaseWithCoords[]>(() => {
  const map = diagnosisUMAPMap.value
  if (!map.size) return []

  const out: CaseWithCoords[] = []
  for (const row of currentSelectionCases.value) {
    const diag = row.diagnosis?.trim().toLowerCase()
    if (!diag) continue
    const info = map.get(diag)
    if (!info) continue
    out.push({
      caseData: row,
      x: info.x,
      y: info.y,
    })
  }
  return out
})

// KNN-based "density" scoring within the current selection
// score = average distance to k nearest neighbours in UMAP space
type ScoredCase = CaseWithCoords & { score: number }

const scoredSelection = computed<ScoredCase[]>(() => {
  const pts = selectionWithCoords.value
  let n = pts.length

  if (n <= 1) return []

  // If too many points, take a deterministic subsample spread across the selection.
  let workingPts: CaseWithCoords[] = pts

  if (n > MAX_KNN_POINTS_FOR_SCORING) {
    const step = n / MAX_KNN_POINTS_FOR_SCORING
    const sampled: CaseWithCoords[] = []

    for (let i = 0; i < MAX_KNN_POINTS_FOR_SCORING; i++) {
      const idx = Math.floor(i * step)
      const p = pts[idx]
      if (p) sampled.push(p)
    }

    workingPts = sampled
    n = workingPts.length
  }

  const k = Math.min(10, n - 1) // up to 10 neighbours, but never >= n
  const scored: ScoredCase[] = []

  for (let i = 0; i < n; i++) {
    const p = workingPts[i]!
    const dists: number[] = []

    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const q = workingPts[j]!
      const dx = p.x - q.x
      const dy = p.y - q.y
      dists.push(Math.sqrt(dx * dx + dy * dy))
    }

    dists.sort((a, b) => a - b)
    const neighbors = dists.slice(0, k)
    const avg =
      neighbors.reduce((sum, v) => sum + v, 0) /
      (neighbors.length || 1)

    scored.push({ ...p, score: avg })
  }

  return scored.sort((a, b) => a.score - b.score)
})

const typicalCases = computed<CaseSummary[]>(() => selectionUMAPSummary.value.typicalCases)
const atypicalCases = computed<CaseSummary[]>(() => selectionUMAPSummary.value.atypicalCases)

/** Global DF + IDF over all cases' diagnoses */
const globalTermStats = computed(() => {
  const df = new Map<string, number>()
  const N = rawData.value.length

  for (const row of rawData.value) {
    const diag = row.diagnosis?.toLowerCase()
    if (!diag) continue
    const tokens = tokenizeDiagnosis(diag)
    const unique = new Set(tokens)
    for (const t of unique) {
      df.set(t, (df.get(t) ?? 0) + 1)
    }
  }

  const idf = new Map<string, number>()
  for (const [term, dfCount] of df.entries()) {
    const val = Math.log((N + 1) / (dfCount + 1)) + 1
    idf.set(term, val)
  }

  return { N, df, idf }
})

const buildTopTermsForRows = (rows: CaseSummary[]): TermItem[] => {
  const { idf } = globalTermStats.value
  if (!idf.size) return []

  const tf = new Map<string, number>()

  for (const row of rows) {
    const diag = row.diagnosis?.toLowerCase()
    if (!diag) continue
    const tokens = tokenizeDiagnosis(diag)
    for (const t of tokens) {
      tf.set(t, (tf.get(t) ?? 0) + 1)
    }
  }

  if (!tf.size) return []

  const scores: [string, number][] = []
  for (const [term, tfCount] of tf.entries()) {
    const idfVal = idf.get(term)
    if (idfVal === undefined) continue
    scores.push([term, tfCount * idfVal])
  }

  if (!scores.length) return []

  scores.sort((a, b) => b[1] - a[1])
  const top = scores.slice(0, 40)

  const maxScore = top[0]![1]
  const minScore = top[top.length - 1]![1]
  const range = maxScore - minScore || 1

  return top.map(([term, score]) => ({
    term,
    weight: (score - minScore) / range,
  }))
}


const topTerms = computed<TermItem[]>(() =>
  buildTopTermsForRows(currentSelectionCases.value)
)


/* =========================
 * Table (computed & actions)
 * =======================*/
const tableLimit = ref(50)
// table uses the same interactionFilteredData, so it also responds to chart selections 
const visibleRows = computed(() => interactionFilteredData.value.slice(0, tableLimit.value))
const hasMoreRows = computed(() => interactionFilteredData.value.length > tableLimit.value)
const showMoreRows = () => { tableLimit.value += 50 }

const tableKey = ref(0)

const formatRegionsCell = (row: CaseSummary): string => {
  const arr = getCaseSubregions(row)
  const first = arr[0]
  return typeof first === 'string' && first.length > 0 ? first : '—'
}



// Reset paging and bump table key when filters change
watch(
  filters,
  () => {
    tableLimit.value = 50
    tableKey.value++
  },
  { deep: true }
)

/* =========================
 * Fetch
 * =======================*/
const loadData = async () => {
  try {
    loading.value = true
    error.value = null
    const res = await fetch(`${API_URL}/api/cases/summary_all`)
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }
    const json = await res.json()
    if (!Array.isArray(json)) {
      throw new Error('Unexpected response shape')
    }
    rawData.value = json as CaseSummary[]
    totalCases.value = rawData.value.length
    fetchedAt.value = new Date()
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error'
    error.value = errorMessage
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      showError(
        'Connection Error',
        'Unable to connect. Would you like to retry?',
        { onConfirm: () => loadData() }
      )
    } else if (errorMessage.includes('HTTP error! status:')) {
      const status = errorMessage.split('status: ')[1]
      showError(
        'Load Failed',
        `Server returned status ${status}. Would you like to retry?`,
        { onConfirm: () => loadData() }
      )
    } else {
      showError(
        'Load Failed',
        `${errorMessage}. Would you like to retry?`,
        { onConfirm: () => loadData() }
      )
    }
  } finally {
    loading.value = false
  }
}

const handleRefreshClick = () => {
  loadData()
}

onMounted(() => {
  console.log('🔵 [DEBUG] Analytics page mounted')
  loadData()
  loadClusterMapping()
  loadImageClusterMapping()
  loadDiagnosisUMAPMeta()
})
</script>

<template>
  <div class="analytics-page">
    <div class="page-header">
      <h1>Analytics</h1>
      <p v-if="!loading && !error">
        Loaded <strong>{{ totalCases }}</strong> cases • Fetched at {{ fetchedAt?.toLocaleString() }}
        <button
          class="refresh-btn"
          @click="handleRefreshClick"
          :disabled="loading"
          title="Refresh data"
        >
          ⟳ Refresh
        </button>
      </p>
    </div>

    <div class="analytics-layout">
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
      <main class="analytics-main-content">
        <!-- KPIs -->
        <div class="summary-grid" v-if="!loading && !error">
          <div class="summary-card" :class="{ 'highlight': selectedCluster !== null }">
            <h3>{{ interactionFilteredData.length.toLocaleString() }}</h3>
            <p>
              <span v-if="selectedCluster !== null">Cluster / selection cases</span>
              <span v-else>Filtered cases</span>
            </p>
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
          <p>Loading analytics...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="center-block error">
          <p>❌ Error loading analytics: {{ error }}</p>
          <button @click="loadData" class="retry-btn">Retry</button>
        </div>

        <!-- Charts + Table -->
        <div v-else class="content">
          <!-- UMAP Diagnosis Clustering Visualization -->
          <div class="umap-section">
            <!-- UMAP Mode Selector -->
            <div class="umap-mode-selector">
              <button 
                :class="{ active: umapMode === 'text' }"
                @click="umapMode = 'text'; selectedCluster = null"
                class="mode-btn"
              >
                📝 Text Clustering (Semantic)
              </button>
              <button 
                :class="{ active: umapMode === 'image' }"
                @click="umapMode = 'image'; selectedCluster = null"
                class="mode-btn"
              >
                🖼️ Image Clustering (Visual)
              </button>
            </div>

            <div v-if="selectedCluster !== null" class="cluster-banner">
              🎯 {{ umapMode === 'text' ? 'Semantic' : 'Visual' }} cluster filter active - All charts below show only cases from the selected cluster
              <button @click="selectedCluster = null" class="clear-cluster-btn">Clear Filter</button>
            </div>

            <div
              v-if="interactionSelection || timeBrush"
              class="interaction-banner"
            >
              <span>
                Brushing & linking active
                <span v-if="interactionSelection">
                  • Selected:
                  <code>{{ interactionSelection }}</code>
                </span>
                <span v-if="timeBrush">
                  • Time brushed
                </span>
              </span>
              <button
                type="button"
                class="clear-selection-banner-btn"
                @click="handleClearInteractions"
              >
                Clear chart selections
              </button>
            </div>

            <ClientOnly>
              <DiagnosisUMAP
                v-if="umapMode === 'text'"
                :width="1000"
                :height="700"
                :selectedCluster="selectedCluster"
                dataSource="text"
                :activeDiagnoses="activeDiagnoses"
                :interaction-selection="interactionSelection"
                @pointClick="handleDiagnosisClick"
                @clusterClick="handleClusterClick"
                @selectionChange="handleUMAPSelection"
              />
              <DiagnosisUMAP
                v-else
                :width="1000"
                :height="700"
                :selectedCluster="selectedCluster"
                dataSource="image"
                :activeDiagnoses="activeDiagnoses"
                :interaction-selection="interactionSelection"
                @pointClick="handleDiagnosisClick"
                @clusterClick="handleClusterClick"
                @selectionChange="handleUMAPSelection"
              />
            </ClientOnly>
          </div>

          <!-- Cohorts panel -->
          <CohortPanel
            :cohorts="cohorts"
            :active-cohort-id="activeCohortId"
            :current-selection-count="interactionFilteredData.length"
            :comparison-enabled="comparisonMode"
            @create-from-selection="handleCreateCohortFromSelection"
            @toggle-cohort="handleToggleCohort"
            @remove-cohort="handleRemoveCohort"
            @toggle-comparison-mode="handleToggleComparisonMode"
          />


          <!-- Cluster / selection summary -->
          <SelectionSummaryPanel
            v-if="!comparisonMode && currentSelectionCases.length > 0"
            :cases="currentSelectionCases"
            :typical-cases="typicalCases"
            :atypical-cases="atypicalCases"
            :top-terms="topTerms"
            :selected-cluster="selectedCluster"
            :cluster-labels="clusterLabelLookup"
          />

          <!-- Comparison mode: one compact card per group -->
          <SelectionSummaryComparisonPanel
            v-else-if="comparisonMode && comparisonGroupSummaries.length > 0"
            :groups="comparisonGroupSummaries"
          />


          <div class="charts-grid">
            <!-- Top row -->
            <div class="chart-card">
              <ClientOnly>
                <GenderBarComparison
                  v-if="comparisonMode && genderComparisonSeries.length >= 2"
                  :series="genderComparisonSeries"
                />
                <GenderBar
                  v-else
                  :items="displayGenderCounts"
                  :selected-value="interactionSelection?.type === 'gender' ? interactionSelection.value : null"
                  @item-select="handleItemSelect"
                />
              </ClientOnly>
            </div>

            <div class="chart-card">
              <ClientOnly>
                <!-- Comparison mode: KDE -->
                <AgeComparisonKDE
                  v-if="comparisonMode && ageComparisonSeries.length >= 2"
                  :series="ageComparisonSeries"
                />

                <!-- Normal mode: existing histogram -->
                <AgeHistogram
                  v-else
                  :bins="displayAgeBins"
                  :unknown-count="displayUnknownAgeCount"
                  :selected-bin="selectedAgeBin"
                  @item-select="handleItemSelect"
                />
              </ClientOnly>
            </div>

            <!-- Middle row (full width) -->
            <div class="chart-card full">
              <ClientOnly>
                <CasesOverTimeComparison
                  v-if="comparisonMode && casesOverTimeComparisonSeries && casesOverTimeComparisonSeries.length >= 2"
                  :groups="casesOverTimeComparisonSeries"
                  @range-change="handleTimeBrushChange"
                />
                <CasesOverTime
                  v-else
                  :key="chartResetKey"
                  :series="displayCasesOverTime"
                  @range-change="handleTimeBrushChange"
                />
              </ClientOnly>
            </div>


            <!-- Row 3: Modality bar + (Modality×Group or Modality×Modality) -->
            <div class="chart-card">
              <ClientOnly>
                <ModalityBar
                  v-if="!comparisonMode"
                  :items="displayModalityCounts"
                  :selected-value="interactionSelection?.type === 'modality' ? interactionSelection.value : null"
                  @item-select="handleItemSelect"
                />

                <!-- Comparison mode: Modality × Group in left half -->
                <ModalityGroupHeatmap
                  v-else
                  :matrix="modalityGroupMatrix"
                  :selected-value="interactionSelection?.type === 'modality' ? interactionSelection.value : null"
                  @item-select="handleItemSelect"
                />
              </ClientOnly>
            </div>

            <div class="chart-card">
              <ClientOnly>
                <!-- Normal mode: Modality × Modality -->
                <ModalityHeatmap
                  v-if="!comparisonMode"
                  :matrix="displayModalityCooc"
                  :selected-value="interactionSelection?.type === 'modality' ? interactionSelection.value : null"
                  @item-select="handleItemSelect"
                />

                <!-- Comparison mode: Section × Group in right half -->
                <SectionByGroupHeatmap
                  v-else
                  :matrix="sectionGroupMatrix"
                  :selected-value="interactionSelection?.type === 'section' ? interactionSelection.value : null"
                  @item-select="handleItemSelect"
                />
              </ClientOnly>
            </div>

            <!-- Row 4 -->
            <!-- Normal mode: Region bar + Section Coverage -->
            <div v-if="!comparisonMode" class="chart-card">
              <ClientOnly>
                <RegionBar
                  :items="displayRegionCounts"
                  :selected-value="interactionSelection?.type === 'region' ? interactionSelection.value : null"
                  @item-select="handleItemSelect"
                />
              </ClientOnly>
            </div>

            <div v-if="!comparisonMode" class="chart-card">
              <ClientOnly>
                <SectionsCoverageBar
                  :items="displaySectionCoverage"
                  :selected-value="interactionSelection?.type === 'section' ? interactionSelection.value : null"
                  @item-select="handleItemSelect"
                />
              </ClientOnly>
            </div>

            <!-- Row 4: Comparison mode full-width Region×Group -->
            <div v-if="comparisonMode" class="chart-card full">
              <ClientOnly>
                <RegionGroupHeatmap
                  :matrix="regionGroupMatrix"
                  :selected-value="interactionSelection?.type === 'region' ? interactionSelection.value : null"
                  @item-select="handleItemSelect"
                />
              </ClientOnly>
            </div>

            <!-- Row 5 (normal mode only): Modality × Region full width -->
            <div v-if="!comparisonMode" class="chart-card full">
              <ClientOnly>
                <ModalityRegionHeatmap
                  :matrix="displayModalityRegionMatrix"
                  :selected-value="interactionSelection?.type === 'modality-region' ? interactionSelection : null"
                  @item-select="handleItemSelect"
                />
              </ClientOnly>
            </div>
          </div>

          <!-- Data table -->
          <div class="table-card">
            <div class="table-header">
              <div class="left">
                <h3>Cases</h3>
                <p>
                  Showing {{ visibleRows.length.toLocaleString() }}
                  of {{ interactionFilteredData.length.toLocaleString() }}
                </p>
              </div>
            </div>

            <div class="table-scroll">
              <table class="cases-table" :key="tableKey">
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
                    <td class="wrap" :title="formatRegionsCell(row)">{{ formatRegionsCell(row) }}</td>
                    <td class="num">{{ row.imageCount ?? 0 }}</td>
                    <td class="num">{{ row.word_count ?? 0 }}</td>
                  </tr>
                  <tr v-if="visibleRows.length === 0">
                    <td colspan="8" class="empty">No cases match the current filters / selection.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="hasMoreRows" class="table-footer right">
              <button class="show-more-btn" @click="showMoreRows">Show more</button>
            </div>
          </div>
        </div>
      </main>
    </div>
    <DialogBox />
  </div>
</template>

<style scoped>
/* Page */
.analytics-page {
  min-height: calc(100vh - 80px);
  background: #f5f7fa;
}

/* Header - stays full width above layout */
.page-header {
  text-align: center;
  padding: 0.75rem 1rem 0.5rem;
}

.page-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 0.1rem;
}

.page-header p {
  color: #4a5568;
}

/* Sidebar Layout */
.analytics-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 0;
  min-height: calc(100vh - 200px);
}

.filters-sidebar {
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  padding: 1rem;
}

/* Custom scrollbar for sidebar */
.filters-sidebar::-webkit-scrollbar {
  width: 8px;
}

.filters-sidebar::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.filters-sidebar::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}

.filters-sidebar::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

.analytics-main-content {
  padding: 0.4rem 1.1rem 1rem 0.6rem;
  overflow-x: hidden;
}

/* Responsive */
@media (max-width: 900px) {
  .analytics-layout {
    grid-template-columns: 1fr;
  }

  .filters-sidebar {
    position: static;
    height: auto;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }

  .analytics-main-content {
    padding: 1rem;
  }

  .page-header {
    padding: 1rem;
  }
}

.refresh-btn {
  margin-left: .5rem;
  padding: .25rem .6rem;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  background: #f7fafc;
  color: #2d3748;
  font-size: .85rem;
  cursor: pointer;
}

.refresh-btn:hover {
  background: #e2e8f0;
}

.refresh-btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}

/* Loader / error */
.center-block {
  text-align: center;
  padding: 2rem 1rem;
}

.loader {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 48px;
  height: 48px;
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
  padding: 0.6rem 1.25rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.retry-btn:hover {
  background: #5568d3;
}

/* Content grid */
.content {
  display: grid;
  row-gap: 0.5rem;
  column-gap: 0.5rem;
}

/* UMAP Section */
.umap-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 0.6rem 0.6rem 0.5rem;
  margin-bottom: 0.4rem;
}

.umap-mode-selector {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1rem;
}

.mode-btn {
  padding: 0.65rem 1.25rem;
  border: 2px solid #e2e8f0;
  background: white;
  color: #4a5568;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  border-color: #667eea;
  background: #f7fafc;
}

.mode-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.cluster-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.interaction-banner {
  background: linear-gradient(135deg, #38a169 0%, #319795 100%);
  color: white;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 500;
  font-size: 0.85rem;
  box-shadow: 0 4px 12px rgba(56, 161, 105, 0.3);
}

.selection-banner {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  color: white;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  font-size: 14px;
}

.clear-cluster-btn,
.clear-selection-banner-btn {
  padding: 0.5rem 1rem;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-selection-banner-btn {
  color: #ff6b6b;
}

.clear-cluster-btn:hover,
.clear-selection-banner-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Charts grid */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.35rem;
  align-items: stretch;
}

.chart-card {
  grid-column: span 1;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 0.4rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 260px;
}

.chart-card.full {
  grid-column: 1 / -1;
}

.chart-card>* {
  flex: 1 1 auto;
  display: flex;
}

.chart-card>*>* {
  flex: 1 1 auto;
}

@media (max-width: 900px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .chart-card,
  .chart-card.full {
    grid-column: 1 / -1;
    min-height: 260px;
  }
}

.chart-card-mode-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.mode-label {
  font-size: 0.8rem;
  color: #718096;
}

.mode-pill-group {
  display: inline-flex;
  gap: 0.25rem;
}

.mode-pill {
  border: 1px solid #cbd5e0;
  background: #edf2f7;
  color: #4a5568;
  border-radius: 999px;
  padding: 0.15rem 0.6rem;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-pill.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

/* KPIs */
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.summary-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 0.4rem;
  text-align: center;
  transition: all 0.3s ease;
}

.summary-card.highlight {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
  transform: scale(1.05);
}

.summary-card.highlight h3,
.summary-card.highlight p {
  color: white;
}

.summary-card h3 {
  font-size: 1.35rem;
  color: #2d3748;
  margin-bottom: 0.15rem;
}

.summary-card p {
  color: #718096;
  font-size: 0.9rem;
}

/* Table */
.table-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 0.75rem;
  margin-top: .35rem;
  min-width: 0;
}

.table-header,
.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: .75rem;
  margin-bottom: .75rem;
}

.table-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #2d3748;
}

.table-header p {
  margin: 0;
  color: #718096;
  font-size: .9rem;
}

.table-footer {
  margin-top: 0.75rem;
  display: flex;
  justify-content: flex-end;
}

.table-scroll {
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  max-width: 100%;
  width: 100%;
}

.cases-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  background: white;
  min-width: 720px;
}

.cases-table thead th {
  position: sticky;
  top: 0;
  background: #f7fafc;
  color: #4a5568;
  font-weight: 700;
  font-size: .9rem;
  text-align: left;
  padding: .6rem .75rem;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

.cases-table tbody td {
  padding: .55rem .75rem;
  border-bottom: 1px solid #edf2f7;
  color: #2d3748;
  font-size: .92rem;
  vertical-align: top;
}

.cases-table tbody tr:last-child td {
  border-bottom: none;
}

.cases-table td.wrap {
  white-space: nowrap;
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cases-table td.num {
  text-align: right;
}

.cases-table td.id a {
  color: #4c51bf;
  text-decoration: none;
  font-weight: 600;
}

.cases-table td.id a:hover {
  text-decoration: underline;
}

.cases-table td.empty {
  text-align: center;
  color: #718096;
  padding: 1rem;
}

/* Buttons */
.show-more-btn {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.1s ease;
}

.show-more-btn:hover {
  background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
  transform: translateY(-1px);
}

.show-more-btn:active {
  transform: translateY(0);
}

/* Container safety on mobile */
.container {
  overflow-x: hidden;
}
</style>