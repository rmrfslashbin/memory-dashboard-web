import { config } from '@vue/test-utils'

// Mock global objects that might be used in components
global.URL.createObjectURL = vi.fn(() => 'mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
global.localStorage = localStorageMock as any

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1
})) as any

// Mock performance.now for timing tests
global.performance.now = vi.fn(() => Date.now())

// Mock requestAnimationFrame for Three.js
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16))
global.cancelAnimationFrame = vi.fn()

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Configure Vue Test Utils
config.global.stubs = {
  transition: false,
  'transition-group': false,
  'v-btn': true,
  'v-card': true,
  'v-icon': true
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}