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

interface ClusterLabel {
  [key: string]: string
}

const props = defineProps<{
  width?: number
  height?: number
  selectedCluster?: number | null
}>()

const emit = defineEmits<{
  (e: 'pointClick', diagnosis: string): void
  (e: 'clusterClick', clusterId: number): void
}>()

/* =========================
 * State
 * =======================*/
const svgRef = ref<SVGSVGElement | null>(null)
const tooltipRef = ref<HTMLDivElement | null>(null)
const data = ref<DiagnosisPoint[]>([])
const clusterLabels = ref<ClusterLabel>({})
const loading = ref(true)
const error = ref<string | null>(null)

const config = useRuntimeConfig()
const DATA_URL = `${config.public.apiUrl}/data/features`

/* =========================
 * Computed
 * =======================*/
const w = computed(() => props.width || 1200)
const h = computed(() => props.height || 800)

const margin = { top: 40, right: 200, bottom: 60, left: 60 }
const innerWidth = computed(() => w.value - margin.left - margin.right)
const innerHeight = computed(() => h.value - margin.top - margin.bottom)

/* =========================
 * D3 Visualization
 * =======================*/
const renderUMAP = () => {
  if (!svgRef.value) {
    console.warn('SVG ref not available for full UMAP')
    return
  }
  if (data.value.length === 0) {
    console.warn('No data available to render full UMAP')
    return
  }

  console.log(`Rendering full UMAP with ${data.value.length} points`)

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

  // Color scale - 25 distinct colors
  const colorScale = d3.scaleOrdinal(d3.schemeTableau10.concat(d3.schemePaired))
    .domain(Array.from({ length: 25 }, (_, i) => i.toString()))

  // Size scale (log scale for frequency)
  const sizeScale = d3.scaleSqrt()
    .domain([1, d3.max(data.value, d => d.frequency) || 100])
    .range([3, 20])

  // Axes
  const xAxis = d3.axisBottom(xScale).ticks(10)
  const yAxis = d3.axisLeft(yScale).ticks(10)

  g.append('g')
    .attr('transform', `translate(0,${innerHeight.value})`)
    .call(xAxis)
    .append('text')
    .attr('x', innerWidth.value / 2)
    .attr('y', 40)
    .attr('fill', 'currentColor')
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .text('UMAP Dimension 1')

  g.append('g')
    .call(yAxis)
    .append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight.value / 2)
    .attr('y', -40)
    .attr('fill', 'currentColor')
    .attr('text-anchor', 'middle')
    .style('font-size', '14px')
    .text('UMAP Dimension 2')

  // Title
  svg.append('text')
    .attr('x', w.value / 2)
    .attr('y', 25)
    .attr('text-anchor', 'middle')
    .style('font-size', '18px')
    .style('font-weight', 'bold')
    .text('Diagnosis Clustering (BioBERT + UMAP)')

  // Tooltip
  const tooltip = d3.select(tooltipRef.value)

  // Draw points
  const circles = g.selectAll('circle')
    .data(data.value)
    .join('circle')
    .attr('cx', d => xScale(d.umap_x))
    .attr('cy', d => yScale(d.umap_y))
    .attr('r', d => sizeScale(d.frequency))
    .attr('fill', d => colorScale(d.cluster.toString()))
    .attr('stroke', '#fff')
    .attr('stroke-width', 1)
    .attr('opacity', d => 
      props.selectedCluster === null || props.selectedCluster === undefined || props.selectedCluster === d.cluster ? 0.7 : 0.15
    )
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      d3.select(this)
        .attr('stroke-width', 3)
        .attr('opacity', 1)

      const clusterName = clusterLabels.value[d.cluster] || `Cluster ${d.cluster}`
      
      tooltip
        .style('display', 'block')
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 10}px`)
        .html(`
          <div style="font-weight: bold; margin-bottom: 4px; color: ${colorScale(d.cluster.toString())}">
            ${clusterName}
          </div>
          <div style="font-size: 13px; margin-bottom: 2px;">
            ${d.diagnosis.length > 80 ? d.diagnosis.substring(0, 80) + '...' : d.diagnosis}
          </div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            Frequency: ${d.frequency} cases
          </div>
        `)
    })
    .on('mouseout', function(event, d) {
      d3.select(this)
        .attr('stroke-width', 1)
        .attr('opacity', props.selectedCluster === null || props.selectedCluster === undefined || props.selectedCluster === d.cluster ? 0.7 : 0.15)

      tooltip.style('display', 'none')
    })
    .on('click', (event, d) => {
      emit('pointClick', d.diagnosis)
    })

  // Legend
  const uniqueClusters = Array.from(new Set(data.value.map(d => d.cluster))).sort((a, b) => a - b)
  
  const legend = svg.append('g')
    .attr('transform', `translate(${w.value - margin.right + 20}, ${margin.top})`)

  legend.append('text')
    .attr('y', -10)
    .style('font-size', '14px')
    .style('font-weight', 'bold')
    .text('Clusters')

  const legendItems = legend.selectAll('.legend-item')
    .data(uniqueClusters)
    .join('g')
    .attr('class', 'legend-item')
    .attr('transform', (d, i) => `translate(0, ${i * 25})`)
    .style('cursor', 'pointer')
    .on('click', (event, clusterId) => {
      emit('clusterClick', clusterId)
    })
    .on('mouseover', function() {
      d3.select(this).select('rect')
        .attr('stroke', '#000')
        .attr('stroke-width', 2)
    })
    .on('mouseout', function() {
      d3.select(this).select('rect')
        .attr('stroke', 'none')
    })

  legendItems.append('rect')
    .attr('width', 18)
    .attr('height', 18)
    .attr('fill', d => colorScale(d.toString()))
    .attr('rx', 3)

  legendItems.append('text')
    .attr('x', 25)
    .attr('y', 13)
    .style('font-size', '12px')
    .text(d => {
      const label = clusterLabels.value[d] || `Cluster ${d}`
      const count = data.value.filter(p => p.cluster === d).length
      return `${label.substring(0, 15)}... (${count})`
    })
}

/* =========================
 * Data Loading
 * =======================*/
const loadData = async () => {
  loading.value = true
  error.value = null

  try {
    // Load UMAP coordinates
    const umapResponse = await fetch(`${DATA_URL}/diagnosis_umap_coords.json`)
    if (!umapResponse.ok) throw new Error('Failed to load UMAP coordinates')
    const umapData = await umapResponse.json()

    // Load cluster labels
    const labelsResponse = await fetch(`${DATA_URL}/cluster_labels.json`)
    if (!labelsResponse.ok) throw new Error('Failed to load cluster labels')
    const labelsData = await labelsResponse.json()

    clusterLabels.value = labelsData.cluster_labels

    // Combine data
    data.value = umapData.diagnoses.map((diagnosis: string, i: number) => ({
      diagnosis,
      cluster: umapData.clusters[i],
      frequency: umapData.frequencies[i],
      umap_x: umapData.umap_x[i],
      umap_y: umapData.umap_y[i],
    }))

    console.log(`✅ Loaded ${data.value.length} diagnosis points`)
    await nextTick()
    renderUMAP()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error'
    console.error('Error loading UMAP data:', err)
  } finally {
    loading.value = false
  }
}

/* =========================
 * Lifecycle
 * =======================*/
onMounted(() => {
  loadData()
})

watch([() => props.width, () => props.height, () => props.selectedCluster], async () => {
  if (data.value.length > 0) {
    await nextTick()
    renderUMAP()
  }
})
</script>

<template>
  <div class="umap-container">
    <!-- Loading State -->
    <div v-show="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading diagnosis clusters...</p>
    </div>

    <!-- Error State -->
    <div v-show="error && !loading" class="error-state">
      <p>❌ Error: {{ error }}</p>
    </div>

    <!-- UMAP Visualization -->
    <div v-show="!loading && !error" class="umap-wrapper">
      <svg ref="svgRef"></svg>
      <div ref="tooltipRef" class="tooltip"></div>
      
      <!-- Info Panel -->
      <div class="info-panel">
        <p><strong>{{ data.length }}</strong> unique diagnoses</p>
        <p><strong>25</strong> clusters discovered by BioBERT</p>
        <p v-if="selectedCluster !== null && selectedCluster !== undefined">
          Showing: <strong>{{ clusterLabels[selectedCluster] }}</strong>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.umap-container {
  position: relative;
  width: 100%;
  min-height: 800px;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  font-size: 16px;
  color: #666;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.umap-wrapper {
  position: relative;
}

.tooltip {
  position: fixed;
  display: none;
  background: #2d3748;
  color: white;
  border: 1px solid #1a202c;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  z-index: 1000;
  max-width: 350px;
  font-size: 14px;
  line-height: 1.5;
}

.info-panel {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 14px;
}

.info-panel p {
  margin: 8px 0;
}

.clear-btn {
  margin-left: 10px;
  padding: 4px 12px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.clear-btn:hover {
  background: #c0392b;
}

svg {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
