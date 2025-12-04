<template>
  <div class="chart-card">
    <div class="chart-header">
      <div>
        <h3>Cases over time by group</h3>
        <p class="sub">Monthly case counts for each group (absolute)</p>
      </div>

      <div class="legend" v-if="groups && groups.length">
        <div
          v-for="g in groups"
          :key="g.id"
          class="legend-item"
        >
          <span
            class="legend-swatch"
            :style="{ backgroundColor: g.color }"
          />
          <span class="legend-label">
            {{ g.name }}
            <span class="legend-meta">
              ({{ g.size.toLocaleString() }} cases)
            </span>
          </span>
        </div>
      </div>
    </div>

    <div class="chart-body">
      <svg
        ref="svgRef"
        class="svg-chart"
        :viewBox="`0 0 ${VIEWBOX_WIDTH} ${H}`"
        preserveAspectRatio="none"
        role="img"
        aria-label="Line chart of monthly case counts by group"
      />
      <div v-if="isEmpty" class="empty-note">No data</div>
    </div>

    <div
      v-if="tooltipVisible"
      class="chart-tooltip"
      :style="{ left: `${tooltipX}px`, top: `${tooltipY}px` }"
    >
      <div v-if="tooltipData" class="tooltip-content">
        <div class="tooltip-label">{{ tooltipData.label }}</div>
        <div class="tooltip-count">
          {{ tooltipData.groupName }}: {{ tooltipData.count.toLocaleString() }} cases
        </div>
        <div v-if="tooltipData.extra" class="tooltip-extra">{{ tooltipData.extra }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import * as d3 from 'd3'

type Point = { date: Date; count: number }

type GroupSeries = {
  id: string
  name: string
  color: string
  size: number
  series: Point[]
}

const props = defineProps<{
  groups: GroupSeries[]
}>()

const emit = defineEmits<{
  rangeChange: [{ start: Date; end: Date } | null]
}>()

const H = 200
const VIEWBOX_WIDTH = 1000
const MARGIN = { top: 20, right: 20, bottom: 46, left: 56 }
const INNER_H = H - MARGIN.top - MARGIN.bottom
const fmtMonth = d3.timeFormat('%b %Y')

const svgRef = ref<SVGSVGElement | null>(null)

const allMonthsCount = computed(() => {
  const set = new Set<number>()
  for (const g of props.groups ?? []) {
    for (const p of g.series ?? []) {
      set.add(p.date.getTime())
    }
  }
  return set.size
})

const isEmpty = computed(() => {
  if (!props.groups || props.groups.length === 0) return true
  return props.groups.every(g => !g.series || g.series.length === 0)
})

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

const draw = () => {
  const el = svgRef.value
  if (!el) return

  const W = VIEWBOX_WIDTH
  const INNER_W = W - MARGIN.left - MARGIN.right

  const svg = d3.select(el)
  svg.selectAll('*').remove()

  if (!props.groups || props.groups.length === 0 || isEmpty.value) return

  // Flatten data to compute global domains
  const allPoints: Point[] = []
  for (const g of props.groups) {
    for (const p of g.series ?? []) {
      allPoints.push(p)
    }
  }
  if (!allPoints.length) return

  const xDomain = d3.extent(allPoints, (d: Point) => d.date) as [Date, Date]
  const rawMax = d3.max(allPoints, (d: Point) => d.count) ?? 0
  const yMax = rawMax || 0

  const x = d3.scaleTime()
    .domain(xDomain)
    .range([MARGIN.left, MARGIN.left + INNER_W])

  const y = d3.scaleLinear()
    .domain([0, yMax])
    .nice()
    .range([MARGIN.top + INNER_H, MARGIN.top])

  // Axes
  const approxTickCount = Math.max(1, Math.ceil(allMonthsCount.value / 6))
  svg.append('g')
    .attr('transform', `translate(0,${MARGIN.top + INNER_H})`)
    .call(
      d3.axisBottom(x)
        .ticks(d3.timeMonth.every(approxTickCount))
        .tickFormat((d) => fmtMonth(d as Date))
    )
    .selectAll('text')
    .style('font-size', '8px')
    .attr('transform', 'translate(0,4)')

  svg.append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .call(d3.axisLeft(y).ticks(5))
    .selectAll('text')
    .style('font-size', '10px')

  const lineGen = d3.line<Point>()
    .x((d: Point) => x(d.date))
    .y((d: Point) => y(d.count))
    .curve(d3.curveMonotoneX)

  // One line per group
  for (const g of props.groups) {
    const data = (g.series ?? []).slice().sort((a, b) => +a.date - +b.date)
    if (!data.length) continue

    const totalForGroup = data.reduce((sum, d) => sum + d.count, 0)

    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', g.color || '#667eea')
      .attr('stroke-width', 2)
      .attr('opacity', 0.95)
      .attr('d', lineGen)

    svg.append('g')
      .selectAll(`circle.group-${g.id}`)
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', (d: Point) => x(d.date))
      .attr('cy', (d: Point) => y(d.count))
      .attr('r', 2)
      .attr('fill', g.color || '#667eea')
      .attr('opacity', 0.9)
      .style('cursor', 'pointer')
      .on('mouseenter', function (event, d: Point) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('r', 4)
          .attr('opacity', 1)

        const pct = totalForGroup > 0
          ? ((d.count / totalForGroup) * 100).toFixed(1)
          : '0.0'

        const tooltipContent = {
          label: fmtMonth(d.date),
          count: d.count,
          groupName: g.name,
          extra: `${pct}% of this group's cases`,
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
          .attr('r', 2)
          .attr('opacity', 0.9)
        hideTooltip()
      })
  }

  // Brush band (same semantics as single-series chart)
  const brushBandHeight = 24
  const bandBottom = MARGIN.top + INNER_H
  const bandTop = bandBottom - brushBandHeight

  const brush = d3.brushX()
    .extent([[MARGIN.left, bandTop], [MARGIN.left + INNER_W, bandBottom]])
    .on('brush', (event) => {
      const sel = event.selection as [number, number] | null
      if (!sel) return
      const [x0, x1] = sel

      svg.select<SVGGElement>('.brush').select<SVGRectElement>('.selection')
        .attr('x', x0)
        .attr('width', x1 - x0)
        .attr('y', MARGIN.top)
        .attr('height', INNER_H)
    })
    .on('end', (event) => {
      const sel = event.selection as [number, number] | null
      if (!sel) {
        emit('rangeChange', null)
        return
      }
      const [x0, x1] = sel
      const start = x.invert(x0)
      const end = x.invert(x1)
      emit('rangeChange', { start, end })

      svg.select<SVGGElement>('.brush').select<SVGRectElement>('.selection')
        .attr('y', MARGIN.top)
        .attr('height', INNER_H)
    })

  const brushG = svg.append('g')
    .attr('class', 'brush')
    .call(brush)

  brushG.selectAll('.selection')
    .attr('fill', '#667eea')
    .attr('fill-opacity', 0.16)
    .attr('stroke', '#667eea')
    .attr('stroke-width', 1.5)

  brushG.selectAll('.overlay')
    .style('cursor', 'crosshair')
}

onMounted(draw)
watch(() => props.groups, draw, { deep: true })
</script>

<style scoped>
.chart-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 1rem 1rem 1.25rem;
  position: relative;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.chart-header h3 {
  margin: 0.25rem 0 0.25rem;
  color: #2d3748;
  font-size: 1.1rem;
  font-weight: 700;
}

.sub {
  margin: 0;
  color: #718096;
  font-size: 0.9rem;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
  justify-content: flex-end;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  white-space: nowrap;
}

.legend-swatch {
  width: 9px;
  height: 9px;
  border-radius: 999px;
}

.legend-label {
  color: #2d3748;
}

.legend-meta {
  color: #718096;
  font-size: 0.78rem;
}

.chart-body {
  width: 100%;
  position: relative;
  margin-top: 0.6rem;
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
  background-color: rgba(0,0,0,0.85);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  max-width: 260px;
  word-wrap: break-word;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  border: 1px solid rgba(255,255,255,0.1);
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tooltip-label {
  font-weight: bold;
  font-size: 13px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
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
