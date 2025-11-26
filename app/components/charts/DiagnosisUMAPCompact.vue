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
  selectedCluster?: number | null
}>()

const emit = defineEmits<{
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
const showFullViz = ref(false)

const config = useRuntimeConfig()
const DATA_URL = `${config.public.apiUrl}/data/features`

// Larger size for better visibility
const w = 760
const h = 600
const margin = { top: 30, right: 10, bottom: 40, left: 40 }
const innerWidth = w - margin.left - margin.right
const innerHeight = h - margin.top - margin.bottom

/* =========================
 * D3 Visualization (Compact)
 * =======================*/
const renderUMAP = () => {
  if (!svgRef.value) {
    console.warn('SVG ref not available')
    return
  }
  if (data.value.length === 0) {
    console.warn('No data available to render')
    return
  }

  console.log(`Rendering UMAP with ${data.value.length} points, selectedCluster:`, props.selectedCluster)

  // Clear previous
  d3.select(svgRef.value).selectAll('*').remove()

  const svg = d3.select(svgRef.value)
    .attr('width', w)
    .attr('height', h)

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  // Scales
  const xExtent = d3.extent(data.value, d => d.umap_x) as [number, number]
  const yExtent = d3.extent(data.value, d => d.umap_y) as [number, number]

  const xScale = d3.scaleLinear()
    .domain([xExtent[0] - 1, xExtent[1] + 1])
    .range([0, innerWidth])

  const yScale = d3.scaleLinear()
    .domain([yExtent[0] - 1, yExtent[1] + 1])
    .range([innerHeight, 0])

  // Color scale
  const colorScale = d3.scaleOrdinal(d3.schemeTableau10.concat(d3.schemePaired))
    .domain(Array.from({ length: 25 }, (_, i) => i.toString()))

  // Larger size scale for better visibility
  const sizeScale = d3.scaleSqrt()
    .domain([1, d3.max(data.value, d => d.frequency) || 100])
    .range([3, 12])

  // Axes
  const xAxis = d3.axisBottom(xScale).ticks(8)
  const yAxis = d3.axisLeft(yScale).ticks(8)

  g.append('g')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(xAxis)
    .style('font-size', '11px')

  g.append('g')
    .call(yAxis)
    .style('font-size', '11px')

  // Title
  svg.append('text')
    .attr('x', w / 2)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .style('font-size', '16px')
    .style('font-weight', 'bold')
    .text('Diagnosis Clusters (Click to Filter)')

  // Tooltip
  const tooltip = d3.select(tooltipRef.value)

  // Draw points
  g.selectAll('circle')
    .data(data.value)
    .join('circle')
    .attr('cx', d => xScale(d.umap_x))
    .attr('cy', d => yScale(d.umap_y))
    .attr('r', d => sizeScale(d.frequency))
    .attr('fill', d => colorScale(d.cluster.toString()))
    .attr('stroke', d => 
      props.selectedCluster === d.cluster ? '#000' : '#fff'
    )
    .attr('stroke-width', d => 
      props.selectedCluster === d.cluster ? 2 : 0.5
    )
    .attr('opacity', d => 
      props.selectedCluster === null || props.selectedCluster === undefined || props.selectedCluster === d.cluster ? 0.7 : 0.2
    )
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      d3.select(this)
        .attr('stroke', '#000')
        .attr('stroke-width', 2)
        .attr('opacity', 1)

      const clusterName = clusterLabels.value[d.cluster] || `Cluster ${d.cluster}`
      const diagCount = data.value.filter(p => p.cluster === d.cluster).length
      
      tooltip
        .style('display', 'block')
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 10}px`)
        .html(`
          <div style="font-weight: bold; color: ${colorScale(d.cluster.toString())}">
            ${clusterName}
          </div>
          <div style="font-size: 11px; margin-top: 4px; color: white;">
            ${diagCount} unique diagnoses
          </div>
        `)
    })
    .on('mouseout', function(event, d) {
      d3.select(this)
        .attr('stroke', props.selectedCluster === d.cluster ? '#000' : '#fff')
        .attr('stroke-width', props.selectedCluster === d.cluster ? 2 : 0.5)
        .attr('opacity', props.selectedCluster === null || props.selectedCluster === undefined || props.selectedCluster === d.cluster ? 0.7 : 0.2)

      tooltip.style('display', 'none')
    })
    .on('click', (event, d) => {
      event.stopPropagation()
      emit('clusterClick', d.cluster)
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

    console.log(`✅ Loaded ${data.value.length} diagnosis points for compact UMAP`)
    
    // Use nextTick to ensure DOM is ready
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

watch(() => props.selectedCluster, async () => {
  if (data.value.length > 0) {
    await nextTick()
    renderUMAP()
  }
})

watch(() => data.value.length, async (newLength) => {
  if (newLength > 0) {
    await nextTick()
    renderUMAP()
  }
})
</script>

<template>
  <div class="umap-compact-container">
    <!-- Loading State -->
    <div v-show="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading clusters...</p>
    </div>

    <!-- Error State -->
    <div v-show="error && !loading" class="error-state">
      <p>⚠️ Could not load cluster visualization</p>
    </div>

    <!-- UMAP Visualization -->
    <div v-show="!loading && !error" class="umap-wrapper">
      <svg ref="svgRef"></svg>
      <div ref="tooltipRef" class="tooltip"></div>
      
      <!-- Cluster Legend (Scrollable) -->
      <div class="cluster-legend">
        <div class="legend-header">
          <strong>Clusters ({{ 25 }})</strong>
          <button 
            v-if="selectedCluster !== null && selectedCluster !== undefined" 
            @click="emit('clusterClick', -1)"
            class="clear-filter-btn"
          >
            ✕ Clear
          </button>
        </div>
        <div class="legend-grid">
          <div
            v-for="clusterId in Array.from({ length: 25 }, (_, i) => i)"
            :key="clusterId"
            class="legend-item"
            :class="{ active: selectedCluster === clusterId }"
            @click="emit('clusterClick', clusterId)"
            :title="clusterLabels[clusterId] || `Cluster ${clusterId}`"
          >
            <div 
              class="legend-color" 
              :style="{ 
                backgroundColor: `hsl(${clusterId * 15}, 70%, 60%)` 
              }"
            ></div>
            <span class="legend-label">
              {{ clusterLabels[clusterId] || `Cluster ${clusterId}` }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.umap-compact-container {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  font-size: 14px;
  color: #666;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.umap-wrapper {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) 260px;
  gap: 1rem;
  align-items: start;
}

@media (max-width: 1200px) {
  .umap-wrapper {
    grid-template-columns: 1fr;
  }
}

.tooltip {
  position: absolute;
  display: none;
  background: #2d3748;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  z-index: 1000;
  font-size: 12px;
  line-height: 1.4;
}

.cluster-legend {
  width: 100%;
  max-width: 260px;
  background: #f9fafb;
  border-radius: 8px;
  padding: 0.8rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.legend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e5e7eb;
  font-size: 14px;
  font-weight: 600;
}

.clear-filter-btn {
  padding: 0.35rem 0.85rem;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-filter-btn:hover {
  background: #c0392b;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.legend-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 550px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

/* Custom scrollbar */
.legend-grid::-webkit-scrollbar {
  width: 8px;
}

.legend-grid::-webkit-scrollbar-track {
  background: #e5e7eb;
  border-radius: 4px;
}

.legend-grid::-webkit-scrollbar-thumb {
  background: #9ca3af;
  border-radius: 4px;
}

.legend-grid::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
}

.legend-item:hover {
  border-color: #667eea;
  transform: translateX(4px);
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.2);
}

.legend-item.active {
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  box-shadow: 0 3px 8px rgba(102, 126, 234, 0.3);
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.legend-item.active .legend-color {
  border-color: white;
}

.legend-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

svg {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
