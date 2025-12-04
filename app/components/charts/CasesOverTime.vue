<template>
  <div class="chart-card">
    <div class="chart-header">
      <h3>Cases over time</h3>
      <p class="sub">Monthly counts by added date (missing dates excluded)</p>
    </div>

    <div class="chart-body">
      <svg
        ref="svgRef"
        class="svg-chart"
        :viewBox="`0 0 ${computedWidth} ${H}`"
        preserveAspectRatio="none"
        role="img"
        aria-label="Line chart of cases per month"
      />
      <div v-if="(series?.length ?? 0) === 0" class="empty-note">No data</div>
    </div>

    <div
      v-if="tooltipVisible"
      class="chart-tooltip"
      :style="{ left: `${tooltipX}px`, top: `${tooltipY}px` }"
    >
      <div v-if="tooltipData" class="tooltip-content">
        <div class="tooltip-label">{{ tooltipData.label }}</div>
        <div class="tooltip-count">
          Count: {{ tooltipData.count.toLocaleString() }}
        </div>
        <div v-if="tooltipData.extra" class="tooltip-extra">
          {{ tooltipData.extra }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import * as d3 from 'd3'

/* =========================
 * Types
 * =======================*/
type Point = { date: Date; count: number }

const props = defineProps<{
  series: Point[]
}>()

const emit = defineEmits<{
  rangeChange: [{ start: Date; end: Date } | null]
}>()

/* =========================
 * Constants & helpers
 * =======================*/
const H = 260
const MARGIN = { top: 18, right: 20, bottom: 40, left: 56 }
const INNER_H = H - MARGIN.top - MARGIN.bottom

const fmtMonth = d3.timeFormat('%b %Y')

const svgRef = ref<SVGSVGElement | null>(null)

// width is now based on the actual rendered width of the container,
// not on the number of data points
const chartWidth = ref(800)
const computedWidth = computed(() => chartWidth.value)

const measureWidth = () => {
  if (!svgRef.value) return
  const parent = svgRef.value.parentElement
  if (!parent) return
  const rect = parent.getBoundingClientRect()
  if (rect.width > 0) {
    chartWidth.value = rect.width
  }
}

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

  const W = computedWidth.value
  const INNER_W = W - MARGIN.left - MARGIN.right

  const svg = d3.select(el)
  svg.selectAll('*').remove()

  // Copy & sort data (non-mutating)
  const data = (props.series ?? []).slice().sort((a, b) => +a.date - +b.date)
  if (data.length === 0) return

  const totalCount = data.reduce((sum, d) => sum + d.count, 0)

  // Scales
  const xDomain = d3.extent(data, (d: Point) => d.date) as [Date, Date]
  const x = d3
    .scaleTime()
    .domain(xDomain)
    .range([MARGIN.left, MARGIN.left + INNER_W])

  const yMax = d3.max(data, (d: Point) => d.count) ?? 0
  const y = d3
    .scaleLinear()
    .domain([0, yMax])
    .nice()
    .range([MARGIN.top + INNER_H, MARGIN.top])

  // Axes (slightly smaller fonts)
  const approxTickCount = Math.ceil(data.length / 6) || 1
  svg
    .append('g')
    .attr('transform', `translate(0,${MARGIN.top + INNER_H})`)
    .call(
      d3
        .axisBottom(x)
        .ticks(d3.timeMonth.every(approxTickCount))
        .tickFormat((d) => fmtMonth(d as Date))
    )
    .selectAll('text')
    .style('font-size', '9px')
    .attr('transform', 'translate(0,4)')

  svg
    .append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .call(d3.axisLeft(y).ticks(5))
    .selectAll('text')
    .style('font-size', '9px')

  // Area
  const areaGen = d3
    .area<Point>()
    .x((d: Point) => x(d.date))
    .y0(y(0))
    .y1((d: Point) => y(d.count))
    .curve(d3.curveMonotoneX)

  svg
    .append('path')
    .datum(data)
    .attr('fill', '#e6e9fb')
    .attr('d', areaGen)

  // Line
  const lineGen = d3
    .line<Point>()
    .x((d: Point) => x(d.date))
    .y((d: Point) => y(d.count))
    .curve(d3.curveMonotoneX)

  svg
    .append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#667eea')
    .attr('stroke-width', 2)
    .attr('d', lineGen)

  // Points (smaller)
  svg
    .append('g')
    .selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', (d: Point) => x(d.date))
    .attr('cy', (d: Point) => y(d.count))
    .attr('r', 2)
    .attr('fill', '#667eea')
    .attr('opacity', 0.85)
    .style('cursor', 'pointer')
    .on('mouseenter', function (event, d: Point) {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('r', 4)
        .attr('opacity', 1)

      const pct =
        totalCount > 0 ? ((d.count / totalCount) * 100).toFixed(1) : '0.0'

      const tooltipContent = {
        label: fmtMonth(d.date),
        count: d.count,
        total: totalCount,
        extra: `${pct}% of all cases`,
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
        .attr('opacity', 0.85)

      hideTooltip()
    })

  // Brush band
  const brushBandHeight = 24
  const bandBottom = MARGIN.top + INNER_H
  const bandTop = bandBottom - brushBandHeight

  const brush = d3
    .brushX()
    .extent([[MARGIN.left, bandTop], [MARGIN.left + INNER_W, bandBottom]])
    .on('brush', (event) => {
      const sel = event.selection as [number, number] | null
      if (!sel) return
      const [x0, x1] = sel

      svg
        .select<SVGGElement>('.brush')
        .select<SVGRectElement>('.selection')
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

      svg
        .select<SVGGElement>('.brush')
        .select<SVGRectElement>('.selection')
        .attr('y', MARGIN.top)
        .attr('height', INNER_H)
    })

  const brushG = svg.append('g').attr('class', 'brush').call(brush)

  brushG
    .selectAll('.selection')
    .attr('fill', '#667eea')
    .attr('fill-opacity', 0.2)
    .attr('stroke', '#667eea')
    .attr('stroke-width', 1.5)

  brushG.selectAll('.overlay').style('cursor', 'crosshair')
}

onMounted(() => {
  nextTick(() => {
    measureWidth()
    draw()
  })
  window.addEventListener('resize', measureWidth)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', measureWidth)
})

watch(
  () => props.series,
  () => {
    nextTick(() => {
      measureWidth()
      draw()
    })
  },
  { deep: true }
)

watch(computedWidth, draw)
</script>

<style scoped>
.chart-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 0.8rem 0.9rem 1rem;
  position: relative;
}

.chart-header {
  margin-bottom: 0.4rem;
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

.chart-body {
  width: 100%;
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
