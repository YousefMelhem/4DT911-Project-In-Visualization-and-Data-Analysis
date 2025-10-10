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
        viewBox="0 0 760 320"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Line chart of cases per month"
      />
      <div v-if="(series?.length ?? 0) === 0" class="empty-note">No data</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { select } from 'd3-selection'
import { scaleTime, scaleLinear } from 'd3-scale'
import { max, extent } from 'd3-array'
import { axisBottom, axisLeft } from 'd3-axis'
import { line, area, curveMonotoneX } from 'd3-shape'
import { timeMonth } from 'd3-time'
import { timeFormat } from 'd3-time-format'

/* =========================
 * Types
 * =======================*/
type Point = { date: Date; count: number }

const props = defineProps<{
  series: Point[]
}>()

/* =========================
 * Constants & helpers
 * =======================*/
const W = 760
const H = 320
const MARGIN = { top: 20, right: 20, bottom: 46, left: 56 }
const INNER_W = W - MARGIN.left - MARGIN.right
const INNER_H = H - MARGIN.top - MARGIN.bottom

const fmtMonth = timeFormat('%b %Y')

const svgRef = ref<SVGSVGElement | null>(null)

/* =========================
 * Render
 * =======================*/
const draw = () => {
  const el = svgRef.value
  if (!el) return

  const svg = select(el)
  svg.selectAll('*').remove()

  // Copy & sort data (non-mutating)
  const data = (props.series ?? []).slice().sort((a, b) => +a.date - +b.date)
  if (data.length === 0) return

  // Scales
  const xDomain = extent(data, d => d.date) as [Date, Date]
  const x = scaleTime().domain(xDomain).range([MARGIN.left, MARGIN.left + INNER_W])

  const yMax = max(data, d => d.count) ?? 0
  const y = scaleLinear().domain([0, yMax]).nice().range([MARGIN.top + INNER_H, MARGIN.top])

  // Axes
  // Aim for ~6 x-axis ticks across the whole range
  const approxTickCount = Math.ceil(data.length / 6) || 1
  svg.append('g')
    .attr('transform', `translate(0,${MARGIN.top + INNER_H})`)
    .call(axisBottom(x).ticks(timeMonth.every(approxTickCount)).tickFormat((d: any) => fmtMonth(d)))
    .selectAll('text')
      .style('font-size', '10px')
      .attr('transform', 'translate(0,4)')

  svg.append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .call(axisLeft(y).ticks(5))
    .selectAll('text')
      .style('font-size', '10px')

  // Area (under line)
  const areaGen = area<Point>()
    .x(d => x(d.date))
    .y0(y(0))
    .y1(d => y(d.count))
    .curve(curveMonotoneX)

  svg.append('path')
    .datum(data)
    .attr('fill', '#e6e9fb')
    .attr('d', areaGen as any)

  // Line
  const lineGen = line<Point>()
    .x(d => x(d.date))
    .y(d => y(d.count))
    .curve(curveMonotoneX)

  svg.append('path')
    .datum(data)
    .attr('fill', 'none')
    .attr('stroke', '#667eea')
    .attr('stroke-width', 2)
    .attr('d', lineGen as any)

  // Points + simple tooltips
  svg.append('g')
    .selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
      .attr('cx', d => x(d.date))
      .attr('cy', d => y(d.count))
      .attr('r', 3)
      .attr('fill', '#667eea')
      .append('title')
        .text(d => `${fmtMonth(d.date)}: ${d.count.toLocaleString()}`)
}

onMounted(draw)
watch(() => props.series, draw, { deep: true })
</script>

<style scoped>
.chart-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 1rem 1rem 1.25rem;
}
.chart-header h3 { margin: 0; color: #2d3748; font-size: 1.1rem; font-weight: 700; }
.sub { margin: 0.15rem 0 0.5rem; color: #718096; font-size: 0.9rem; }
.chart-body { width: 100%; }
.svg-chart { width: 100%; height: auto; display: block; }
.empty-note { margin-top: 0.5rem; color: #718096; font-size: 0.9rem; }
</style>
