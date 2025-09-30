import type { InjectionKey } from 'vue'

// Error reporting interface
export interface ErrorReporter {
  reportError(error: Error, context: ErrorContext): Promise<void>
}

export interface ErrorContext {
  componentName: string
  errorId: string
  timestamp: string
  userAgent: string
  url: string
  userId?: string
  sessionId?: string
}

// Injection key for error reporter
export const ErrorReporterKey: InjectionKey<ErrorReporter> = Symbol('ErrorReporter')