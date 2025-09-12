import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCounterStore } from '../../stores/counter'

describe('Counter Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should initialize with count 0', () => {
    const counter = useCounterStore()
    expect(counter.count).toBe(0)
  })

  it('should increment count', () => {
    const counter = useCounterStore()
    counter.increment()
    expect(counter.count).toBe(1)
  })

  it('should calculate doubleCount correctly', () => {
    const counter = useCounterStore()
    counter.count = 5
    expect(counter.doubleCount).toBe(10)
  })
})
