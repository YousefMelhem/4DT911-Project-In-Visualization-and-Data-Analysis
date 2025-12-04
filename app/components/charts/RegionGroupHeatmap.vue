<template>
  <div class="region-heatmap">
    <div class="chart-header">
      <h3>Region by group</h3>
      <p class="sub">
        Share of each group&rsquo;s cases that include a given region
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
        v-if="matrix.regions.length === 0 || matrix.groups.length === 0"
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
import { ref, watch, onMounted, computed, nextTick } from "vue"
import * as d3 from "d3"

/* =========================
 * Types
 * =======================*/
type RegionGroupMatrix = {
  regions: string[]
  groups: {
    id: string
    name: string
    color: string
    total: number
  }[]
  counts: number[][] // counts[regionIdx][groupIdx]
}

type Cell = {
  region: string
  groupId: string
  groupName: string
  groupColor: string
  value: number
  totalInGroup: number
  percent: number
}

const props = defineProps<{
  matrix: RegionGroupMatrix
  selectedValue?: string | null
}>()

const emit = defineEmits<{
  (e: "item-select", payload: { type: "region"; value: string } | null): void
}>()

/* =========================
 * Scaled-down sizing
 * =======================*/
const VIEW_W = 450
const CELL_SIZE = 15
const MARGIN = { top: 40, right: 6, bottom: 0, left: 0 }
const COL_LABEL_OFFSET = 3

const computedHeight = computed(() => {
  const n = props.matrix.groups?.length ?? 0
  return MARGIN.top + n * CELL_SIZE + MARGIN.bottom
})

/* =========================
 * SVG / Tooltip
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

const hideTooltip = () => (tooltipVisible.value = false)

/* =========================
 * Render
 * =======================*/
const draw = () => {
  const el = svgRef.value
  if (!el) return

  const regions = props.matrix.regions ?? []
  const groups = props.matrix.groups ?? []
  const counts = props.matrix.counts ?? []

  const nRows = groups.length
  const nCols = regions.length

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

  /* --- Grid scaling --- */
  const innerWidth = nCols * CELL_SIZE
  const xStart = (W - innerWidth) / 2

  const x = d3.scaleBand<string>()
    .domain(regions)
    .range([xStart, xStart + innerWidth])
    .padding(0)

  const y = d3.scaleBand<string>()
    .domain(groups.map(g => g.id))
    .range([MARGIN.top, MARGIN.top + nRows * CELL_SIZE])
    .padding(0)

  /* --- Flatten cell data --- */
  const cells: Cell[] = []
  let maxPct = 0

  for (let r = 0; r < nRows; r++) {
    const group = groups[r]!
    for (let c = 0; c < nCols; c++) {
      const region = regions[c]!
      const value = counts[c]?.[r] ?? 0
      const total = group.total || 0
      const pct = total > 0 ? (value / total) * 100 : 0

      cells.push({
        region,
        groupId: group.id,
        groupName: group.name,
        groupColor: group.color,
        value,
        totalInGroup: total,
        percent: pct
      })

      if (pct > maxPct) maxPct = pct
    }
  }

  const color = d3.scaleSequential(d3.interpolateBlues)
    .domain([0, Math.max(maxPct, 1)])

  const fmtPct = d3.format(".1f")

  /* --- Column labels --- */
  svg.append("g")
    .attr("transform", `translate(0, ${MARGIN.top - COL_LABEL_OFFSET})`)
    .selectAll("text")
    .data(regions)
    .enter()
    .append("text")
    .attr("transform", r => `translate(${x(r)! + x.bandwidth()/2},0) rotate(-30)`)
    .attr("text-anchor", "start")
    .attr("fill", r => props.selectedValue === r ? "#2b6cb0" : "#4a5568")
    .style("font-size", "3px")
    .style("font-weight", r => props.selectedValue === r ? 700 : 500)
    .text(r => r)

  /* --- Row labels (groups) --- */
  svg.append("g")
    .selectAll("text")
    .data(groups)
    .enter()
    .append("text")
    .attr("x", xStart - 6)
    .attr("y", g => y(g.id)! + y.bandwidth()/2)
    .attr("text-anchor", "end")
    .attr("dominant-baseline", "middle")
    .attr("fill", g => g.color)
    .style("font-size", "5px")
    .style("font-weight", "600")
    .text(g => g.name)

  /* --- Cells --- */
  const gGrid = svg.append("g")

  gGrid.selectAll("rect")
    .data(cells)
    .enter()
    .append("rect")
    .attr("class", "cell")
    .attr("x", d => x(d.region)!)
    .attr("y", d => y(d.groupId)!)
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("stroke", d =>
      props.selectedValue === d.region ? "#2b6cb0" : "#e2e8f0"
    )
    .attr("stroke-width", d =>
      props.selectedValue === d.region ? 2 : 0.5
    )
    .attr("fill", d => d.percent === 0 ? "#f7fafc" : color(d.percent)!)
    .attr("opacity", 0.85)
    .style("cursor", "pointer")
    .on("mouseenter", function(event, d) {
      d3.select(this)
        .transition().duration(120)
        .attr("stroke", "#667eea")
        .attr("stroke-width", 2)
        .attr("opacity", 1)

      showTooltip(event as MouseEvent, {
        label: `${d.region} in ${d.groupName}`,
        count: d.value,
        percent: d.percent
      })
    })
    .on("mousemove", evt => {
      tooltipX.value = evt.clientX + 10
      tooltipY.value = evt.clientY - 10
    })
    .on("mouseleave", function(event, d) {
      const isSel = props.selectedValue === d.region

      d3.select(this)
        .transition().duration(120)
        .attr("stroke", isSel ? "#2b6cb0" : "#e2e8f0")
        .attr("stroke-width", isSel ? 2 : 0.5)
        .attr("opacity", 0.85)

      hideTooltip()
    })
    .on("click", (_evt, d) => {
      if (props.selectedValue === d.region)
        emit("item-select", null)
      else
        emit("item-select", { type: "region", value: d.region })
    })

  /* --- Percent labels --- */
  gGrid.selectAll("text")
    .data(cells)
    .enter()
    .append("text")
    .attr("x", d => x(d.region)! + x.bandwidth()/2)
    .attr("y", d => y(d.groupId)! + y.bandwidth()/2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
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
.region-heatmap {
  padding: 1rem 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  height: 100%;
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
</style>
