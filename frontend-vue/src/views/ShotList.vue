<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { shotService } from '../services/shotService'
import type { Shot } from '../types/shot'

const router = useRouter()
const shots = ref<Shot[]>([])
const isLoading = ref(false)
const errorMessage = ref('')

async function loadShots() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    shots.value = await shotService.getAllShots()
  } catch (err) {
    console.error('Failed to load shots:', err)
    errorMessage.value = 'Could not load shots. Is the backend running?'
  } finally {
    isLoading.value = false
  }
}

function editShot(id: number) {
  router.push(`/edit/${id}`)
}

async function deleteShot(id: number) {
  if (!window.confirm('Are you sure you want to delete this shot? This action cannot be undone.')) return
  try {
    await shotService.deleteShot(id)
    await loadShots()
  } catch (err) {
    console.error('Failed to delete shot:', err)
    errorMessage.value = 'Failed to delete shot. Please try again.'
  }
}

function fmt(val: number, decimals: number): string {
  return val.toFixed(decimals)
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

onMounted(loadShots)
</script>

<template>
  <div class="mt-4">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">Golf Shot Tracker</h2>
      <RouterLink to="/add" class="btn btn-success">+ Add New Shot</RouterLink>
    </div>

    <div v-if="errorMessage" class="alert alert-danger alert-dismissible" role="alert">
      {{ errorMessage }}
      <button type="button" class="btn-close" @click="errorMessage = ''" aria-label="Close"></button>
    </div>

    <div v-if="isLoading" class="text-center py-5">
      <div class="spinner-border text-success" role="status">
        <span class="visually-hidden">Loading…</span>
      </div>
    </div>

    <div v-if="!isLoading && shots.length === 0 && !errorMessage" class="text-center py-5 text-muted">
      <p class="fs-5">No shots recorded yet.</p>
      <RouterLink to="/add" class="btn btn-outline-success">Record your first shot</RouterLink>
    </div>

    <div v-if="!isLoading && shots.length > 0" class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-striped table-hover mb-0">
          <thead class="table-dark">
            <tr>
              <th>Club</th>
              <th class="text-end">Ball Speed<br><small class="fw-normal text-secondary">(mph)</small></th>
              <th class="text-end">Launch Angle<br><small class="fw-normal text-secondary">(°)</small></th>
              <th class="text-end">Back Spin<br><small class="fw-normal text-secondary">(rpm)</small></th>
              <th class="text-end">Side Spin<br><small class="fw-normal text-secondary">(rpm)</small></th>
              <th class="text-end">Club Path<br><small class="fw-normal text-secondary">(°)</small></th>
              <th class="text-end">Carry<br><small class="fw-normal text-secondary">(yds)</small></th>
              <th class="text-end">Total<br><small class="fw-normal text-secondary">(yds)</small></th>
              <th>Date</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="shot in shots" :key="shot.id">
              <td class="fw-semibold">{{ shot.club }}</td>
              <td class="text-end">{{ fmt(shot.ball_speed, 1) }}</td>
              <td class="text-end">{{ fmt(shot.launch_angle, 1) }}</td>
              <td class="text-end">{{ fmt(shot.back_spin, 0) }}</td>
              <td
                class="text-end"
                :class="{ 'text-danger': shot.side_spin > 0, 'text-primary': shot.side_spin < 0 }"
              >
                {{ fmt(shot.side_spin, 0) }}
              </td>
              <td
                class="text-end"
                :class="{ 'text-primary': shot.club_path > 0, 'text-danger': shot.club_path < 0 }"
              >
                {{ fmt(shot.club_path, 1) }}
              </td>
              <td class="text-end">{{ fmt(shot.carry_distance, 1) }}</td>
              <td class="text-end">{{ fmt(shot.total_distance, 1) }}</td>
              <td class="text-nowrap">{{ fmtDate(shot.created_at) }}</td>
              <td class="text-center text-nowrap">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-primary me-1"
                  @click="editShot(shot.id)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-danger"
                  @click="deleteShot(shot.id)"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="card-footer text-muted small">
        {{ shots.length }} shot{{ shots.length !== 1 ? 's' : '' }} recorded
      </div>
    </div>
  </div>
</template>
