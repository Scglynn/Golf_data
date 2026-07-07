<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { shotService } from '../services/shotService'
import type { Shot, FeedbackItem } from '../types/shot'

const route = useRoute()
const router = useRouter()

const isEditMode = computed(() => !!route.params['id'])
const editId = computed(() => isEditMode.value ? Number(route.params['id']) : null)

const clubs = [
  'Driver', '3-Wood', '5-Wood', '7-Wood',
  '2-Iron', '3-Iron', '4-Iron', '5-Iron', '6-Iron', '7-Iron', '8-Iron', '9-Iron',
  'Pitching Wedge', 'Gap Wedge', 'Sand Wedge', 'Lob Wedge', 'Putter',
]

interface FormState {
  club: string
  ball_speed: number | null
  launch_angle: number | null
  back_spin: number | null
  side_spin: number | null
  club_path: number | null
  carry_distance: number | null
  total_distance: number | null
}

const form = reactive<FormState>({
  club: '',
  ball_speed: null,
  launch_angle: null,
  back_spin: null,
  side_spin: null,
  club_path: null,
  carry_distance: null,
  total_distance: null,
})

const touched = reactive<Record<string, boolean>>({})

function touch(field: string) {
  touched[field] = true
}

function touchAll() {
  for (const k of Object.keys(form)) touched[k] = true
}

const validationRules: Record<string, [number, number]> = {
  ball_speed:      [0,      250],
  launch_angle:    [-10,    60],
  back_spin:       [-10000, 10000],
  side_spin:       [-5000,  5000],
  club_path:       [-20,    20],
  carry_distance:  [0,      500],
  total_distance:  [0,      600],
}

const errorMessages: Record<string, { required: string; min: string; max: string }> = {
  ball_speed:     { required: 'Ball speed is required.', min: 'Must be at least 0 mph.', max: 'Must be 250 mph or less.' },
  launch_angle:   { required: 'Launch angle is required.', min: 'Minimum is -10°.', max: 'Maximum is 60°.' },
  back_spin:      { required: 'Back spin is required.', min: 'Minimum is -10,000 rpm.', max: 'Maximum is 10,000 rpm.' },
  side_spin:      { required: 'Side spin is required.', min: 'Minimum is -5,000 rpm.', max: 'Maximum is 5,000 rpm.' },
  club_path:      { required: 'Club path is required.', min: 'Minimum is -20°.', max: 'Maximum is 20°.' },
  carry_distance: { required: 'Carry distance is required.', min: 'Must be 0 or more yards.', max: 'Must be 500 yards or less.' },
  total_distance: { required: 'Total distance is required.', min: 'Must be 0 or more yards.', max: 'Must be 600 yards or less.' },
}

function getError(field: keyof FormState): string {
  if (!touched[field]) return ''
  const val = form[field]
  if (field === 'club') return val ? '' : 'Please select a club.'
  if (val === null || val === '') return errorMessages[field]?.required ?? 'Required.'
  const [min, max] = validationRules[field] ?? []
  if (min !== undefined && Number(val) < min) return errorMessages[field]?.min ?? `Min ${min}.`
  if (max !== undefined && Number(val) > max) return errorMessages[field]?.max ?? `Max ${max}.`
  return ''
}

function isInvalid(field: keyof FormState): boolean {
  return !!getError(field)
}

const isFormValid = computed(() => {
  return (Object.keys(form) as Array<keyof FormState>).every(k => {
    const val = form[k]
    if (k === 'club') return !!val
    if (val === null) return false
    const [min, max] = validationRules[k] ?? []
    if (min !== undefined && Number(val) < min) return false
    if (max !== undefined && Number(val) > max) return false
    return true
  })
})

// Feedback panel state
const showFeedback = ref(false)
const feedbackItems = ref<FeedbackItem[]>([])
const savedShot = ref<Shot | null>(null)

