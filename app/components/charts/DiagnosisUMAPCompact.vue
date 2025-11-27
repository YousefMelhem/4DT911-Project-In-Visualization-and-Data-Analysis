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
  dataSource?: 'text' | 'image'
  selectedCluster?: number | null
}>()

const emit = defineEmits<{
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
const showFullViz = ref(false)
const selectedPoints = ref<Set<number>>(new Set())
const selectionMode = ref<'none' | 'lasso' | 'rectangle' | 'click'>('none')

const config = useRuntimeConfig()
const DATA_URL = `${config.public.apiUrl}/data/features`

// Larger size for better visibility
const w = 760
const h = 600
const margin = { top: 30, right: 10, bottom: 40, left: 40 }
const innerWidth = w - margin.left - margin.right
const innerHeight = h - margin.top - margin.bottom

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
  const circles = g.selectAll('circle')
    .data(data.value)
    .join('circle')
    .attr('class', (d, i) => `data-point point-${i}`)
    .attr('cx', d => xScale(d.umap_x))
    .attr('cy', d => yScale(d.umap_y))
    .attr('r', d => sizeScale(d.frequency))
    .attr('fill', (d, i) => selectedPoints.value.has(i) ? '#ff6b6b' : colorScale(d.cluster.toString()))
    .attr('stroke', (d, i) => 
      selectedPoints.value.has(i) ? '#ff0000' : (props.selectedCluster === d.cluster ? '#000' : '#fff')
    )
    .attr('stroke-width', (d, i) => 
      selectedPoints.value.has(i) ? 2 : (props.selectedCluster === d.cluster ? 2 : 0.5)
    )
    .attr('opacity', (d, i) => {
      if (selectedPoints.value.has(i)) return 1
      if (selectedPoints.value.size > 0) return 0.3
      return props.selectedCluster === null || props.selectedCluster === undefined || props.selectedCluster === d.cluster ? 0.7 : 0.2
    })
    .style('cursor', 'pointer')
    .on('mouseover', function(event, d) {
      if (selectionMode.value === 'none' || selectionMode.value === 'click') {
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
      }
    })
    .on('mouseout', function(event, d) {
      const index = data.value.indexOf(d)
      if (!selectedPoints.value.has(index)) {
        d3.select(this)
          .attr('stroke', props.selectedCluster === d.cluster ? '#000' : '#fff')
          .attr('stroke-width', props.selectedCluster === d.cluster ? 2 : 0.5)
          .attr('opacity', props.selectedCluster === null || props.selectedCluster === undefined || props.selectedCluster === d.cluster ? 0.7 : 0.2)
      }
      tooltip.style('display', 'none')
    })
    .on('click', (event, d) => {
      event.stopPropagation()
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
        emit('clusterClick', d.cluster)
      }
    })

  // Update circle styling for selection
  circles
    .attr('fill', (d, i) => selectedPoints.value.has(i) ? '#ff6b6b' : colorScale(d.cluster.toString()))
    .attr('stroke', (d, i) => 
      selectedPoints.value.has(i) ? '#ff0000' : (props.selectedCluster === d.cluster ? '#000' : '#fff')
    )
    .attr('stroke-width', (d, i) => 
      selectedPoints.value.has(i) ? 2 : (props.selectedCluster === d.cluster ? 2 : 0.5)
    )
    .attr('opacity', (d, i) => {
      if (selectedPoints.value.has(i)) return 1
      if (selectedPoints.value.size > 0) return 0.3
      return props.selectedCluster === null || props.selectedCluster === undefined || props.selectedCluster === d.cluster ? 0.7 : 0.2
    })

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
      lassoLine.attr('d', lineGenerator(lassoPath))
    }

    const lassoEnd = () => {
      if (lassoPath.length > 2) {
        lassoPath.push(lassoPath[0]!)
        
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
}

/* =========================
 * Data Loading
 * =======================*/
const loadData = async () => {
  loading.value = true
  error.value = null

  try {
    // Determine file suffix based on dataSource
    const suffix = props.dataSource === 'image' ? '_image' : ''
    
    // Load UMAP coordinates
    const umapResponse = await fetch(`${DATA_URL}/diagnosis_umap_coords${suffix}.json`)
    if (!umapResponse.ok) throw new Error('Failed to load UMAP coordinates')
    const umapData = await umapResponse.json()

    // Load cluster labels
    const labelsResponse = await fetch(`${DATA_URL}/cluster_labels${suffix}.json`)
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

watch(() => props.dataSource, () => {
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
    <div v-show="!loading && !error">
      <!-- Selection Tools -->
      <div class="selection-tools">
        <div class="tool-group">
          <label class="tool-label">Selection:</label>
          <button 
            :class="['tool-btn', { active: selectionMode === 'none' }]"
            @click="toggleSelectionMode('none')"
            title="Disable selection"
          >
            <span class="icon">👆</span> None
          </button>
          <button 
            :class="['tool-btn', { active: selectionMode === 'click' }]"
            @click="toggleSelectionMode('click')"
            title="Click to select (Ctrl/Cmd for multi)"
          >
            <span class="icon">🖱️</span> Click
          </button>
          <button 
            :class="['tool-btn', { active: selectionMode === 'lasso' }]"
            @click="toggleSelectionMode('lasso')"
            title="Lasso selection"
          >
            <span class="icon">✏️</span> Lasso
          </button>
          <button 
            :class="['tool-btn', { active: selectionMode === 'rectangle' }]"
            @click="toggleSelectionMode('rectangle')"
            title="Rectangle selection"
          >
            <span class="icon">▭</span> Rectangle
          </button>
        </div>
        <div v-if="selectedPoints.size > 0" class="selection-info">
          <span class="selected-count">{{ selectedPoints.size }} selected</span>
          <button class="clear-selection-btn" @click="clearSelection">Clear</button>
        </div>
      </div>

      <div class="umap-content">
        <div class="umap-viz">
          <svg ref="svgRef"></svg>
        </div>
        
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
      
      <div ref="tooltipRef" class="tooltip"></div>
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

.umap-content {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 1rem;
  align-items: start;
}

@media (max-width: 1200px) {
  .umap-content {
    grid-template-columns: 1fr;
  }
}

.umap-viz {
  width: 100%;
  min-height: 600px;
}

.tooltip {
  position: fixed;
  display: none;
  background: #2d3748;
  color: white;
  border: 1px solid #1a202c;
  border-radius: 6px;
  padding: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  z-index: 1000;
  font-size: 12px;
  line-height: 1.4;
  max-width: 250px;
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
