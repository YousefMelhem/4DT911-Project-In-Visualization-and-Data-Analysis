<template>
  <div class="cluster-visualization">
    <div class="visualization-controls">
      <div class="view-controls">
        <button 
          @click="currentView = 'scatter'"
          :class="{ active: currentView === 'scatter' }"
          class="view-button"
        >
          Scatter Plot
        </button>
        <button 
          @click="currentView = 'network'"
          :class="{ active: currentView === 'network' }"
          class="view-button"
        >
          Network Graph
        </button>
      </div>
      
      <div class="zoom-controls">
        <button @click="resetZoom" class="zoom-button">Reset Zoom</button>
      </div>
    </div>

    <div class="visualization-content">
      <!-- Loading State -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Generating visualization...</p>
      </div>

      <!-- Visualization Container -->
      <div 
        v-else
        ref="visualizationContainer" 
        class="d3-container"
        :class="currentView"
      ></div>
    </div>

    <!-- Legend -->
    <div class="cluster-legend" v-if="!isLoading">
      <h4>Cluster Legend</h4>
      <div class="legend-items">
        <div 
          v-for="(stats, clusterId) in clusteringData.cluster_statistics" 
          :key="clusterId"
          class="legend-item"
        >
          <div 
            class="legend-color"
            :style="{ backgroundColor: getClusterColor(getClusterIndex(clusterId)) }"
          ></div>
          <span class="legend-label">
            {{ formatClusterName(clusterId) }} ({{ stats.size }} cases)
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as d3 from 'd3'
import type { KMeansResponse } from '@/services/clusteringApi'

interface Props {
  clusteringData: KMeansResponse
  featureNames: string[]
}

const props = defineProps<Props>()

// Reactive state
const isLoading = ref(true)
const currentView = ref<'scatter' | 'network'>('scatter')
const visualizationContainer = ref<HTMLElement | null>(null)

// D3 state
let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null
let simulation: d3.Simulation<any, undefined> | null = null

// Color scheme for clusters
const clusterColors = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#8e44ad'
]

const getClusterColor = (index: number): string => {
  return clusterColors[index % clusterColors.length]
}

const getClusterIndex = (clusterId: string | number): number => {
  if (typeof clusterId === 'string') {
    return parseInt(clusterId.split('_')[1] || '0')
  }
  return clusterId
}

const formatClusterName = (clusterId: string | number): string => {
  if (typeof clusterId === 'string') {
    return clusterId.replace('_', ' ').toUpperCase()
  }
  return `CLUSTER ${clusterId}`
}

// Methods
const initializeVisualization = () => {
  if (!visualizationContainer.value) return

  // Clear previous visualization
  d3.select(visualizationContainer.value).selectAll('*').remove()

  const container = visualizationContainer.value
  const containerRect = container.getBoundingClientRect()
  const width = Math.max(800, containerRect.width)
  const height = 600
  const margin = { top: 20, right: 20, bottom: 40, left: 40 }

  // Create SVG
  svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('border', '1px solid #ddd')
    .style('border-radius', '8px')

  if (currentView.value === 'scatter') {
    createScatterPlot(width, height, margin)
  } else {
    createNetworkGraph(width, height, margin)
  }

  isLoading.value = false
}

const createScatterPlot = (width: number, height: number, margin: any) => {
  if (!svg) return

  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  // Create main group
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  // Prepare data for scatter plot
  const scatterData = props.clusteringData.cases_with_clusters.map((case_, index) => ({
    ...case_,
    x: Math.random() * innerWidth, // Simplified positioning
    y: Math.random() * innerHeight,
    cluster: case_.cluster,
    id: index
  }))

  // Add zoom behavior
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 5])
    .on('zoom', (event) => {
      g.attr('transform', 
        `translate(${margin.left + event.transform.x},${margin.top + event.transform.y}) scale(${event.transform.k})`
      )
    })

  svg.call(zoom)

  // Create circles for each case
  const circles = g.selectAll('.case-circle')
    .data(scatterData)
    .enter()
    .append('circle')
    .attr('class', 'case-circle')
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)
    .attr('r', 6)
    .attr('fill', d => getClusterColor(d.cluster))
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .style('opacity', 0.8)

  // Add hover effects
  circles
    .on('mouseover', function(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', 8)
        .style('opacity', 1)

      // Show tooltip
      showTooltip(event, d)
    })
    .on('mouseout', function() {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', 6)
        .style('opacity', 0.8)

      hideTooltip()
    })

  // Add axes labels
  g.append('text')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + 35)
    .style('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('fill', '#666')
    .text('Feature Space Projection')

  g.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -innerHeight / 2)
    .attr('y', -25)
    .style('text-anchor', 'middle')
    .style('font-size', '12px')
    .style('fill', '#666')
    .text('Cluster Assignment')
}

