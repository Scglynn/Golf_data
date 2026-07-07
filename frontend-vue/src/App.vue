<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'

const isDark = ref(false)

function applyTheme() {
  document.documentElement.setAttribute('data-bs-theme', isDark.value ? 'dark' : 'light')
}

function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  applyTheme()
}

onMounted(() => {
  isDark.value = localStorage.getItem('theme') === 'dark'
  applyTheme()
})
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
    <div class="container">
      <RouterLink class="navbar-brand fw-bold" to="/">&#9971; Golf Tracker</RouterLink>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto">
          <li class="nav-item">
            <RouterLink class="nav-link" to="/" exact-active-class="active">
              View Shots
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" to="/add" active-class="active">
              Add Shot
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink class="nav-link" to="/swing-analysis" active-class="active">
              Swing Analysis
            </RouterLink>
          </li>
        </ul>
        <button class="boxed-button btn-sm ms-2 me-2" @click="toggleTheme">
          {{ isDark ? '☀️' : '🌙' }}
        </button>
      </div>
    </div>
  </nav>

  <main class="container page-container">
    <RouterView />
  </main>
</template>
