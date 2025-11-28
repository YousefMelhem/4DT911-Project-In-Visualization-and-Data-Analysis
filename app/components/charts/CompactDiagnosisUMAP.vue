<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick } from 'vue'
import * as d3 from 'd3'

/* =========================
 * Props & Emits
 * =======================*/
interface DiagnosisPoint {
  diagnosis: string
  cluster: number
  frequency: number
  umap_x: number
  umap_y: number
}

const props = defineProps<{
  width?: number
  height?: number
  dataSource: 'text' | 'image'
  highlightedDiagnoses?: string[]
  selectedCluster?: number | null
  title?: string
}>()

const emit = defineEmits<{
  diagnosisClick: [diagnosis: string]
}>()

/* =========================
 * State
 * =======================*/
const svgRef = ref<SVGSVGElement | null>(null)
const tooltipRef = ref<HTMLDivElement | null>(null)
const data = ref<DiagnosisPoint[]>([])
const clusterLabels = ref<{ [key: string]: string }>({})
const loading = ref(true)
const error = ref<string | null>(null)

const config = useRuntimeConfig()
const DATA_URL = `${config.public.apiUrl}/data/features`

/* =========================
 * Computed
 * =======================*/
const w = computed(() => props.width || 600)
const h = computed(() => props.height || 500)

const margin = { top: 40, right: 20, bottom: 50, left: 50 }
const innerWidth = computed(() => w.value - margin.left - margin.right)
const innerHeight = computed(() => h.value - margin.top - margin.bottom)

const highlightedSet = computed(() => new Set(props.highlightedDiagnoses || []))

/* =========================
 * Data Loading
 * =======================*/
const loadData = async () => {
  loading.value = true
  error.value = null
  
  try {
    const suffix = props.dataSource === 'image' ? '_image' : ''
    const umapFile = `diagnosis_umap_coords${suffix}.json`
    const clusterFile = `diagnosis_${props.dataSource === 'image' ? 'image_' : 'biobert_'}clusters.json`
    
    console.log(`Loading UMAP data from: ${DATA_URL}/${umapFile}`)
    
    // Load UMAP coordinates
    const umapResponse: any = await $fetch(`${DATA_URL}/${umapFile}`)
    
    console.log('UMAP response:', umapResponse)
    
    // Validate response
    if (!umapResponse || !umapResponse.diagnoses) {
      console.error('Invalid UMAP response structure:', umapResponse)
      throw new Error('Invalid UMAP data format - missing diagnoses array')
    }
    
    if (!Array.isArray(umapResponse.diagnoses) || umapResponse.diagnoses.length === 0) {
      console.error('Diagnoses is not an array or is empty:', umapResponse.diagnoses)
      throw new Error('Invalid UMAP data format - diagnoses must be a non-empty array')
    }
    
    // Load cluster labels
    let clusterData: any = {}
    try {
      clusterData = await $fetch(`${DATA_URL}/${clusterFile}`)
      clusterLabels.value = clusterData.cluster_labels || {}
    } catch (e) {
      console.warn('Could not load cluster labels:', e)
    }
    
    // Format data
    const points: DiagnosisPoint[] = []
    const diagnoses = umapResponse.diagnoses || []
    const clusters = umapResponse.clusters || []
    const frequencies = umapResponse.frequencies || umapResponse.frequency || []
    const umap_x = umapResponse.umap_x || []
    const umap_y = umapResponse.umap_y || []
    
    for (let i = 0; i < diagnoses.length; i++) {
      points.push({
        diagnosis: diagnoses[i],
        cluster: clusters[i],
        frequency: frequencies[i],
        umap_x: umap_x[i],
        umap_y: umap_y[i]
      })
    }
    
    console.log(`Loaded ${points.length} diagnosis points`)
    data.value = points
    nextTick(() => renderUMAP())
  } catch (err: any) {
    console.error('Error loading UMAP data:', err)
    error.value = `Failed to load UMAP visualization: ${err?.message || err}`
  } finally {
    loading.value = false
  }
}

/* =========================
 * D3 Visualization
 * =======================*/
