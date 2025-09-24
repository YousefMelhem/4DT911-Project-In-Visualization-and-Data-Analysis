import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/clustering',
    },
    {
      path: '/clustering',
      name: 'clustering',
      component: () => import('../views/ClusteringDashboard.vue'),
    },
  ],
})

export default router
