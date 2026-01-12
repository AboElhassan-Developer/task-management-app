const routes = [
  {
    path: '/login',
    component: () => import('pages/LoginPage.vue')
  },
  {
    path: '/register',
    component: () => import('pages/RegisterPage.vue')
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('pages/TasksPage.vue') },
      { path: 'tasks', component: () => import('pages/TasksPage.vue') }
    ]
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes
