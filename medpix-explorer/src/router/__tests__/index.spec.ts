import { describe, it, expect } from 'vitest'
import router from '../../router'

describe('Router', () => {
  it('should have correct routes configured', () => {
    expect(router.getRoutes()).toHaveLength(2)
    
    const homeRoute = router.getRoutes().find(route => route.name === 'home')
    const aboutRoute = router.getRoutes().find(route => route.name === 'about')
    
    expect(homeRoute).toBeDefined()
    expect(homeRoute?.path).toBe('/')
    
    expect(aboutRoute).toBeDefined()
    expect(aboutRoute?.path).toBe('/about')
  })

  it('should navigate to home route', async () => {
    await router.push('/')
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('should navigate to about route', async () => {
    await router.push('/about')
    expect(router.currentRoute.value.name).toBe('about')
  })
})
