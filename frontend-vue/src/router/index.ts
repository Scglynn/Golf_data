import { createRouter, createWebHistory } from 'vue-router'
import ShotList from '../views/ShotList.vue'
import ShotForm from '../views/ShotForm.vue'
import SwingAnalysis from '../views/SwingAnalysis.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: ShotList },
    { path: '/add', component: ShotForm },
    { path: '/edit/:id', component: ShotForm },
    { path: '/swing-analysis', component: SwingAnalysis },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})