async function onSubmit() {
  touchAll()
  if (!isFormValid.value) return

  const payload = { ...form } as Partial<Shot>

  if (isEditMode.value && editId.value !== null) {
    try {
      await shotService.updateShot(editId.value, payload)
      router.push('/')
    } catch (err) {
      console.error('Failed to update shot:', err)
    }
  } else {
    try {
      const response = await shotService.createShot(payload)
      savedShot.value = response.shot
      feedbackItems.value = response.feedback
      showFeedback.value = true
    } catch (err) {
      console.error('Failed to create shot:', err)
    }
  }
}

function logAnother() {
  form.club = ''
  form.ball_speed = null
  form.launch_angle = null
  form.back_spin = null
  form.side_spin = null
  form.club_path = null
  form.carry_distance = null
  form.total_distance = null
  for (const k of Object.keys(touched)) delete touched[k]
  savedShot.value = null
  feedbackItems.value = []
  showFeedback.value = false
}

onMounted(async () => {
  if (isEditMode.value && editId.value !== null) {
    try {
      const shot = await shotService.getShotById(editId.value)
      form.club = shot.club
      form.ball_speed = shot.ball_speed
      form.launch_angle = shot.launch_angle
      form.back_spin = shot.back_spin
      form.side_spin = shot.side_spin
      form.club_path = shot.club_path
      form.carry_distance = shot.carry_distance
      form.total_distance = shot.total_distance
    } catch (err) {
      console.error('Failed to load shot for editing:', err)
      router.push('/')
    }
  }
})
</script>

