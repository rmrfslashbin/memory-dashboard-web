<template>
  <div v-if="hasError" class="error-boundary">
    <v-alert
      type="error"
      variant="tonal"
      prominent
      class="ma-4"
    >
      <template v-slot:prepend>
        <v-icon size="32">mdi-alert-circle</v-icon>
      </template>

      <v-alert-title class="text-h6">
        {{ errorTitle }}
      </v-alert-title>

      <div class="mt-2">
        <p class="text-body-1 mb-3">{{ errorMessage }}</p>

        <v-expansion-panels v-if="showDetails" variant="accordion">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon start>mdi-bug</v-icon>
              Technical Details
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="error-details">
                <div class="mb-2">
                  <strong>Error:</strong> {{ error?.message || 'Unknown error' }}
                </div>
                <div v-if="error?.stack" class="mb-2">
                  <strong>Stack trace:</strong>
                  <pre class="error-stack">{{ error.stack }}</pre>
                </div>
                <div class="mb-2">
                  <strong>Component:</strong> {{ componentName }}
                </div>
                <div class="mb-2">
                  <strong>Timestamp:</strong> {{ errorTimestamp }}
                </div>
                <div v-if="errorId" class="mb-2">
                  <strong>Error ID:</strong> {{ errorId }}
                </div>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <div class="mt-4 d-flex flex-wrap gap-2">
          <v-btn
            color="primary"
            variant="flat"
            @click="retry"
            :loading="retrying"
          >
            <v-icon start>mdi-refresh</v-icon>
            Try Again
          </v-btn>

          <v-btn
            color="secondary"
            variant="outlined"
            @click="goHome"
          >
            <v-icon start>mdi-home</v-icon>
            Go Home
          </v-btn>

          <v-btn
            v-if="allowReportError"
            color="orange"
            variant="outlined"
            @click="reportError"
            :loading="reportingError"
          >
            <v-icon start>mdi-bug-outline</v-icon>
            Report Issue
          </v-btn>

          <v-btn
            variant="text"
            @click="toggleDetails"
          >
            <v-icon start>{{ showDetails ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
            {{ showDetails ? 'Hide' : 'Show' }} Details
          </v-btn>
        </div>
      </div>
    </v-alert>
  </div>

  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, provide, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ErrorReporterKey, type ErrorReporter, type ErrorContext } from '@/types/errors'

interface Props {
  fallbackComponent?: string
  allowRetry?: boolean
  allowReportError?: boolean
  errorTitle?: string
  errorMessage?: string
  onError?: (error: Error, componentName: string) => void
}

const props = withDefaults(defineProps<Props>(), {
  allowRetry: true,
  allowReportError: true,
  errorTitle: 'Something went wrong',
  errorMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.'
})

const emit = defineEmits<{
  retry: []
}>()

const router = useRouter()
const errorReporter = inject(ErrorReporterKey)

// Error state
const hasError = ref(false)
const error = ref<Error | null>(null)
const componentName = ref('')
const errorTimestamp = ref('')
const errorId = ref('')
const retrying = ref(false)
const reportingError = ref(false)
const showDetails = ref(false)

// Generate unique error ID
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Error capture
onErrorCaptured((err: Error, failedComponent: any) => {
  console.error('Error boundary caught error:', err)

  hasError.value = true
  error.value = err
  componentName.value = failedComponent?.$options.name || failedComponent?.__name || 'Unknown Component'
  errorTimestamp.value = new Date().toISOString()
  errorId.value = generateErrorId()

  // Call custom error handler
  props.onError?.(err, componentName.value)

  // Report error automatically (non-blocking)
  if (errorReporter && props.allowReportError) {
    reportErrorToService(err).catch(console.error)
  }

  // Return false to prevent error propagation
  return false
})

// Retry mechanism
async function retry() {
  retrying.value = true

  try {
    // Wait a moment before retrying
    await new Promise(resolve => setTimeout(resolve, 500))

    // Reset error state
    hasError.value = false
    error.value = null
    componentName.value = ''
    errorTimestamp.value = ''
    errorId.value = ''
    showDetails.value = false
  } finally {
    retrying.value = false
  }
}

// Navigation
function goHome() {
  router.push('/').catch(console.error)
}

// Error reporting
async function reportError() {
  if (!error.value || reportingError.value) return

  reportingError.value = true

  try {
    await reportErrorToService(error.value)

    // Show success feedback
    // Note: In a real app, you might want to show a toast notification
    console.log('Error reported successfully')
  } catch (err) {
    console.error('Failed to report error:', err)
    // Show error feedback
  } finally {
    reportingError.value = false
  }
}

// Report error to external service
async function reportErrorToService(err: Error): Promise<void> {
  if (!errorReporter) return

  const context: ErrorContext = {
    componentName: componentName.value,
    errorId: errorId.value,
    timestamp: errorTimestamp.value,
    userAgent: navigator.userAgent,
    url: window.location.href,
    // Add user/session info if available
    userId: undefined, // Get from auth store
    sessionId: undefined // Get from session store
  }

  await errorReporter.reportError(err, context)
}

function toggleDetails() {
  showDetails.value = !showDetails.value
}

// Provide error boundary context for child components
provide('errorBoundary', {
  reportError: (err: Error, component: string) => {
    hasError.value = true
    error.value = err
    componentName.value = component
    errorTimestamp.value = new Date().toISOString()
    errorId.value = generateErrorId()
  }
})
</script>

<style scoped>
.error-boundary {
  width: 100%;
}

.error-details {
  font-family: monospace;
  font-size: 0.875rem;
  background: rgba(var(--v-theme-surface-variant), 0.3);
  padding: 1rem;
  border-radius: 4px;
  margin-top: 0.5rem;
}

.error-stack {
  background: rgba(var(--v-theme-error), 0.1);
  padding: 0.5rem;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.75rem;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid rgba(var(--v-theme-error), 0.2);
}

/* Responsive design */
@media (max-width: 600px) {
  .error-boundary .v-alert {
    margin: 1rem;
  }

  .error-details {
    font-size: 0.75rem;
  }

  .error-stack {
    font-size: 0.7rem;
  }
}
</style>