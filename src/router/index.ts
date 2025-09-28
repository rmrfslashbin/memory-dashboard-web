import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/pages/DashboardPage.vue'),
    meta: {
      title: 'Dashboard',
      icon: 'mdi-view-dashboard',
    },
  },
  {
    path: '/collections',
    name: 'Collections',
    component: () => import('@/pages/CollectionsPage.vue'),
    meta: {
      title: 'Collections',
      icon: 'mdi-folder-multiple',
    },
  },
  {
    path: '/collections/:id',
    name: 'CollectionDetail',
    component: () => import('@/pages/CollectionDetailPage.vue'),
    meta: {
      title: 'Collection Detail',
    },
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/pages/SearchPage.vue'),
    meta: {
      title: 'Search',
      icon: 'mdi-magnify',
    },
  },
  {
    path: '/playground',
    name: 'Playground',
    component: () => import('@/pages/PlaygroundPage.vue'),
    meta: {
      title: 'Playground',
      icon: 'mdi-code-braces',
    },
  },
  {
    path: '/metrics',
    name: 'Metrics',
    component: () => import('@/pages/MetricsPage.vue'),
    meta: {
      title: 'System Metrics',
      icon: 'mdi-chart-line',
    },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/pages/SettingsPage.vue'),
    meta: {
      title: 'Settings',
      icon: 'mdi-cog',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: {
      title: 'Page Not Found',
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Navigation guard to update page title
router.beforeEach((to, from, next) => {
  document.title = to.meta?.title
    ? `${to.meta.title} - Memory Dashboard`
    : 'Memory Dashboard'
  next()
})

export default router