<template>
  <!-- Feedback panel -->
  <div v-if="showFeedback" class="row justify-content-center mt-4">
    <div class="col-12 col-md-8 col-lg-6">
      <div class="card shadow-sm">
        <div class="card-header bg-success text-white d-flex align-items-center gap-2">
          <span class="fs-5">&#10003;</span>
          <h4 class="mb-0">Shot Saved!</h4>
        </div>
        <div class="card-body">
          <p v-if="savedShot" class="text-muted mb-3">
            {{ savedShot.club }} &mdash;
            {{ savedShot.carry_distance }} yds carry /
            {{ savedShot.total_distance }} yds total
          </p>
          <h5 class="mb-3">Swing Feedback</h5>
          <div
            v-for="(item, i) in feedbackItems"
            :key="i"
            class="alert mb-2"
            :class="`alert-${item.type}`"
            role="alert"
          >
            <strong>{{ item.message }}</strong>
            <div class="mt-1 small">{{ item.tip }}</div>
          </div>
          <div class="d-flex gap-2 mt-4">
            <button type="button" class="btn btn-primary flex-grow-1" @click="logAnother">
              Log Another Shot
            </button>
            <RouterLink to="/" class="btn btn-outline-secondary">View All Shots</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Shot entry form -->
  <div v-if="!showFeedback" class="row justify-content-center mt-4">
    <div class="col-12 col-md-8 col-lg-6">
      <div class="card shadow-sm">
        <div class="card-header bg-dark text-white">
          <h4 class="mb-0">{{ isEditMode ? 'Edit Shot' : 'Add Shot' }}</h4>
        </div>
        <div class="card-body">
          <form @submit.prevent="onSubmit" novalidate>

            <!-- Club -->
            <div class="mb-3">
              <label for="club" class="form-label fw-semibold">Club</label>
              <select
                id="club"
                v-model="form.club"
                class="form-select"
                :class="{ 'is-invalid': isInvalid('club') }"
                @blur="touch('club')"
              >
                <option value="" disabled>Select a club…</option>
                <option v-for="c in clubs" :key="c" :value="c">{{ c }}</option>
              </select>
              <div class="invalid-feedback">{{ getError('club') }}</div>
            </div>

            <!-- Ball Speed -->
            <div class="mb-3">
              <label for="ball_speed" class="form-label fw-semibold">
                Ball Speed <span class="text-muted fw-normal">(mph)</span>
              </label>
              <input
                type="number"
                id="ball_speed"
                v-model.number="form.ball_speed"
                class="form-control"
                :class="{ 'is-invalid': isInvalid('ball_speed') }"
                placeholder="e.g. 150"
                step="0.1"
                @blur="touch('ball_speed')"
              />
              <div class="invalid-feedback">{{ getError('ball_speed') }}</div>
            </div>

            <!-- Launch Angle -->
            <div class="mb-3">
              <label for="launch_angle" class="form-label fw-semibold">
                Launch Angle <span class="text-muted fw-normal">(degrees)</span>
              </label>
              <input
                type="number"
                id="launch_angle"
                v-model.number="form.launch_angle"
                class="form-control"
                :class="{ 'is-invalid': isInvalid('launch_angle') }"
                placeholder="e.g. 14.5"
                step="0.1"
                @blur="touch('launch_angle')"
              />
              <div class="invalid-feedback">{{ getError('launch_angle') }}</div>
            </div>

            <!-- Back Spin -->
            <div class="mb-3">
              <label for="back_spin" class="form-label fw-semibold">
                Back Spin <span class="text-muted fw-normal">(rpm)</span>
              </label>
              <input
                type="number"
                id="back_spin"
                v-model.number="form.back_spin"
                class="form-control"
                :class="{ 'is-invalid': isInvalid('back_spin') }"
                placeholder="e.g. 2500"
                step="1"
                @blur="touch('back_spin')"
              />
              <div class="invalid-feedback">{{ getError('back_spin') }}</div>
            </div>

            <!-- Side Spin -->
            <div class="mb-3">
              <label for="side_spin" class="form-label fw-semibold">
                Side Spin
                <span class="text-muted fw-normal">(rpm · negative = draw, positive = fade)</span>
              </label>
              <input
                type="number"
                id="side_spin"
                v-model.number="form.side_spin"
                class="form-control"
                :class="{ 'is-invalid': isInvalid('side_spin') }"
                placeholder="e.g. -200"
                step="1"
                @blur="touch('side_spin')"
              />
              <div class="invalid-feedback">{{ getError('side_spin') }}</div>
            </div>

            <!-- Club Path -->
            <div class="mb-3">
              <label for="club_path" class="form-label fw-semibold">
                Club Path
                <span class="text-muted fw-normal">(degrees · positive = in-to-out, negative = out-to-in)</span>
              </label>
              <input
                type="number"
                id="club_path"
                v-model.number="form.club_path"
                class="form-control"
                :class="{ 'is-invalid': isInvalid('club_path') }"
                placeholder="e.g. 2.5"
                step="0.1"
                @blur="touch('club_path')"
              />
              <div class="invalid-feedback">{{ getError('club_path') }}</div>
            </div>

            <!-- Carry Distance -->
            <div class="mb-3">
              <label for="carry_distance" class="form-label fw-semibold">
                Carry Distance <span class="text-muted fw-normal">(yards)</span>
              </label>
              <input
                type="number"
                id="carry_distance"
                v-model.number="form.carry_distance"
                class="form-control"
                :class="{ 'is-invalid': isInvalid('carry_distance') }"
                placeholder="e.g. 240"
                step="0.1"
                @blur="touch('carry_distance')"
              />
              <div class="invalid-feedback">{{ getError('carry_distance') }}</div>
            </div>

            <!-- Total Distance -->
            <div class="mb-3">
              <label for="total_distance" class="form-label fw-semibold">
                Total Distance <span class="text-muted fw-normal">(yards)</span>
              </label>
              <input
                type="number"
                id="total_distance"
                v-model.number="form.total_distance"
                class="form-control"
                :class="{ 'is-invalid': isInvalid('total_distance') }"
                placeholder="e.g. 265"
                step="0.1"
                @blur="touch('total_distance')"
              />
              <div class="invalid-feedback">{{ getError('total_distance') }}</div>
            </div>

            <!-- Actions -->
            <div class="d-flex gap-2 mt-4">
              <button type="submit" class="btn btn-success flex-grow-1">Save Shot</button>
              <RouterLink to="/" class="btn btn-outline-secondary">Cancel</RouterLink>
            </div>

          </form>
        </div>
      </div>
    </div>
  </div>
</template>
