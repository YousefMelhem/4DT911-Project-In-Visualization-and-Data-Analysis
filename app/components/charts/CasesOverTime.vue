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
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
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
const H = 320
const MARGIN = { top: 20, right: 20, bottom: 46, left: 56 }
const INNER_H = H - MARGIN.top - MARGIN.bottom

const fmtMonth = d3.timeFormat('%b %Y')

const svgRef = ref<SVGSVGElement | null>(null)
const computedWidth = computed(() => {
  const n = props.series?.length ?? 0

  const min = 450      
  const perPoint = 8   

  return Math.max(min, n * perPoint)
})

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

  // Scales
  const xDomain = d3.extent(data, (d: Point) => d.date) as [Date, Date]
  const x = d3.scaleTime().domain(xDomain).range([MARGIN.left, MARGIN.left + INNER_W])

  const yMax = d3.max(data, (d: Point) => d.count) ?? 0
  const y = d3.scaleLinear().domain([0, yMax]).nice().range([MARGIN.top + INNER_H, MARGIN.top])

  // Axes
  // Aim for ~6 x-axis ticks across the whole range
  const approxTickCount = Math.ceil(data.length / 6) || 1
  svg.append('g')
    .attr('transform', `translate(0,${MARGIN.top + INNER_H})`)
    .call(d3.axisBottom(x).ticks(d3.timeMonth.every(approxTickCount)).tickFormat((d) => fmtMonth(d as Date)))
    .selectAll('text')
    .style('font-size', '10px')
    .attr('transform', 'translate(0,4)')

  svg.append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .call(d3.axisLeft(y).ticks(5))
    .selectAll('text')
    .style('font-size', '10px')

  // Area (under line)
  const areaGen = d3.area<Point>()
    .x((d: Point) => x(d.date))
    .y0(y(0))
    .y1((d: Point) => y(d.count))
    .curve(d3.curveMonotoneX)

  svg.append('path')
    .datum(data)
    .attr('fill', '#e6e9fb')
    .attr('d', areaGen)

  // Line
  const lineGen = d3.line<Point>()
    .x((d: Point) => x(d.date))
    .y((d: Point) => y(d.count))
    .curve(d3.curveMonotoneX)

  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#667eea')
    .attr('stroke-width', 2)
    .attr('d', lineGen)

  // Points + simple tooltips
  const circles = svg.append('g')
    .selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', (d: Point) => x(d.date))
    .attr('cy', (d: Point) => y(d.count))
    .attr('r', 3)
    .attr('fill', '#667eea')
    .attr('opacity', 0.85)
    .style('cursor', 'pointer')
    .on('mouseenter', function() {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('r', 6)
        .attr('opacity', 1)
    })
    .on('mouseleave', function() {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('r', 3)
        .attr('opacity', 0.85)
    })

  circles.append('title')
    .text((d: Point) => `${fmtMonth(d.date)}: ${d.count.toLocaleString()} cases`)

  // Add brush
  const brush = d3.brushX()
    .extent([[MARGIN.left, MARGIN.top], [MARGIN.left + INNER_W, MARGIN.top + INNER_H]])
    .on('end', (event) => {
      const selection = event.selection as [number, number] | null
      if (!selection) {
        emit('rangeChange', null)
        return
      }
      const [x0, x1] = selection
      const start = x.invert(x0)
      const end = x.invert(x1)
      emit('rangeChange', { start, end })
    })

  svg.append('g')
    .attr('class', 'brush')
    .call(brush)
    .selectAll('.overlay')
    .style('cursor', 'crosshair')

  // Style brush
  svg.selectAll('.brush .selection')
    .attr('fill', '#667eea')
    .attr('fill-opacity', 0.2)
    .attr('stroke', '#667eea')
    .attr('stroke-width', 1.5)
}

onMounted(draw)
watch(() => props.series, draw, { deep: true })
watch(computedWidth, draw)
</script>

<style scoped>
.chart-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 1rem 1rem 1.25rem;
}
.chart-header h3 { margin: 1rem 0.75rem 0.5rem; color: #2d3748; font-size: 1.1rem; font-weight: 700; }
.sub { margin: 2rem 0 0.5rem; color: #718096; font-size: 0.9rem; }
.chart-body { width: 100%; }
.svg-chart { width: 100%; height: auto; display: block; }
.empty-note { margin-top: 0.5rem; color: #718096; font-size: 0.9rem; }
</style>
