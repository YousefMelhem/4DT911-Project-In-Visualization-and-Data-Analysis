import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import App from '../../App.vue'

// Mock router for testing
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
    { path: '/about', name: 'about', component: { template: '<div>About</div>' } }
  ]
})

describe('App.vue', () => {
  beforeEach(async () => {
    router.push('/')
    await router.isReady()
  })

  it('renders without crashing', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('has proper navigation structure', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [router]
      }
    })
    
    // Check if RouterView is present
    expect(wrapper.findComponent({ name: 'RouterView' }).exists()).toBe(true)
  })
})
