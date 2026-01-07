<template>
  <div class="modality-region-heatmap">
    <div class="chart-header">
      <h3>Region by modality</h3>
      <p class="sub">
        Share of each modality&rsquo;s cases that include a given region
      </p>
    </div>

    <div class="chart-body">
      <svg
        ref="svgRef"
        class="svg-chart"
        :viewBox="`0 0 ${VIEW_W} ${computedHeight}`"
        preserveAspectRatio="xMidYMid meet"
        role="img"
      />
      <div
        v-if="matrix.rowLabels.length === 0 || matrix.colLabels.length === 0"
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
          {{ tooltipData.percent.toFixed(1) }}% of this modality
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue"
import * as d3 from "d3"

type ModalityRegionMatrix = {
  rowLabels: string[]   // regions
  colLabels: string[]   // modalities
  grid: number[][]      // grid[regionIdx][modalityIdx]
}

const props = defineProps<{
  matrix: ModalityRegionMatrix
  selectedValue?: { modality: string; region: string } | null
}>()

const emit = defineEmits<{
  (e: "item-select", payload: { type: "modality-region"; modality: string; region: string } | null): void
}>()

/* =========================
 * Sizing (match RegionByGroupHeatmap)
 * =======================*/
const VIEW_W = 450
const CELL_SIZE = 15
const MARGIN = { top: 40, right: 6, bottom: 0, left: 0 }
const COL_LABEL_OFFSET = 3

const computedHeight = computed(() => {
  const nRows = props.matrix.colLabels?.length ?? 0  // modalities
  return MARGIN.top + nRows * CELL_SIZE + MARGIN.bottom
})

/* =========================
 * SVG + tooltip
 * =======================*/
const svgRef = ref<SVGSVGElement | null>(null)

const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
const tooltipData = ref<any>(null)

const showTooltip = (event: MouseEvent, data: any) => {
  tooltipData.value = data
  tooltipVisible.value = true
  tooltipX.value = event.clientX + 10
  tooltipY.value = event.clientY - 10
}

const hideTooltip = () => {
  tooltipVisible.value = false
}

const textColorForFill = (fill: string) => {
  const c = d3.color(fill)
  if (!c) return '#1a202c'
  const rgb = c.rgb()
  const lum = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255
  return lum < 0.55 ? '#ffffff' : '#1a202c'
}

/* =========================
 * Render
 * =======================*/
type Cell = {
  region: string
  modality: string
  value: number
  totalForModality: number
  percent: number
}

