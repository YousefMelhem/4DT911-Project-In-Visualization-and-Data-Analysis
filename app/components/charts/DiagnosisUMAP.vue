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
  dataSource?: 'text' | 'image'
  activeDiagnoses?: string[] | null
}>()

const emit = defineEmits<{
  pointClick: [diagnosis: string]
  clusterClick: [clusterId: number]
  selectionChange: [points: DiagnosisPoint[]]
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
const selectedPoints = ref<Set<number>>(new Set())
const selectionMode = ref<'none' | 'lasso' | 'rectangle' | 'click'>('none')

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

const activeDiagnosisSet = computed(() => {
  const set = new Set<string>()
  const list = props.activeDiagnoses ?? []
  for (const name of list) {
    if (name) set.add(name.toLowerCase())
  }
  return set
})

/* =========================
 * Selection Helpers
 * =======================*/
const clearSelection = () => {
  selectedPoints.value.clear()
  emit('selectionChange', [])
  if (data.value.length > 0) {
    nextTick(() => renderUMAP())
  }
}

const toggleSelectionMode = (mode: 'none' | 'lasso' | 'rectangle' | 'click') => {
  selectionMode.value = mode
  if (mode === 'none') {
    clearSelection()
  }
  // Re-render to apply new interaction mode
  if (data.value.length > 0) {
    nextTick(() => renderUMAP())
  }
}

const pointInPolygon = (point: [number, number], polygon: [number, number][]) => {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i]
    const pj = polygon[j]
    if (!pi || !pj) continue
    const xi = pi[0], yi = pi[1]
    const xj = pj[0], yj = pj[1]
    const intersect = ((yi > point[1]) !== (yj > point[1]))
        && (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

/** Central place for opacity logic (selection + cluster + external brushing) */
const getPointOpacity = (d: DiagnosisPoint, index: number): number => {
  // 1) Internal selection (click / lasso / rectangle) dominates
  if (selectedPoints.value.size > 0) {
    if (selectedPoints.value.has(index)) return 1
    return 0.3
  }

  // 2) External filters (cluster + activeDiagnoses) for brushing & linking
  const hasClusterFilter =
    props.selectedCluster !== null && props.selectedCluster !== undefined
  const hasActiveFilter = activeDiagnosisSet.value.size > 0

  const inCluster = !hasClusterFilter || d.cluster === props.selectedCluster

  const diagKey = d.diagnosis ? d.diagnosis.toLowerCase() : ''
  const inActive = !hasActiveFilter || activeDiagnosisSet.value.has(diagKey)

  // Highlight points that pass both filters, softly fade the rest
  return inCluster && inActive ? 0.7 : 0.08
}

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
    .attr('class', (_, i) => `data-point point-${i}`)
    .attr('cx', d => xScale(d.umap_x))
    .attr('cy', d => yScale(d.umap_y))
    .attr('r', d => sizeScale(d.frequency))
    .attr('fill', (d, i) => selectedPoints.value.has(i) ? '#ff6b6b' : colorScale(d.cluster.toString()))
    .attr('stroke', (d, i) => selectedPoints.value.has(i) ? '#ff0000' : '#fff')
    .attr('stroke-width', (d, i) => selectedPoints.value.has(i) ? 3 : 1)
    .attr('opacity', (d, i) => getPointOpacity(d, i))
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      if (selectionMode.value === 'none' || selectionMode.value === 'click') {
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
      }
    })
    .on('mouseout', function (_event, d) {
      const index = data.value.indexOf(d)
      if (!selectedPoints.value.has(index)) {
        d3.select(this)
          .attr('stroke-width', 1)
          .attr('opacity', getPointOpacity(d, index))
      }
      tooltip.style('display', 'none')
    })
    .on('click', (event, d) => {
      const index = data.value.indexOf(d)

      if (selectionMode.value === 'click') {
        // Click selection with Ctrl/Cmd for multi-select
        if (event.ctrlKey || event.metaKey) {
          if (selectedPoints.value.has(index)) {
            selectedPoints.value.delete(index)
          } else {
            selectedPoints.value.add(index)
          }
        } else {
          selectedPoints.value.clear()
          selectedPoints.value.add(index)
        }

        const selected = Array.from(selectedPoints.value).map(i => data.value[i]).filter(Boolean) as DiagnosisPoint[]
        emit('selectionChange', selected)
        renderUMAP()
      } else {
        emit('pointClick', d.diagnosis)
      }
    })

  // Update circle styling for selection
  circles
    .attr('fill', (d, i) => selectedPoints.value.has(i) ? '#ff6b6b' : colorScale(d.cluster.toString()))
    .attr('stroke', (d, i) => selectedPoints.value.has(i) ? '#ff0000' : '#fff')
    .attr('stroke-width', (d, i) => selectedPoints.value.has(i) ? 3 : 1)
    .attr('opacity', (d, i) => getPointOpacity(d, i))

  // Lasso Selection
  if (selectionMode.value === 'lasso') {
    let lassoPath: [number, number][] = []
    let lassoLine = g.append('path')
      .attr('class', 'lasso-path')
      .attr('fill', 'none')
      .attr('stroke', '#ff6b6b')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')

    const lassoStart = (event: any) => {
      lassoPath = []
      lassoLine.attr('d', '')
    }

    const lassoDrag = (event: any) => {
      const [x, y] = d3.pointer(event, g.node())
      lassoPath.push([x, y])

      const lineGenerator = d3.line()
      lassoLine.attr('d', lineGenerator(lassoPath) || '')
    }

    const lassoEnd = () => {
      if (lassoPath.length > 2) {
        // Close the path
        lassoPath.push(lassoPath[0]!)

        // Check which points are inside the lasso
        data.value.forEach((point, i) => {
          const px = xScale(point.umap_x)
          const py = yScale(point.umap_y)
          if (pointInPolygon([px, py], lassoPath)) {
            selectedPoints.value.add(i)
          }
        })

        const selected = Array.from(selectedPoints.value).map(i => data.value[i]).filter(Boolean) as DiagnosisPoint[]
        emit('selectionChange', selected)
        renderUMAP()
      }

      lassoPath = []
      lassoLine.attr('d', '')
    }

    svg.call(d3.drag<any, any>()
        .on('start', lassoStart)
        .on('drag', lassoDrag)
      .on('end', lassoEnd))
  }

  // Rectangle Selection
  if (selectionMode.value === 'rectangle') {
    let rectStart: [number, number] | null = null
    let selectionRect = g.append('rect')
      .attr('class', 'selection-rect')
      .attr('fill', 'rgba(255, 107, 107, 0.2)')
      .attr('stroke', '#ff6b6b')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
      .attr('display', 'none')

    const rectDragStart = (event: any) => {
      rectStart = d3.pointer(event, g.node())
      selectionRect.attr('display', null)
    }

    const rectDragging = (event: any) => {
      if (!rectStart) return
      const [x, y] = d3.pointer(event, g.node())
      const width = x - rectStart[0]
      const height = y - rectStart[1]

      selectionRect
        .attr('x', width < 0 ? x : rectStart[0])
        .attr('y', height < 0 ? y : rectStart[1])
        .attr('width', Math.abs(width))
        .attr('height', Math.abs(height))
    }

    const rectDragEnd = (event: any) => {
      if (!rectStart) return
      const [x, y] = d3.pointer(event, g.node())

      const minX = Math.min(rectStart[0], x)
      const maxX = Math.max(rectStart[0], x)
      const minY = Math.min(rectStart[1], y)
      const maxY = Math.max(rectStart[1], y)

      // Select points within rectangle
      data.value.forEach((point, i) => {
        const px = xScale(point.umap_x)
        const py = yScale(point.umap_y)
        if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
          selectedPoints.value.add(i)
        }
      })

      const selected = Array.from(selectedPoints.value).map(i => data.value[i]).filter(Boolean) as DiagnosisPoint[]
      emit('selectionChange', selected)

      selectionRect.attr('display', 'none')
      rectStart = null
      renderUMAP()
    }

    svg.call(d3.drag<any, any>()
        .on('start', rectDragStart)
        .on('drag', rectDragging)
      .on('end', rectDragEnd))
  }

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
    .on('click', (_event, clusterId) => {
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
    // Determine file names based on dataSource
    const source = props.dataSource || 'text'
    const umapFile = source === 'image' 
        ? 'diagnosis_umap_coords_image.json'
        : 'diagnosis_umap_coords.json'
    const labelsFile = source === 'image'
        ? 'cluster_labels_image.json'
        : 'cluster_labels.json'

    // Load UMAP coordinates
    const umapResponse = await fetch(`${DATA_URL}/${umapFile}`)
    if (!umapResponse.ok) throw new Error(`Failed to load ${source} UMAP coordinates`)
    const umapData = await umapResponse.json()

    // Load cluster labels
    const labelsResponse = await fetch(`${DATA_URL}/${labelsFile}`)
    if (!labelsResponse.ok) throw new Error(`Failed to load ${source} cluster labels`)
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

    console.log(`Loaded ${data.value.length} ${source} diagnosis points`)
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

// Reload data when dataSource changes
watch(() => props.dataSource, () => {
    loadData()
})

watch([() => props.width, () => props.height, () => props.selectedCluster], async () => {
    if (data.value.length > 0) {
      await nextTick()
      renderUMAP()
    }
  })
watch(
  () => props.activeDiagnoses,
  async () => {
    if (data.value.length > 0) {
      await nextTick()
      renderUMAP()
    }
  },
  { deep: true }
)
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
      <!-- Selection Tools -->
      <div class="selection-tools">
        <div class="tool-group">
          <label class="tool-label">Selection Mode:</label>
          <button
            :class="['tool-btn', { active: selectionMode === 'none' }]"
            @click="toggleSelectionMode('none')"
          >
            <span class="icon">👆</span> None
          </button>
          <button
            :class="['tool-btn', { active: selectionMode === 'click' }]"
            @click="toggleSelectionMode('click')"
          >
            <span class="icon">🖱️</span> Click
          </button>
          <button
            :class="['tool-btn', { active: selectionMode === 'lasso' }]"
            @click="toggleSelectionMode('lasso')"
          >
            <span class="icon">✏️</span> Lasso
          </button>
          <button
            :class="['tool-btn', { active: selectionMode === 'rectangle' }]"
            @click="toggleSelectionMode('rectangle')"
          >
            <span class="icon">▭</span> Rectangle
          </button>
        </div>
        <div v-if="selectedPoints.size > 0" class="selection-info">
          <span class="selected-count">{{ selectedPoints.size }} points selected</span>
          <button class="clear-selection-btn" @click="clearSelection">Clear Selection</button>
        </div>
      </div>

      <svg ref="svgRef"></svg>
      <div ref="tooltipRef" class="tooltip"></div>

      <!-- Info Panel -->
      <div class="info-panel">
        <p><strong>{{ data.length }}</strong> unique diagnoses</p>
        <p><strong>25</strong> clusters discovered by BioBERT</p>
        <p v-if="selectedCluster !== null && selectedCluster !== undefined">
          Showing: <strong>{{ clusterLabels[selectedCluster] }}</strong>
        </p>
        <p v-if="selectionMode === 'click'" class="selection-hint">
          Hold Ctrl/Cmd to select multiple points
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
  padding: 12px 12px 8px;
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
  margin-top: 8px;
  padding: 8px 10px;
  background: #f8f9fa;
  border-radius: 6px;
  font-size: 14px;
}

.info-panel p {
  margin: 4px 0;
}

.selection-hint {
  color: #666;
  font-size: 13px;
  font-style: italic;
}

.selection-tools {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  border: 1px solid #dee2e6;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-label {
  font-weight: 600;
  font-size: 14px;
  color: #495057;
  margin-right: 8px;
}

.tool-btn {
  padding: 8px 16px;
  background: white;
  border: 2px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #495057;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tool-btn:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
  transform: translateY(-1px);
}

.tool-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: white;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.tool-btn .icon {
  font-size: 16px;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-count {
  font-weight: 600;
  color: #ff6b6b;
  font-size: 14px;
  background: white;
  padding: 6px 12px;
  border-radius: 6px;
  border: 2px solid #ff6b6b;
}

.clear-selection-btn {
  padding: 6px 14px;
  background: #ff6b6b;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.clear-selection-btn:hover {
  background: #ff5252;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(255, 107, 107, 0.3);
}

svg {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>
