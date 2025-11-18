import { image } from 'd3'
import { ref, computed, watch, type Ref } from 'vue'

export type CaseSummary = {
  id: string
  title: string | null
  diagnosis: string | null
  added_on: string | null
  last_edited_on: string | null
  patient_age: number | null
  gender: string | null
  modalities: string[]
  regions: Record<string, string[]>
  imageCount: number
  word_count: number | null
  thumbnail: string | null
  url: string | null
  has_history: boolean
  has_exam: boolean
  has_findings: boolean
  has_diagnosis: boolean
  has_treatment: boolean
  has_discussion: boolean
}

export type Filters = {
  query: string
  genders: string[]
  ageMin: number | null
  ageMax: number | null
  dateMin: string | null
  dateMax: string | null
  modalities: string[]
  regions: string[]      // subregion names
  hasHistory: boolean
  hasExam: boolean
  hasFindings: boolean
  hasDiagnosis: boolean
  hasTreatment: boolean
  hasDiscussion: boolean
  imageMin: number | null
  imageMax: number | null
  wordsMin: number | null
  wordsMax: number | null
}

export type RegionGroup = { label: string; options: string[] }

export type SummaryStats = {
  total: number
  medianAge: number | null
  avgImages: number
  avgWords: number
}

const AGE_EDGES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, Infinity] as const

const normalizeGender = (g: string | null): 'Female' | 'Male' | 'Unknown' => {
  if (!g) return 'Unknown'
  const s = g.trim().toLowerCase()
  if (s === 'female' || s === 'f') return 'Female'
  if (s === 'male' || s === 'm') return 'Male'
  return 'Unknown'
}

const isFiniteNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

export const getCaseSubregions = (c: CaseSummary): string[] =>
  c.regions ? Object.values(c.regions).flat().filter(Boolean) : []

export const getCaseMainRegions = (c: CaseSummary): string[] =>
  c.regions ? Object.keys(c.regions) : []

const makeBins = () => {
  const bins: { binStart: number; binEnd: number; count: number }[] = []
  for (let i = 0; i < AGE_EDGES.length - 1; i++) {
    bins.push({ binStart: AGE_EDGES[i]!, binEnd: AGE_EDGES[i + 1]! - 1, count: 0 })
  }
  const last = bins[bins.length - 1]
  if (last) last.binEnd = Infinity
  return bins
}