const createNetworkGraph = (width: number, height: number, margin: any) => {
  if (!svg) return

  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  // Create main group
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)

  // Prepare nodes and links
  const nodes = props.clusteringData.cases_with_clusters.map((case_, index) => ({
    id: index,
    cluster: case_.cluster,
    case: case_,
    x: innerWidth / 2 + (Math.random() - 0.5) * 100,
    y: innerHeight / 2 + (Math.random() - 0.5) * 100
  }))

  // Create links between nodes in the same cluster
  const links: Array<{source: number, target: number}> = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < Math.min(i + 5, nodes.length); j++) {
      if (nodes[i].cluster === nodes[j].cluster && Math.random() > 0.7) {
        links.push({ source: i, target: j })
      }
    }
  }

  // Create force simulation
  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id((d: any) => d.id).distance(50))
    .force('charge', d3.forceManyBody().strength(-100))
    .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
    .force('collision', d3.forceCollide().radius(15))

  // Add zoom behavior
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 3])
    .on('zoom', (event) => {
      g.attr('transform', 
        `translate(${margin.left + event.transform.x},${margin.top + event.transform.y}) scale(${event.transform.k})`
      )
    })

  svg.call(zoom)

  // Create links
  const link = g.append('g')
    .selectAll('.link')
    .data(links)
    .enter()
    .append('line')
    .attr('class', 'link')
    .style('stroke', '#999')
    .style('stroke-opacity', 0.3)
    .style('stroke-width', 1)

  // Create nodes
  const node = g.append('g')
    .selectAll('.node')
    .data(nodes)
    .enter()
    .append('circle')
    .attr('class', 'node')
    .attr('r', 8)
    .attr('fill', d => getClusterColor(d.cluster))
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .style('cursor', 'pointer')
    .call(d3.drag<SVGCircleElement, any>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended)
    )

  // Add hover effects
  node
    .on('mouseover', function(event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', 12)

      showTooltip(event, d.case)
    })
    .on('mouseout', function() {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('r', 8)

      hideTooltip()
    })

  // Update positions on simulation tick
  simulation.on('tick', () => {
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y)

    node
      .attr('cx', (d: any) => d.x)
      .attr('cy', (d: any) => d.y)
  })
}

// Drag functions for network graph
const dragstarted = (event: any, d: any) => {
  if (!event.active && simulation) simulation.alphaTarget(0.3).restart()
  d.fx = d.x
  d.fy = d.y
}

const dragged = (event: any, d: any) => {
  d.fx = event.x
  d.fy = event.y
}

const dragended = (event: any, d: any) => {
  if (!event.active && simulation) simulation.alphaTarget(0)
  d.fx = null
  d.fy = null
}

// Tooltip functions
let tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any> | null = null

const showTooltip = (event: MouseEvent, data: any) => {
  if (!tooltip) {
    tooltip = d3.select('body')
      .append('div')
      .attr('class', 'cluster-tooltip')
      .style('position', 'absolute')
      .style('padding', '10px')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('border-radius', '5px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
  }

  const caseData = data.case || data
  
  if (tooltip) {
    tooltip.html(`
      <strong>Cluster ${caseData.cluster}</strong><br/>
      <strong>Title:</strong> ${caseData.case_title.substring(0, 100)}...<br/>
      <strong>Features:</strong><br/>
      ${Object.entries(caseData.features)
        .map(([key, value]) => `• ${key}: ${value}`)
        .join('<br/>')
      }
    `)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .transition()
      .duration(200)
      .style('opacity', 1)
  }
}

const hideTooltip = () => {
  if (tooltip) {
    tooltip.transition()
      .duration(200)
      .style('opacity', 0)
  }
}

const resetZoom = () => {
  if (svg) {
    svg.transition()
      .duration(750)
      .call(
        d3.zoom<SVGSVGElement, unknown>().transform,
        d3.zoomIdentity
      )
  }
}

// Watchers
watch(() => props.clusteringData, () => {
  isLoading.value = true
  setTimeout(initializeVisualization, 100)
}, { deep: true })

watch(currentView, () => {
  isLoading.value = true
  setTimeout(initializeVisualization, 100)
})

// Lifecycle
onMounted(() => {
  setTimeout(initializeVisualization, 100)
})

onUnmounted(() => {
  if (simulation) {
    simulation.stop()
  }
  if (tooltip) {
    tooltip.remove()
  }
})
</script>

<style scoped>
.cluster-visualization {
  width: 100%;
  min-height: 700px;
}

.visualization-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.view-controls {
  display: flex;
  gap: 10px;
}

.view-button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.view-button.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.view-button:hover:not(.active) {
  background: #f1f1f1;
}

.zoom-controls {
  display: flex;
  gap: 10px;
}

.zoom-button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.zoom-button:hover {
  background: #f1f1f1;
}

.visualization-content {
  position: relative;
  width: 100%;
  min-height: 600px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.d3-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.cluster-legend {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.cluster-legend h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 0 1px #ddd;
}

.legend-label {
  font-size: 0.9em;
  color: #34495e;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Global tooltip styles */
:global(.cluster-tooltip) {
  font-size: 12px;
  max-width: 300px;
  z-index: 1000;
}
</style>