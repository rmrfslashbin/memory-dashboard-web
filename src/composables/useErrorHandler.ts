import { ref, computed } from 'vue'
import type { ErrorReporter, ErrorContext } from '@/components/ErrorBoundary.vue'

export interface AppError {
  id: string
  message: string
  type: ErrorType
  timestamp: Date
  details?: any
  component?: string
  action?: string
  recoverable: boolean
  userMessage: string
  technicalMessage: string
  stack?: string
}

export type ErrorType =
  | 'network'
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'server_error'
  | 'client_error'
  | 'timeout'
  | 'rate_limit'
  | 'unknown'

interface ErrorHandlerConfig {
  maxRetries: number
  retryDelay: number
  enableErrorReporting: boolean
  enableUserNotifications: boolean
  logLevel: 'error' | 'warn' | 'info' | 'debug'
}

// Global error state
const errors = ref<AppError[]>([])
const isOnline = ref(navigator.onLine)
const config = ref<ErrorHandlerConfig>({
  maxRetries: 3,
  retryDelay: 1000,
  enableErrorReporting: true,
  enableUserNotifications: true,
  logLevel: 'error'
})

// Network status monitoring
window.addEventListener('online', () => { isOnline.value = true })
window.addEventListener('offline', () => { isOnline.value = false })

