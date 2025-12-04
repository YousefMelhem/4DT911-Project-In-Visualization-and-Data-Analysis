<template>
  <div class="modality-heatmap">
    <div class="chart-header">
      <h3>Sections by group</h3>
      <p class="sub">
        Share of each group&rsquo;s cases that include a given report section
      </p>
    </div>

    <div class="chart-body">
      <svg
        ref="svgRef"
        class="svg-chart"
        :viewBox="`0 0 ${VIEW_W} ${computedHeight}`"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Heatmap of section coverage by group"
      />
      <div
        v-if="matrix.sections.length === 0 || matrix.groups.length === 0"
        class="empty-note"
      >
        No data
      </div>
    </div>

    <div
      v-if="tooltipVisible"
      class="chart-tooltip"
      :style="{ left: `${tooltipX}px`, top: `${tooltipY}px` }"
    >
      <div v-if="tooltipData" class="tooltip-content">
        <div class="tooltip-label">{{ tooltipData.label }}</div>
        <div class="tooltip-count">
          {{ tooltipData.count.toLocaleString() }} cases
        </div>
        <div class="tooltip-extra">
          {{ tooltipData.percent.toFixed(1) }}% of this group
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import * as d3 from 'd3'

/* =========================
 * Types
 * =======================*/
type SectionGroupMatrix = {
  sections: string[]
  groups: {
    id: string
    name: string
    color: string
    total: number
  }[]
  // counts[sectionIdx][groupIdx] = #cases in group with that section
  counts: number[][]
}

type Cell = {
  section: string
  groupId: string
  groupName: string
  groupColor: string
  value: number
  totalInGroup: number
  percent: number
}

const props = defineProps<{
  matrix: SectionGroupMatrix
}>()

/* =========================
 * Constants & sizing
 * =======================*/
const VIEW_W = 450
const MARGIN = { top: 70, right: 8, bottom: 0, left: 0 } as const
const COL_LABEL_OFFSET = 5
const CELL_SIZE = 30

// Height depends on number of GROUPS (rows)
const computedHeight = computed(() => {
  const n = props.matrix.groups?.length ?? 0
  const innerH = n * CELL_SIZE
  return MARGIN.top + innerH + MARGIN.bottom
})

const svgRef = ref<SVGSVGElement | null>(null)

const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
const tooltipData = ref<any>(null)

const showTooltip = (event: MouseEvent, data: any) => {
  tooltipData.value = data
  tooltipVisible.value = true
  updatePosition(event)
}

const hideTooltip = () => {
  tooltipVisible.value = false
}

const updatePosition = (event: MouseEvent) => {
  tooltipX.value = event.clientX + 10
  tooltipY.value = event.clientY - 10
}

/* =========================
 * Render
 * =======================*/
