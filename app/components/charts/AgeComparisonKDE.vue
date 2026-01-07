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
  values: number[]
  total: number
  unknown: number
}

const props = defineProps<{
  series: AgeSeries[]
}>()

const emit = defineEmits<{
  rangeChange: [{ start: number; end: number } | null]
}>()

const svgRef = ref<SVGSVGElement | null>(null)

const W = 700
const H = 300
const MARGIN = { top: 10, right: 210, bottom: 40, left: 50 }
const INNER_W = W - MARGIN.left - MARGIN.right
const INNER_H = H - MARGIN.top - MARGIN.bottom

const buildLegendLabel = (s: { name: string; total: number; unknown: number }) =>
  `${s.name} (n=${s.total}, unknown age: ${s.unknown})`

const truncateToWidth = (
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  text: string,
  maxWidthPx: number,
  fontSizePx = 10,
  fontWeight = '400'
) => {
  const measurer = svg
    .append('text')
    .attr('x', -9999)
    .attr('y', -9999)
    .style('font-size', `${fontSizePx}px`)
    .style('font-weight', fontWeight)
    .text(text)

  const node = measurer.node()
  if (!node) {
    measurer.remove()
    return text
  }

  if (node.getComputedTextLength() <= maxWidthPx) {
    measurer.remove()
    return text
  }

  const ell = '…'
  let lo = 0
  let hi = text.length

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    const candidate = text.slice(0, mid).trimEnd() + ell
    measurer.text(candidate)

    if (measurer.node()!.getComputedTextLength() <= maxWidthPx) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }

  const out = text.slice(0, Math.max(0, lo - 1)).trimEnd() + ell
  measurer.remove()
  return out
}

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

const clampAge = (v: number, minAge: number, maxAge: number) =>
  Math.max(minAge, Math.min(maxAge, v))

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

  const allAges = inputSeries.flatMap(s => s.values)
  const minAge = Math.max(0, Math.floor(d3.min(allAges) ?? 0))
  const maxAge = Math.ceil(d3.max(allAges) ?? 100)

  const X = d3.range(minAge, maxAge + 0.5, 1)

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

  svg.append('g')
    .attr('transform', `translate(0,${MARGIN.top + INNER_H})`)
    .call(d3.axisBottom(x).ticks(8))
    .selectAll('text')
    .style('font-size', '11px')

  const yAxis = svg.append('g')
    .attr('transform', `translate(${MARGIN.left},0)`)
    .call(d3.axisLeft(y).ticks(4))
  yAxis.selectAll('text').remove()

  svg.append('text')
    .attr('x', MARGIN.left - 20)
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
      const a0 = clampAge(x.invert(x0), minAge, maxAge)
      const a1 = clampAge(x.invert(x1), minAge, maxAge)
      const start = Math.min(a0, a1)
      const end = Math.max(a0, a1)

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

    const fullLabel = buildLegendLabel(s)
    const legendTextMaxWidth = MARGIN.right - 10 - 18

    const shortLabel = truncateToWidth(
      svg,
      fullLabel,
      legendTextMaxWidth,
      10,
      '400'
    )

    const t = legend.append('text')
      .attr('x', 18)
      .attr('y', yOffset)
      .attr('fill', '#4a5568')
      .style('font-size', '10px')
      .text(shortLabel)

    t.append('title').text(fullLabel)
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
