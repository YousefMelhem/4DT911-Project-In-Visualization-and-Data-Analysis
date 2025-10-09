<template>
  <div class="ms" ref="rootRef">
    <button
      type="button"
      class="ms-btn"
      :aria-expanded="open ? 'true' : 'false'"
      @click.stop="toggleOpen"
      @keydown.enter.prevent="open = !open"
      @keydown.space.prevent="open = !open"
    >
      <span class="ms-label">{{ label }}</span>
      <span class="ms-summary" v-if="modelValue.length === 0">All</span>
      <span class="ms-summary" v-else>{{ modelValue.length }} selected</span>
      <span class="chev" aria-hidden="true">▾</span>
    </button>

    <div
      v-if="open"
      class="ms-popover"
      role="dialog"
      @keydown.esc.stop.prevent="open = false"
    >
      <div class="ms-search">
        <input v-model="q" type="text" placeholder="Search…" />
        <button
          v-if="modelValue.length"
          class="ms-clear"
          type="button"
          @click.stop="$emit('update:modelValue', [])"
          title="Clear selection"
        >
          Clear
        </button>
      </div>

      <div class="ms-list" ref="listRef">
        <label v-for="opt in filtered" :key="opt" class="ms-item">
          <input
            type="checkbox"
            :value="opt"
            :checked="modelValue.includes(opt)"
            @change="toggle(opt, $event)"
          />
          <span class="ms-item-label">{{ opt }}</span>
        </label>

        <div v-if="filtered.length === 0" class="ms-empty">No matches</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

/* =========================
 * Props & Emits
 * =======================*/
const props = defineProps<{
  label: string
  options: string[]
  modelValue: string[]
}>()

const emit = defineEmits<{ 'update:modelValue': [string[]] }>()

/* =========================
 * State & Refs
 * =======================*/
const open = ref(false)
const q = ref('')
const rootRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLDivElement | null>(null)

/* =========================
 * Derived
 * =======================*/
const filtered = computed(() => {
  const s = q.value.trim().toLowerCase()
  if (!s) return props.options
  return props.options.filter(o => o.toLowerCase().includes(s))
})

/* =========================
 * Handlers
 * =======================*/
const toggle = (opt: string, e: Event) => {
  const checked = (e.target as HTMLInputElement).checked
  const set = new Set(props.modelValue)
  checked ? set.add(opt) : set.delete(opt)
  emit('update:modelValue', Array.from(set))
}

const onClickAway = (e: MouseEvent) => {
  const root = rootRef.value
  if (!root) return
  const target = e.target as Node | null
  if (target && !root.contains(target)) open.value = false
}

const toggleOpen = () => {
  open.value = !open.value
  if (open.value) {
    // focus search input on open (next frame so DOM is ready)
    requestAnimationFrame(() => {
      const inp = rootRef.value?.querySelector<HTMLInputElement>('.ms-search input')
      inp?.focus()
    })
  }
}

/* =========================
 * Lifecycle
 * =======================*/
onMounted(() => document.addEventListener('click', onClickAway))
onBeforeUnmount(() => document.removeEventListener('click', onClickAway))

// Close if options list disappears (e.g., parent unmounts or empties)
watch(() => props.options, () => {
  if (!props.options?.length) open.value = false
})
</script>

<style scoped>
/* Root */
.ms {
  position: relative;
  width: 100%;
  display: block;
}

/* Trigger button */
.ms-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .5rem;
  padding: .5rem .75rem;
  border: 1px solid #cbd5e0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: .95rem;
  color: #2d3748;
}
.ms-btn:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(102,126,234,0.28);
  border-color: #667eea;
}
.ms-label { font-weight: 700; }
.ms-summary { color: #4a5568; font-weight: 500; }
.chev { color: #718096; }

/* Popover: anchored, same width as trigger */
.ms-popover {
  position: absolute;
  top: calc(100% + .4rem);
  left: 0;
  right: 0;          /* match trigger width */
  width: 100%;
  z-index: 30;

  display: flex;     /* column layout so list can flex */
  flex-direction: column;

  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,.08);
  padding: .5rem;
}

/* Search row: input + clear button stay on one line */
.ms-search {
  display: flex;
  align-items: center;
  gap: .4rem;
  padding: .25rem .25rem .5rem;
  border-bottom: 1px solid #edf2f7;
}
.ms-search input {
  flex: 1;
  min-width: 0;
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  font-size: .9rem;
  padding: .38rem .55rem;
  color: #2d3748;
  background: #fff;
  outline: none;
}
.ms-search input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102,126,234,0.22);
}
.ms-clear {
  flex-shrink: 0;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: .35rem .6rem;
  cursor: pointer;
  font-size: .8rem;
  color: #4a5568;
  transition: all 0.15s ease;
}
.ms-clear:hover { background: #e2e8f0; }

/* Options list */
.ms-list {
  margin-top: .4rem;
  max-height: 220px;
  overflow: auto;
  padding: .25rem;
}
.ms-item {
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .3rem .25rem;
  cursor: pointer;
  user-select: none;
}
.ms-item input { accent-color: #667eea; }
.ms-item-label { font-size: .92rem; color: #2d3748; }

.ms-empty {
  padding: .5rem;
  color: #718096;
  font-size: .9rem;
  text-align: center;
}
</style>
