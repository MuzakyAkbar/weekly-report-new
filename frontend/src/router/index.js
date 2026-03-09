import { createRouter, createWebHistory } from 'vue-router'
import LoginForm from '../components/LoginForm.vue'
import ReportView from '../views/ReportView.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'login',
    component: LoginForm
  },
  {
    path: '/report',
    name: 'report',
    component: ReportView
  }
]

const router = createRouter({
  history: createWebHistory('/activity-report/'),
  routes
})

export default router