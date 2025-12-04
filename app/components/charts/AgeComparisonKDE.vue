<template>
  <div class="age-kde-chart">
    <div class="chart-header">
      <h3>Age distribution by group</h3>
      <p class="sub">
        Smooth age density curves for each group (KDE)
      </p>
    </div>
    <div class="chart-body">
      <svg
        ref="svgRef"
        class="svg-chart"
        viewBox="0 0 700 280"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Age density comparison by cohort"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import * as d3 from 'd3'

type AgeSeries = {
  id: string
  name: string
  color: string
  values: number[]    // numeric ages
  total: number       // all cases in cohort
  unknown: number     // cases without numeric age
}

const props = defineProps<{
  series: AgeSeries[]
}>()

const svgRef = ref<SVGSVGElement | null>(null)

const W = 700
const H = 300
const MARGIN = { top: 10, right: 210, bottom: 40, left: 50 }
const INNER_W = W - MARGIN.left - MARGIN.right
const INNER_H = H - MARGIN.top - MARGIN.bottom

// KDE helpers
const kernelEpanechnikov = (k: number) => (v: number) => {
  v = v / k
  return Math.abs(v) <= 1 ? 0.75 * (1 - v * v) / k : 0
}

const kernelDensityEstimator = (kernel: (v: number) => number, X: number[]) => {
  return (V: number[]) =>
    X.map(x => {
      const m = d3.mean(V, v => kernel(x - v))
      return [x, m ?? 0] as [number, number]
    })
}

const draw = () => {
  const el = svgRef.value
  if (!el) return

  const svg = d3.select(el)
  svg.selectAll('*').remove()

  const inputSeries = (props.series ?? []).filter(s => s.values.length >= 2)

  if (!inputSeries.length) {
    svg.append('text')
      .attr('x', W / 2)
      .attr('y', H / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#718096')
      .style('font-size', '14px')
      .text('Not enough age data to compare cohorts')
    return
  }

  // Get global age range
  const allAges = inputSeries.flatMap(s => s.values)
  const minAge = Math.max(0, Math.floor(d3.min(allAges) ?? 0))
  const maxAge = Math.ceil(d3.max(allAges) ?? 100)

  // Grid of x-values to evaluate KDE on
  const X = d3.range(minAge, maxAge + 0.5, 1) // step 1 year

  // Bandwidth: simple rule-of-thumb, but capped
  const bandwidth = Math.min(15, Math.max(3, (maxAge - minAge) / 15))
  const kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), X)

  const densities = inputSeries.map(s => ({
    ...s,
    density: kde(s.values)
  }))

  const maxY = d3.max(
    densities.flatMap(d => d.density.map((p: [number, number]) => p[1]))
  ) ?? 0

  if (maxY === 0) {
    svg.append('text')
      .attr('x', W / 2)
      .attr('y', H / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#718096')
      .style('font-size', '14px')
      .text('Age variation is too low to plot densities')
    return
  }

  const x = d3.scaleLinear()
    .domain([minAge, maxAge])
    .nice()
    .range([MARGIN.left, MARGIN.left + INNER_W])

  const y = d3.scaleLinear()
    .domain([0, maxY]).nice()
    .range([MARGIN.top + INNER_H, MARGIN.top])

  const g = svg.append('g')

  // Axes
  svg.append('g')
    .attr('transform', `translate(0,${MARGIN.top + INNER_H})`)
    .call(d3.axisBottom(x).ticks(8))
    .selectAll('text')
    .style('font-size', '11px')

  // Y axis (keep line & ticks, but hide numbers)
  const yAxis = svg.append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .call(d3.axisLeft(y).ticks(4))
  yAxis.selectAll('text').remove()

  // Y axis label
  svg.append('text')
    .attr('x', MARGIN.left - 20)  // a bit further left
    .attr('y', MARGIN.top + INNER_H / 2)
    .attr('text-anchor', 'middle')
    .attr(
      'transform',
      `rotate(-90, ${MARGIN.left - 20}, ${MARGIN.top + INNER_H / 2})`
    )
    .attr('fill', '#4a5568')
    .style('font-size', '11px')
    .text('Relative density')

  svg.append('text')
    .attr('x', MARGIN.left + INNER_W / 2)
    .attr('y', H - 5)
    .attr('text-anchor', 'middle')
    .attr('fill', '#4a5568')
    .style('font-size', '11px')
    .text('Age (years)')

  // Lines
  const line = d3.line<[number, number]>()
    .x(d => x(d[0]))
    .y(d => y(d[1]))
    .curve(d3.curveMonotoneX)

  densities.forEach(series => {
    g.append('path')
      .datum(series.density)
      .attr('fill', 'none')
      .attr('stroke', series.color)
      .attr('stroke-width', 2)
      .attr('d', line as any)
      .attr('opacity', 0.95)
  })

  // Legend box
  const legendX = MARGIN.left + INNER_W + 10
  const legendY = MARGIN.top + 5

  const legend = svg.append('g')
    .attr('transform', `translate(${legendX}, ${legendY})`)

  legend.append('text')
    .attr('x', 0)
    .attr('y', 0)
    .attr('fill', '#2d3748')
    .style('font-size', '11px')
    .style('font-weight', '600')
    .text('Groups')

  const legendRowHeight = 18

  densities.forEach((s, i) => {
    const yOffset = 12 + i * legendRowHeight

    legend.append('rect')
      .attr('x', 0)
      .attr('y', yOffset - 8)
      .attr('width', 12)
      .attr('height', 4)
      .attr('rx', 2)
      .attr('fill', s.color)

    const label = `${s.name} (n=${s.total}, unknown age: ${s.unknown})`

    legend.append('text')
      .attr('x', 18)
      .attr('y', yOffset)
      .attr('fill', '#4a5568')
      .style('font-size', '10px')
      .text(label)
  })
}

onMounted(draw)
watch(() => props.series, draw, { deep: true })
</script>

<style scoped>
.age-kde-chart {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.5rem 0.75rem 0.5rem;
  position: relative;
}

.chart-header h3 {
  margin: 0.5rem 0.5rem 0.25rem;
  color: #2d3748;
  font-size: 1.1rem;
  font-weight: 700;
}

.sub {
  margin: 0 0 0.5rem;
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
</style>