const draw = () => {
  const el = svgRef.value
  if (!el) return

  const regions = props.matrix.rowLabels ?? []
  const modalities = props.matrix.colLabels ?? []
  const grid = props.matrix.grid ?? []

  const nCols = regions.length
  const nRows = modalities.length

  const W = VIEW_W
  const H = computedHeight.value

  const svg = d3.select(el)
  svg.selectAll("*").remove()

  if (!nRows || !nCols) {
    svg
      .append("text")
      .attr("x", W / 2)
      .attr("y", H / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "#718096")
      .text("No data")
    return
  }

  const totalsByModality = new Array(nRows).fill(0)
  for (let m = 0; m < nRows; m++) {
    let sum = 0
    for (let r = 0; r < nCols; r++) {
      sum += grid[r]?.[m] ?? 0
    }
    totalsByModality[m] = sum
  }

  const innerWidth = nCols * CELL_SIZE
  const xStart = (W - innerWidth) / 2

  const x = d3.scaleBand<string>()
    .domain(regions)
    .range([xStart, xStart + innerWidth])
    .padding(0)

  const y = d3.scaleBand<string>()
    .domain(modalities)
    .range([MARGIN.top, MARGIN.top + nRows * CELL_SIZE])
    .padding(0)

  const cells: Cell[] = []
  let maxPct = 0

  for (let m = 0; m < nRows; m++) {
    const modality = modalities[m]!
    const totalForModality = totalsByModality[m] || 0
    for (let r = 0; r < nCols; r++) {
      const region = regions[r]!
      const value = grid[r]?.[m] ?? 0
      const pct = totalForModality > 0 ? (value / totalForModality) * 100 : 0

      cells.push({
        region,
        modality,
        value,
        totalForModality,
        percent: pct
      })

      if (pct > maxPct) maxPct = pct
    }
  }

  const color = d3.scaleSequential(d3.interpolateBlues)
    .domain([0, Math.max(maxPct, 1)])

  const fmtPct = d3.format(".1f")

  svg.append("g")
    .attr("transform", `translate(0, ${MARGIN.top - COL_LABEL_OFFSET})`)
    .selectAll("text")
    .data(regions)
    .enter()
    .append("text")
    .attr("transform", r => `translate(${x(r)! + x.bandwidth()/2},0) rotate(-30)`)
    .attr("text-anchor", "start")
    .attr("fill", r =>
      props.selectedValue && props.selectedValue.region === r ? "#2b6cb0" : "#4a5568"
    )
    .style("font-size", "3px")
    .style("font-weight", r =>
      props.selectedValue && props.selectedValue.region === r ? 700 : 500
    )
    .text(r => r)

  svg.append("g")
    .selectAll("text")
    .data(modalities)
    .enter()
    .append("text")
    .attr("x", xStart - 6)
    .attr("y", m => y(m)! + y.bandwidth()/2)
    .attr("text-anchor", "end")
    .attr("dominant-baseline", "middle")
    .attr("fill", m =>
      props.selectedValue && props.selectedValue.modality === m ? "#2b6cb0" : "#4a5568"
    )
    .style("font-size", "5px")
    .style("font-weight", m =>
      props.selectedValue && props.selectedValue.modality === m ? "700" : "600"
    )
    .text(m => m)

  const gGrid = svg.append("g")

  gGrid.selectAll("rect")
    .data(cells)
    .enter()
    .append("rect")
    .attr("class", "cell")
    .attr("x", d => x(d.region)!)
    .attr("y", d => y(d.modality)!)
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("stroke", d => {
      const sel = props.selectedValue
      if (!sel) return "#e2e8f0"
      const isSel = sel.region === d.region && sel.modality === d.modality
      return isSel ? "#2b6cb0" : "#e2e8f0"
    })
    .attr("stroke-width", d => {
      const sel = props.selectedValue
      if (!sel) return 0.5
      const isSel = sel.region === d.region && sel.modality === d.modality
      return isSel ? 2 : 0.5
    })
    .attr("fill", d => d.percent === 0 ? "#f7fafc" : color(d.percent)!)
    .attr("opacity", 0.85)
    .style("cursor", "pointer")
    .on("mouseenter", function (event, d) {
      d3.select(this)
        .transition().duration(120)
        .attr("stroke", "#667eea")
        .attr("stroke-width", 2)
        .attr("opacity", 1)

      showTooltip(event as MouseEvent, {
        label: `${d.region} in ${d.modality}`,
        count: d.value,
        percent: d.percent
      })
    })
    .on("mousemove", evt => {
      tooltipX.value = evt.clientX + 10
      tooltipY.value = evt.clientY - 10
    })
    .on("mouseleave", function (event, d) {
      const sel = props.selectedValue
      const isSel = !!sel && sel.region === d.region && sel.modality === d.modality

      d3.select(this)
        .transition().duration(120)
        .attr("stroke", isSel ? "#2b6cb0" : "#e2e8f0")
        .attr("stroke-width", isSel ? 2 : 0.5)
        .attr("opacity", 0.85)

      hideTooltip()
    })
    .on("click", (_evt, d) => {
      const sel = props.selectedValue
      if (sel && sel.region === d.region && sel.modality === d.modality) {
        emit("item-select", null)
      } else {
        emit("item-select", {
          type: "modality-region",
          modality: d.modality,
          region: d.region
        })
      }
    })

  gGrid.selectAll("text")
    .data(cells)
    .enter()
    .append("text")
    .attr("x", d => x(d.region)! + x.bandwidth()/2)
    .attr("y", d => y(d.modality)! + y.bandwidth()/2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", d => {
      const fill = d.percent === 0 ? '#f7fafc' : color(d.percent)!
      return textColorForFill(fill)
    })
    .style("font-size", "4px")
    .style("pointer-events", "none")
    .attr("opacity", 0)
    .text(d => d.percent > 0 ? `${fmtPct(d.percent)}%` : "")
    .transition()
    .duration(250)
    .delay(80)
    .attr("opacity", 1)
}

onMounted(draw)
watch(() => props.matrix, draw, { deep: true })
watch(computedHeight, draw)
watch(() => props.selectedValue, draw)
</script>

<style scoped>
.modality-region-heatmap {
  padding: 1rem 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chart-header h3 {
  margin: 0 0 0.1rem;
  color: #2d3748;
  font-size: 1.05rem;
  font-weight: 700;
}

.sub {
  margin: 0 0 0.5rem;
  color: #718096;
  font-size: 0.85rem;
}

.chart-body {
  width: 100%;
  position: relative;
  flex: 1 1 auto;
}

.svg-chart {
  width: 100%;
  height: auto;
  display: block;
}

.empty-note {
  margin-top: 0.5rem;
  color: #718096;
}

.chart-tooltip {
  position: fixed;
  pointer-events: none;
  z-index: 1000;
  background: rgba(0,0,0,0.85);
  color: white;
  padding: 6px 10px;
  font-size: 11px;
  border-radius: 6px;
}

.tooltip-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tooltip-label {
  font-weight: 700;
  margin-bottom: 2px;
}

.tooltip-count,
.tooltip-extra {
  font-size: 11px;
}
</style>