export const useCaseFilters = (rawData: Ref<CaseSummary[]>) => {
  const filters = ref<Filters>({
    query: '',
    genders: [],
    ageMin: null,
    ageMax: null,
    dateMin: null,
    dateMax: null,
    modalities: [],
    regions: [],
    hasHistory: false,
    hasExam: false,
    hasFindings: false,
    hasDiagnosis: false,
    hasTreatment: false,
    hasDiscussion: false,
    imageMin: null,
    imageMax: null,
    wordsMin: null,
    wordsMax: null,
  })

  // Options
  const allModalities = computed(() =>
    Array.from(new Set(rawData.value.flatMap(c => c.modalities || []))).sort()
  )

  const regionGroups = computed<RegionGroup[]>(() => {
    const map = new Map<string, Set<string>>()

    for (const c of rawData.value) {
      const regions = c.regions || {}
      for (const [main, subs] of Object.entries(regions)) {
        if (!map.has(main)) map.set(main, new Set())
        const set = map.get(main)!
        for (const s of subs || []) {
          if (s) set.add(s)
        }
      }
    }

    return Array.from(map.entries())
      .map(([label, subs]) => ({
        label,
        options: Array.from(subs).sort(),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  })

  // Filtered data
  const filteredData = computed(() => {
    const norm = (s: string) => s.trim().toLowerCase()
    const selMods = new Set(filters.value.modalities.map(norm))
    const selRegs = new Set(filters.value.regions.map(norm))
    const q = filters.value.query.trim().toLowerCase()

    return rawData.value.filter(row => {
      // Search query
      if (q) {
        const diag = (row.diagnosis || '').toLowerCase()
        if (!diag.includes(q)) return false
      }
      // Gender
      const g = normalizeGender(row.gender)
      if (filters.value.genders.length > 0 && !filters.value.genders.includes(g)) return false

      // Age
      const min = filters.value.ageMin
      const max = filters.value.ageMax
      if (isFiniteNum(min)) {
        if (row.patient_age == null || row.patient_age < min) return false
      }
      if (isFiniteNum(max)) {
        if (row.patient_age == null || row.patient_age > max) return false
      }

      // Image count
      const imgMin = filters.value.imageMin
      const imgMax = filters.value.imageMax
      if (isFiniteNum(imgMin)) {
        if (row.imageCount == null || row.imageCount < imgMin) return false
      }
      if (isFiniteNum(imgMax)) {
        if (row.imageCount == null || row.imageCount > imgMax) return false
      }
      // Word count
      const wMin = filters.value.wordsMin
      const wMax = filters.value.wordsMax
      if (isFiniteNum(wMin)) {
        if (row.word_count == null || row.word_count < wMin) return false
      }
      if (isFiniteNum(wMax)) {
        if (row.word_count == null || row.word_count > wMax) return false
      }

      // Date
      if (filters.value.dateMin || filters.value.dateMax) {
        if (!row.added_on) return false
        const d = new Date(row.added_on)
        if (filters.value.dateMin && d < new Date(filters.value.dateMin)) return false
        if (filters.value.dateMax && d > new Date(filters.value.dateMax)) return false
      }

      // Modalities (OR)
      if (selMods.size > 0) {
        const mods = (row.modalities || []).map(norm)
        const hasAny = mods.some(m => selMods.has(m))
        if (!hasAny) return false
      }

      // Regions (subregions, OR)
      if (selRegs.size > 0) {
        const subs = getCaseSubregions(row).map(norm)
        const hasAny = subs.some(r => selRegs.has(r))
        if (!hasAny) return false
      }

      // Text sections (AND)
      if (filters.value.hasHistory && !row.has_history) return false
      if (filters.value.hasExam && !row.has_exam) return false
      if (filters.value.hasFindings && !row.has_findings) return false
      if (filters.value.hasDiagnosis && !row.has_diagnosis) return false
      if (filters.value.hasTreatment && !row.has_treatment) return false
      if (filters.value.hasDiscussion && !row.has_discussion) return false

      return true
    })
  })

  // KPI summary
  const summaryStats = computed<SummaryStats>(() => {
    const n = filteredData.value.length
    if (n === 0) {
      return { total: 0, medianAge: null, avgImages: 0, avgWords: 0 }
    }

    const ages = filteredData.value
      .map(c => c.patient_age)
      .filter((a): a is number => typeof a === 'number' && Number.isFinite(a))
      .sort((a, b) => a - b)

    let medianAge: number | null = null
    if (ages.length > 0) {
      const mid = Math.floor(ages.length / 2)
      medianAge = ages.length % 2 !== 0
        ? ages[mid]!
        : (ages[mid - 1]! + ages[mid]!) / 2
    }

    const avgImages =
      filteredData.value.reduce((sum, c) => sum + (c.imageCount || 0), 0) / n

    const avgWords =
      filteredData.value.reduce((sum, c) => sum + (c.word_count || 0), 0) / n

    return { total: n, medianAge, avgImages, avgWords }
  })

  // Age bins + unknown age count
  const ageBins = computed(() => {
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

  // table helpers
  const filtersSignature = computed(() =>
    JSON.stringify({
      query: filters.value.query.trim().toLowerCase(),
      genders: [...filters.value.genders].sort(),
      ageMin: filters.value.ageMin,
      ageMax: filters.value.ageMax,
      dateMin: filters.value.dateMin,
      dateMax: filters.value.dateMax,
      modalities: [...filters.value.modalities].map(s => s.trim().toLowerCase()).sort(),
      regions: [...filters.value.regions].map(s => s.trim().toLowerCase()).sort(),
      hasHistory: filters.value.hasHistory,
      hasExam: filters.value.hasExam,
      hasFindings: filters.value.hasFindings,
      hasDiagnosis: filters.value.hasDiagnosis,
      hasTreatment: filters.value.hasTreatment,
      hasDiscussion: filters.value.hasDiscussion,
      imageMin: filters.value.imageMin,
      imageMax: filters.value.imageMax,
      wordsMin: filters.value.wordsMin,
      wordsMax: filters.value.wordsMax,
    })
  )

  const resetFiltersLocal = () => {
    filters.value = {
      query: '',
      genders: [],
      ageMin: null,
      ageMax: null,
      dateMin: null,
      dateMax: null,
      modalities: [],
      regions: [],
      hasHistory: false,
      hasExam: false,
      hasFindings: false,
      hasDiagnosis: false,
      hasTreatment: false,
      hasDiscussion: false,
      imageMin: null,
      imageMax: null,
      wordsMin: null,
      wordsMax: null,
    }
  }

  return {
    filters,
    allModalities,
    regionGroups,
    filteredData,
    summaryStats,
    ageBins,
    unknownAgeCount,
    filtersSignature,
    resetFiltersLocal,
    normalizeGender,   // export for genderCounts
    getCaseMainRegions,
    getCaseSubregions,
  }
}