const draw = () => {
  const el = svgRef.value
  if (!el) return

  const sections = props.matrix.sections ?? []
  const groups = props.matrix.groups ?? []
  const counts = props.matrix.counts ?? []

  const nRows = groups.length      // groups (vertical)
  const nCols = sections.length    // sections (horizontal)

  const W = VIEW_W
  const H = computedHeight.value

  const svg = d3.select(el)
  svg.selectAll('*').remove()

  if (nRows === 0 || nCols === 0) {
    svg.append('text')
      .attr('x', W / 2)
      .attr('y', H / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#718096')
      .text('No data')
    return
  }

  // Inner grid width = nCols * CELL_SIZE, centered
  const innerWidth = nCols * CELL_SIZE
  const xStart = (W - innerWidth) / 2
  const xEnd = xStart + innerWidth

  // Columns = sections (horizontal)
  const x = d3.scaleBand<string>()
    .domain(sections)
    .range([xStart, xEnd])
    .padding(0)

  // Rows = groups (vertical)
  const y = d3.scaleBand<string>()
    .domain(groups.map(g => g.id))
    .range([MARGIN.top, MARGIN.top + nRows * CELL_SIZE])
    .padding(0)

  // Flatten to cells, compute percent within each group
  const cells: Cell[] = []
  let maxPercent = 0

  for (let r = 0; r < nRows; r++) {
    const group = groups[r]!
    for (let c = 0; c < nCols; c++) {
      const section = sections[c]!

      // counts[sectionIdx][groupIdx]
      const value = counts[c]?.[r] ?? 0
      const total = group.total || 0
      const percent = total > 0 ? (value / total) * 100 : 0

      cells.push({
        section,
        groupId: group.id,
        groupName: group.name,
        groupColor: group.color,
        value,
        totalInGroup: total,
        percent,
      })

      if (percent > maxPercent) maxPercent = percent
    }
  }

  if (maxPercent === 0) {
    svg.append('text')
      .attr('x', W / 2)
      .attr('y', H / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#718096')
      .text('All groups have 0% for all sections')
    return
  }

  const color = d3.scaleSequential(d3.interpolateBlues)
    .domain([0, Math.max(maxPercent, 1)])

  const fmtPct = d3.format('.1f')

  // Column labels = sections, on top, rotated
  const colLabelGroup = svg.append('g')
    .attr('transform', `translate(0, ${MARGIN.top - COL_LABEL_OFFSET})`)

  colLabelGroup
    .selectAll('text.col-label')
    .data(sections)
    .enter()
    .append('text')
    .attr('class', 'col-label')
    .attr('transform', s =>
      `translate(${x(s)! + x.bandwidth() / 2}, 0) rotate(-45)`
    )
    .attr('text-anchor', 'start')
    .attr('fill', '#4a5568')
    .style('font-size', '12px')
    .style('font-weight', 500)
    .text(s => s)

  // Row labels = groups, left side, colored by group color
  svg.append('g')
    .selectAll('text.row-label')
    .data(groups)
    .enter()
    .append('text')
    .attr('class', 'row-label')
    .attr('x', xStart - 8)
    .attr('y', g => (y(g.id)! + y.bandwidth() / 2))
    .attr('text-anchor', 'end')
    .attr('dominant-baseline', 'middle')
    .attr('fill', g => g.color || '#4a5568')
    .style('font-size', '12px')
    .style('font-weight', 600)
    .text(g => g.name)

  const gGrid = svg.append('g')

  // Cells
  gGrid.selectAll('rect.cell')
    .data(cells)
    .enter()
    .append('rect')
    .attr('class', 'cell')
    .attr('x', d => x(d.section)!)
    .attr('y', d => y(d.groupId)!)
    .attr('width', x.bandwidth())
    .attr('height', y.bandwidth())
    .attr('stroke', '#e2e8f0')
    .attr('stroke-width', 0.5)
    .attr('fill', d => d.percent === 0 ? '#f7fafc' : color(d.percent)!)
    .attr('opacity', 0.85)
    .style('cursor', 'default')
    .on('mouseenter', function (event, d: Cell) {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('stroke', '#667eea')
        .attr('stroke-width', 2)
        .attr('opacity', 1)

      const tooltipContent = {
        label: `${d.section} in ${d.groupName}`,
        count: d.value,
        percent: d.percent,
      }

      nextTick(() => {
        showTooltip(event as MouseEvent, tooltipContent)
      })
    })
    .on('mousemove', (event) => {
      updatePosition(event as MouseEvent)
    })
    .on('mouseleave', function () {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 0.5)
        .attr('opacity', 0.85)

      hideTooltip()
    })

  // Percent text inside cells
  gGrid.selectAll('text.value')
    .data(cells)
    .enter()
    .append('text')
    .attr('class', 'value')
    .attr('x', d => x(d.section)! + x.bandwidth() / 2)
    .attr('y', d => y(d.groupId)! + y.bandwidth() / 2)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .attr('fill', '#1a202c')
    .attr('opacity', 0)
    .style('font-size', '9px')
    .style('font-weight', '500')
    .style('pointer-events', 'none')
    .text(d => (d.percent > 0 ? `${fmtPct(d.percent)}%` : ''))
    .transition()
    .duration(350)
    .delay(100)
    .attr('opacity', 1)
}

onMounted(draw)
watch(() => props.matrix, draw, { deep: true })
watch(computedHeight, draw)
</script>

<style scoped>
.modality-heatmap {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem 1rem 1.25rem;
  position: relative;
}

.chart-header h3 {
  margin: 1rem 0.75rem 0.5rem;
  color: #2d3748;
  font-size: 1.1rem;
  font-weight: 700;
}

.sub {
  margin: 0.15rem 0 0.5rem;
  color: #718096;
  font-size: 0.9rem;
}

.chart-body {
  width: 100%;
  flex: 1 1 auto;
  position: relative;
}

.svg-chart {
  width: 100%;
  height: auto;
  display: block;
}

.empty-note {
  margin-top: 0.5rem;
  color: #718096;
  font-size: 0.9rem;
}

.chart-tooltip {
  position: fixed;
  pointer-events: none;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  max-width: 250px;
  word-wrap: break-word;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tooltip-label {
  font-weight: bold;
  font-size: 13px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 4px;
  margin-bottom: 2px;
}

.tooltip-count {
  font-size: 12px;
}

.tooltip-extra {
  font-style: italic;
  font-size: 11px;
  opacity: 0.9;
}
</style>
