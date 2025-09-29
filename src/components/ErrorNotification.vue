<template>
  <v-snackbar
    v-model="show"
    :timeout="timeout"
    :color="notificationColor"
    location="top right"
    variant="elevated"
    class="error-notification"
  >
    <div class="d-flex align-center">
      <v-icon
        :icon="notificationIcon"
        class="mr-3"
        size="24"
      />

      <div class="flex-grow-1">
        <div class="text-subtitle-2 font-weight-medium">
          {{ error?.userMessage || 'An error occurred' }}
        </div>

        <div v-if="showDetails" class="text-caption mt-1 opacity-80">
          {{ error?.technicalMessage }}
        </div>

        <div v-if="error?.recoverable" class="mt-2">
          <v-btn
            size="small"
            variant="text"
            color="white"
            @click="retry"
            :loading="retrying"
            class="mr-2"
          >
            <v-icon start size="16">mdi-refresh</v-icon>
            Retry
          </v-btn>
        </div>
      </div>

      <div class="ml-2 d-flex flex-column align-center">
        <v-btn
          v-if="allowDismiss"
          icon
          size="small"
          variant="text"
          color="white"
          @click="dismiss"
        >
          <v-icon size="20">mdi-close</v-icon>
        </v-btn>

        <v-btn
          v-if="allowToggleDetails"
          icon
          size="small"
          variant="text"
          color="white"
          @click="toggleDetails"
          class="mt-1"
        >
          <v-icon size="16">{{ showDetails ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
        </v-btn>
      </div>
    </div>

    <!-- Progress bar for auto-dismiss -->
    <div v-if="timeout > 0 && show" class="notification-progress">
      <v-progress-linear
        :model-value="progressValue"
        color="white"
        height="2"
        class="notification-progress-bar"
      />
    </div>
  </v-snackbar>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { AppError } from '@/composables/useErrorHandler'

interface Props {
  error: AppError | null
  timeout?: number
  allowDismiss?: boolean
  allowRetry?: boolean
  allowToggleDetails?: boolean
  onRetry?: () => Promise<void> | void
}

const props = withDefaults(defineProps<Props>(), {
  timeout: 8000,
  allowDismiss: true,
  allowRetry: true,
  allowToggleDetails: false
})

const emit = defineEmits<{
  dismiss: []
  retry: []
}>()

// State
const show = ref(false)
const showDetails = ref(false)
const retrying = ref(false)
const progressValue = ref(100)
const progressInterval = ref<number | null>(null)

// Computed properties
const notificationColor = computed(() => {
  if (!props.error) return 'error'

  const colorMap = {
    network: 'warning',
    validation: 'info',
    authentication: 'warning',
    authorization: 'error',
    not_found: 'info',
    server_error: 'error',
    client_error: 'warning',
    timeout: 'warning',
    rate_limit: 'warning',
    unknown: 'error'
  }

  return colorMap[props.error.type] || 'error'
})

const notificationIcon = computed(() => {
  if (!props.error) return 'mdi-alert'

  const iconMap = {
    network: 'mdi-wifi-off',
    validation: 'mdi-alert-circle',
    authentication: 'mdi-account-lock',
    authorization: 'mdi-shield-alert',
    not_found: 'mdi-file-question',
    server_error: 'mdi-server-off',
    client_error: 'mdi-alert',
    timeout: 'mdi-clock-alert',
    rate_limit: 'mdi-speedometer',
    unknown: 'mdi-alert'
  }

  return iconMap[props.error.type] || 'mdi-alert'
})

// Watch for error changes
watch(
  () => props.error,
  (newError) => {
    if (newError) {
      showError()
    } else {
      hideError()
    }
  },
  { immediate: true }
)

// Methods
function showError() {
  show.value = true
  showDetails.value = false

  if (props.timeout > 0) {
    startProgressBar()
  }
}

function hideError() {
  show.value = false
  showDetails.value = false
  stopProgressBar()
}

function dismiss() {
  hideError()
  emit('dismiss')
}

async function retry() {
  if (retrying.value) return

  retrying.value = true

  try {
    if (props.onRetry) {
      await props.onRetry()
    }

    emit('retry')
    hideError()
  } catch (retryError) {
    console.error('Retry failed:', retryError)
    // Keep notification open on retry failure
  } finally {
    retrying.value = false
  }
}

function toggleDetails() {
  showDetails.value = !showDetails.value
}

function startProgressBar() {
  if (progressInterval.value) {
    clearInterval(progressInterval.value)
  }

  progressValue.value = 100
  const intervalMs = 50
  const decrementPerInterval = (100 / props.timeout) * intervalMs

  progressInterval.value = setInterval(() => {
    progressValue.value -= decrementPerInterval

    if (progressValue.value <= 0) {
      stopProgressBar()
    }
  }, intervalMs)
}

function stopProgressBar() {
  if (progressInterval.value) {
    clearInterval(progressInterval.value)
    progressInterval.value = null
  }
}

// Cleanup
onUnmounted(() => {
  stopProgressBar()
})
</script>

<style scoped>
.error-notification {
  max-width: 480px;
  min-width: 320px;
}

.notification-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
}

.notification-progress-bar {
  border-radius: 0 0 4px 4px;
}

/* Dark theme adjustments */
.v-theme--dark .error-notification {
  color: white;
}

/* Mobile responsive */
@media (max-width: 600px) {
  .error-notification {
    min-width: 280px;
    max-width: calc(100vw - 32px);
  }
}
</style>