export function useErrorHandler() {
  // Computed properties
  const hasErrors = computed(() => errors.value.length > 0)
  const criticalErrors = computed(() =>
    errors.value.filter(err => !err.recoverable)
  )
  const recentErrors = computed(() =>
    errors.value.slice(-10).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  )

  // Error creation and classification
  function createAppError(
    error: Error | string,
    type: ErrorType = 'unknown',
    context?: Partial<AppError>
  ): AppError {
    const errorMessage = typeof error === 'string' ? error : error.message
    const stack = typeof error === 'object' ? error.stack : undefined

    const appError: AppError = {
      id: generateErrorId(),
      message: errorMessage,
      type,
      timestamp: new Date(),
      recoverable: isRecoverableError(type),
      userMessage: getUserMessage(type, errorMessage),
      technicalMessage: errorMessage,
      stack,
      ...context
    }

    return appError
  }

  function classifyError(error: Error | any): ErrorType {
    const message = error?.message?.toLowerCase() || ''
    const status = error?.status || error?.response?.status

    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      error?.name === 'NetworkError' ||
      !isOnline.value
    ) {
      return 'network'
    }

    // HTTP status codes
    if (status) {
      if (status === 401) return 'authentication'
      if (status === 403) return 'authorization'
      if (status === 404) return 'not_found'
      if (status === 408 || status === 504) return 'timeout'
      if (status === 429) return 'rate_limit'
      if (status >= 500) return 'server_error'
      if (status >= 400) return 'client_error'
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid')) {
      return 'validation'
    }

    return 'unknown'
  }

  function isRecoverableError(type: ErrorType): boolean {
    const recoverableTypes: ErrorType[] = [
      'network',
      'timeout',
      'rate_limit',
      'server_error'
    ]
    return recoverableTypes.includes(type)
  }

  function getUserMessage(type: ErrorType, technicalMessage: string): string {
    const messages: Record<ErrorType, string> = {
      network: 'Unable to connect to the server. Please check your internet connection and try again.',
      validation: 'Please check your input and try again.',
      authentication: 'Please log in to continue.',
      authorization: 'You don\'t have permission to perform this action.',
      not_found: 'The requested resource was not found.',
      server_error: 'A server error occurred. Please try again later.',
      client_error: 'There was an issue with your request. Please check your input and try again.',
      timeout: 'The request timed out. Please try again.',
      rate_limit: 'Too many requests. Please wait a moment and try again.',
      unknown: 'An unexpected error occurred. Please try again.'
    }

    return messages[type] || messages.unknown
  }

  // Error handling and recovery
  async function handleError(
    error: Error | string,
    context?: {
      component?: string
      action?: string
      data?: any
      retry?: () => Promise<any>
    }
  ): Promise<AppError> {
    const errorType = typeof error === 'object' ? classifyError(error) : 'unknown'

    const appError = createAppError(error, errorType, {
      component: context?.component,
      action: context?.action,
      details: context?.data
    })

    // Add to error list
    errors.value.push(appError)

    // Log error
    logError(appError)

    // Attempt recovery for recoverable errors
    if (appError.recoverable && context?.retry) {
      await attemptRecovery(appError, context.retry)
    }

    // Report error if enabled
    if (config.value.enableErrorReporting) {
      reportError(appError).catch(console.warn)
    }

    return appError
  }

  async function attemptRecovery(
    error: AppError,
    retryFn: () => Promise<any>
  ): Promise<boolean> {
    let attempts = 0

    while (attempts < config.value.maxRetries) {
      attempts++

      try {
        // Wait before retry
        if (attempts > 1) {
          await new Promise(resolve =>
            setTimeout(resolve, config.value.retryDelay * attempts)
          )
        }

        // Network-specific recovery
        if (error.type === 'network' && !isOnline.value) {
          // Wait for network to come back online
          await waitForOnline()
        }

        // Attempt retry
        await retryFn()

        // Success - remove error
        clearError(error.id)
        console.log(`Recovered from error: ${error.message}`)
        return true

      } catch (retryError) {
        console.warn(`Retry attempt ${attempts} failed:`, retryError)

        if (attempts === config.value.maxRetries) {
          // Final attempt failed - mark as non-recoverable
          error.recoverable = false
          console.error(`Failed to recover from error after ${attempts} attempts:`, error)
        }
      }
    }

    return false
  }

  function waitForOnline(timeout = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (isOnline.value) {
        resolve()
        return
      }

      const timeoutId = setTimeout(() => {
        cleanup()
        reject(new Error('Network timeout'))
      }, timeout)

      const handleOnline = () => {
        cleanup()
        resolve()
      }

      const cleanup = () => {
        clearTimeout(timeoutId)
        window.removeEventListener('online', handleOnline)
      }

      window.addEventListener('online', handleOnline)
    })
  }

  // Error management
  function clearError(errorId: string) {
    const index = errors.value.findIndex(err => err.id === errorId)
    if (index !== -1) {
      errors.value.splice(index, 1)
    }
  }

  function clearAllErrors() {
    errors.value.length = 0
  }

  function clearErrorsByType(type: ErrorType) {
    errors.value = errors.value.filter(err => err.type !== type)
  }

  // Logging
  function logError(error: AppError) {
    const logData = {
      id: error.id,
      message: error.message,
      type: error.type,
      component: error.component,
      action: error.action,
      timestamp: error.timestamp.toISOString(),
      stack: error.stack,
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    switch (config.value.logLevel) {
      case 'error':
        console.error('App Error:', logData)
        break
      case 'warn':
        console.warn('App Error:', logData)
        break
      case 'info':
        console.info('App Error:', logData)
        break
      case 'debug':
        console.debug('App Error:', logData)
        break
    }
  }

  // Error reporting
  async function reportError(error: AppError): Promise<void> {
    try {
      // In a real application, you would send this to an error reporting service
      // like Sentry, Bugsnag, or your own error tracking API

      const payload = {
        id: error.id,
        message: error.message,
        type: error.type,
        timestamp: error.timestamp.toISOString(),
        component: error.component,
        action: error.action,
        stack: error.stack,
        details: error.details,
        context: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
          sessionId: getSessionId(),
          userId: getUserId()
        }
      }

      // Mock API call - replace with real error reporting service
      console.log('Reporting error to service:', payload)

      // Example: await fetch('/api/errors', { method: 'POST', body: JSON.stringify(payload) })

    } catch (reportingError) {
      console.warn('Failed to report error:', reportingError)
    }
  }

  // Utility functions
  function generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  function getSessionId(): string {
    // Implement session ID retrieval
    return sessionStorage.getItem('sessionId') || 'unknown'
  }

  function getUserId(): string | undefined {
    // Implement user ID retrieval from auth store
    return undefined // Replace with actual user ID
  }

  // Configuration
  function updateConfig(newConfig: Partial<ErrorHandlerConfig>) {
    config.value = { ...config.value, ...newConfig }
  }

  // Error reporter implementation for ErrorBoundary
  const errorReporter: ErrorReporter = {
    async reportError(error: Error, context: ErrorContext): Promise<void> {
      const appError = createAppError(error, 'unknown', {
        component: context.componentName,
        details: context
      })

      await reportError(appError)
    }
  }

  return {
    // State
    errors,
    hasErrors,
    criticalErrors,
    recentErrors,
    isOnline,
    config,

    // Methods
    handleError,
    createAppError,
    classifyError,
    clearError,
    clearAllErrors,
    clearErrorsByType,
    updateConfig,
    attemptRecovery,
    reportError,
    errorReporter
  }
}

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const { handleError } = useErrorHandler()

  handleError(event.reason || new Error('Unhandled promise rejection'), {
    component: 'Global',
    action: 'unhandledrejection'
  })
})

// Global error handler for uncaught exceptions
window.addEventListener('error', (event) => {
  const { handleError } = useErrorHandler()

  handleError(event.error || new Error(event.message), {
    component: 'Global',
    action: 'uncaughtexception'
  })
})