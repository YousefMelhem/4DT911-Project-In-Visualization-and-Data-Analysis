<template>
  <div class="chart-card">
    <div class="chart-header">
      <h3>Age distribution</h3>
      <p class="sub">Fixed bins (0–9, 10–19, …, 90+). Unknown ages excluded from bars.</p>
    </div>
    <div class="chart-body">
      <svg
        ref="svgRef"
        class="svg-chart"
        viewBox="0 0 700 320"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Histogram of case counts by age bin"
      />
      <div class="footnote" v-if="(unknownCount ?? 0) > 0">
        Excluded Unknown ages: {{ (unknownCount ?? 0).toLocaleString() }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { select } from 'd3-selection'
import { scaleBand, scaleLinear } from 'd3-scale'
import { axisBottom, axisLeft } from 'd3-axis'
import { max } from 'd3-array'
import { format } from 'd3-format'

/* =========================
 * Types
 * =======================*/
type Bin = { binStart: number; binEnd: number; count: number }

const props = defineProps<{
  bins: Bin[]        // e.g., [{binStart:0, binEnd:9, count:123}, …, {binStart:90, binEnd:Infinity, count:5}]
  unknownCount?: number
}>()

/* =========================
 * Constants & helpers
 * =======================*/
const W = 700
const H = 320
const MARGIN = { top: 20, right: 16, bottom: 52, left: 56 }
const INNER_W = W - MARGIN.left - MARGIN.right
const INNER_H = H - MARGIN.top - MARGIN.bottom

const fmt = format(',')
const labelFor = (b: Bin) => (Number.isFinite(b.binEnd) ? `${b.binStart}–${b.binEnd}` : `${b.binStart}+`)

const svgRef = ref<SVGSVGElement | null>(null)

/* =========================
 * Render
 * =======================*/
const draw = () => {
  const el = svgRef.value
  if (!el) return

  const svg = select(el)
  svg.selectAll('*').remove()

  const data = (props.bins ?? []).slice()
  const maxY = max(data, d => d.count) ?? 0

  if (data.length === 0 || maxY === 0) {
    svg.append('text')
      .attr('x', W / 2)
      .attr('y', H / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#718096')
      .text('No data')
    return
  }

  const labels = data.map(labelFor)

  const x = scaleBand<string>()
    .domain(labels)
    .range([MARGIN.left, MARGIN.left + INNER_W])
    .padding(0.1)

  const y = scaleLinear()
    .domain([0, maxY])
    .nice()
    .range([MARGIN.top + INNER_H, MARGIN.top])

  // Axes
  svg.append('g')
    .attr('transform', `translate(0,${MARGIN.top + INNER_H})`)
    .call(axisBottom(x))
    .selectAll('text')
      .style('font-size', '16px')
      .attr('transform', 'translate(0,4) rotate(0)')
      .style('text-anchor', 'middle')

  svg.append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .call(axisLeft(y).ticks(5).tickFormat((d: any) => fmt(d)))
    .selectAll('text')
      .style('font-size', '16px')

  // Bars
  const g = svg.append('g')

  g.selectAll('rect')
    .data(data)
    .enter()
    .append('rect')
      .attr('x', (_, i) => x(labels[i] ?? '') ?? 0)
      .attr('y', d => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', d => y(0) - y(d.count))
      .attr('rx', 4)
      .attr('fill', '#667eea')
      .append('title')
        .text((d, i) => `${labels[i]}: ${fmt(d.count)}`)

  // Value labels
  g.selectAll('text.value')
    .data(data)
    .enter()
    .append('text')
      .attr('class', 'value')
      .attr('x', (_, i) => {
        const xi = x(labels[i] ?? '')
        return ((xi !== undefined ? xi : 0) + x.bandwidth() / 2)
      })
      .attr('y', d => y(d.count) - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#2d3748')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .text(d => fmt(d.count))
}

onMounted(draw)
watch(() => props.bins, draw, { deep: true })
watch(() => props.unknownCount, draw)
</script>

<style scoped>
.chart-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 1rem 1rem 1.25rem;
}
.chart-header h3 {
  margin: 0;
  color: #2d3748;
  font-size: 1.1rem;
  font-weight: 700;
}
.sub {
  margin: 0.15rem 0 0.5rem;
  color: #718096;
  font-size: 0.9rem;
}
.chart-body { width: 100%; }
.svg-chart { width: 100%; height: auto; display: block; }
.footnote { margin-top: 0.5rem; font-size: 0.85rem; color: #718096; }
</style>
