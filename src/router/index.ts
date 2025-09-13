import { createRouter, createWebHistory } from 'vue-router'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Index',
      component:  () => import('../views/Index.vue'),
      children: [
        {
          path: '/',
          name: 'dataAnalysis',
          component:  () => import('../views/DataAnalysis.vue'),
        },
      ]
    },
  ],
})

export default router