const renderUMAP = () => {
  if (!svgRef.value || data.value.length === 0) {
    return
  }

  // Clear previous
  d3.select(svgRef.value).selectAll('*').remove()

  const svg = d3.select(svgRef.value)
    .attr('width', w.value)
    .attr('height', h.value)

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  // Scales
  const xExtent = d3.extent(data.value, d => d.umap_x) as [number, number]
  const yExtent = d3.extent(data.value, d => d.umap_y) as [number, number]

  const xScale = d3.scaleLinear()
    .domain([xExtent[0] - 1, xExtent[1] + 1])
    .range([0, innerWidth.value])

  const yScale = d3.scaleLinear()
    .domain([yExtent[0] - 1, yExtent[1] + 1])
    .range([innerHeight.value, 0])

  // Color scale
  const colorScale = d3.scaleOrdinal(d3.schemeTableau10.concat(d3.schemePaired))
    .domain(Array.from({ length: 25 }, (_, i) => i.toString()))

  // Size scale
  const sizeScale = d3.scaleSqrt()
    .domain([1, d3.max(data.value, d => d.frequency) || 100])
    .range([2, 15])

  // Axes
  const xAxis = d3.axisBottom(xScale).ticks(8)
  const yAxis = d3.axisLeft(yScale).ticks(8)

  g.append('g')
    .attr('transform', `translate(0,${innerHeight.value})`)
    .call(xAxis)
    .style('font-size', '11px')
    .append('text')
    .attr('x', innerWidth.value / 2)
    .attr('y', 35)
    .attr('fill', 'currentColor')
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .text('UMAP Dimension 1')

  g.append('g')
    .call(yAxis)
    .style('font-size', '11px')
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight.value / 2)
    .attr('y', -35)
    .attr('fill', 'currentColor')
    .attr('text-anchor', 'middle')
    .style('font-size', '12px')
    .text('UMAP Dimension 2')

  // Title
  svg.append('text')
    .attr('x', w.value / 2)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .text(props.title || `${props.dataSource === 'image' ? 'Image' : 'Text'} UMAP`)

  // Tooltip
  const tooltip = d3.select(tooltipRef.value)

  // Draw points
  g.selectAll('circle')
    .data(data.value)
    .join('circle')
    .attr('cx', d => xScale(d.umap_x))
    .attr('cy', d => yScale(d.umap_y))
    .attr('r', d => {
      const isHighlighted = highlightedSet.value.has(d.diagnosis)
      const isInSelectedCluster = props.selectedCluster !== null && props.selectedCluster !== undefined && d.cluster === props.selectedCluster
      return (isHighlighted || isInSelectedCluster) ? sizeScale(d.frequency) * 1.5 : sizeScale(d.frequency)
    })
    .attr('fill', d => {
      const isHighlighted = highlightedSet.value.has(d.diagnosis)
      if (isHighlighted) return '#ff6b6b'
      return colorScale(d.cluster.toString())
    })
    .attr('stroke', d => {
      const isHighlighted = highlightedSet.value.has(d.diagnosis)
      const isInSelectedCluster = props.selectedCluster !== null && props.selectedCluster !== undefined && d.cluster === props.selectedCluster
      if (isHighlighted) return '#d63031'
      if (isInSelectedCluster) return '#3498db'
      return '#fff'
    })
    .attr('stroke-width', d => {
      const isHighlighted = highlightedSet.value.has(d.diagnosis)
      const isInSelectedCluster = props.selectedCluster !== null && props.selectedCluster !== undefined && d.cluster === props.selectedCluster
      if (isHighlighted) return 3
      if (isInSelectedCluster) return 2
      return 0.5
    })
    .attr('opacity', d => {
      const isHighlighted = highlightedSet.value.has(d.diagnosis)
      const isInSelectedCluster = props.selectedCluster !== null && props.selectedCluster !== undefined && d.cluster === props.selectedCluster
      
      if (highlightedSet.value.size > 0) {
        return isHighlighted ? 0.95 : 0.15
      }
      if (props.selectedCluster !== null && props.selectedCluster !== undefined) {
        return isInSelectedCluster ? 0.8 : 0.2
      }
      return 0.7
    })
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      const isHighlighted = highlightedSet.value.has(d.diagnosis)
      if (!isHighlighted) {
        d3.select(this)
          .attr('stroke-width', 2)
          .attr('opacity', 0.9)
      }

      tooltip
        .style('display', 'block')
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .html(`
          <div class="tooltip-content">
            <strong>${d.diagnosis.substring(0, 80)}${d.diagnosis.length > 80 ? '...' : ''}</strong><br>
            <span>Cluster: ${d.cluster} ${clusterLabels.value[d.cluster] ? `(${clusterLabels.value[d.cluster]})` : ''}</span><br>
            <span>Frequency: ${d.frequency} cases</span><br>
            <span>Coords: (${d.umap_x.toFixed(2)}, ${d.umap_y.toFixed(2)})</span>
          </div>
        `)
    })
    .on('mouseout', function(event, d) {
      const isHighlighted = highlightedSet.value.has(d.diagnosis)
      if (!isHighlighted) {
        d3.select(this)
          .attr('stroke-width', 0.5)
          .attr('opacity', highlightedSet.value.size > 0 ? 0.15 : 0.7)
      }
      
      tooltip.style('display', 'none')
    })
    .on('click', (event, d) => {
      event.stopPropagation()
      emit('diagnosisClick', d.diagnosis)
    })

  // Add legend if there are highlighted diagnoses
  if (highlightedSet.value.size > 0) {
    const legend = svg.append('g')
      .attr('transform', `translate(${w.value - 150}, 40)`)
    
    legend.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 8)
      .attr('fill', '#ff6b6b')
      .attr('stroke', '#d63031')
      .attr('stroke-width', 2)
    
    legend.append('text')
      .attr('x', 15)
      .attr('y', 4)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text(`Results (${highlightedSet.value.size})`)
  }
}

/* =========================
 * Lifecycle
 * =======================*/
onMounted(() => {
  loadData()
})

watch(() => props.dataSource, () => {
  loadData()
})

watch(() => props.highlightedDiagnoses, () => {
  if (data.value.length > 0) {
    nextTick(() => renderUMAP())
  }
}, { deep: true })

watch(() => props.selectedCluster, () => {
  if (data.value.length > 0) {
    nextTick(() => renderUMAP())
  }
})
</script>

<template>
  <div class="compact-diagnosis-umap">
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <p>Loading UMAP...</p>
    </div>
    
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>
    
    <div v-else class="chart-container">
      <svg ref="svgRef"></svg>
      <div ref="tooltipRef" class="tooltip" style="display: none;"></div>
    </div>
  </div>
</template>

<style scoped>
.compact-diagnosis-umap {
  width: 100%;
  height: 100%;
  position: relative;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.loading, .error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 500px;
  color: #666;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 10px;
  border-radius: 5px;
  font-size: 12px;
  pointer-events: none;
  z-index: 1000;
  max-width: 300px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.tooltip-content {
  line-height: 1.5;
}

.tooltip-content strong {
  color: #ffd700;
  display: block;
  margin-bottom: 5px;
}

.tooltip-content span {
  display: block;
  margin: 3px 0;
  font-size: 11px;
}
</style>
