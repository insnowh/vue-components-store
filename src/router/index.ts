import { createRouter, createWebHistory } from 'vue-router'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/index',
      name: 'Index',
      component:  () => import('../views/Index.vue'),
      children: [
        {
          path: '',
          name: 'dataAnalysis',
          component:  () => import('../views/DataAnalysis.vue'),
        },
        {
          path: '/userManagement',
          name: 'userManagement',
          component:  () => import('../views/UserManagement.vue'),
        },
        {
          path: '/chatHistory',
          name: 'chatHistory',
          component:  () => import('../views/ChatHistory.vue'),
        },
        {
          path: '/chat',
          name: 'chat',
          component:  () => import('../views/Chat.vue'),
        },
        {
          path: '/dictManagement',
          name: 'DictManagement',
          component:  () => import('../views/DictManagement.vue'),
        },
        {
          path: '/profile',
          name: 'profile',
          component:  () => import('../views/Profile.vue'),
        },
        {
          path: '/upload',
          name: 'upload',
          component:  () => import('../views/FileUpload.vue'),
        }
      ]
    },
    {
      path: '/',
      name: 'login',
      component:  () => import('../views/Login.vue'),
    },
  ],
})

export default router
