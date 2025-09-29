import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWebSocket } from '../useWebSocket'

// Mock WebSocket
class MockWebSocket {
  readyState: number = WebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(public url: string) {}

  send = vi.fn()
  close = vi.fn()

  // Helper methods for testing
  mockOpen() {
    this.readyState = WebSocket.OPEN
    if (this.onopen) {
      this.onopen(new Event('open'))
    }
  }

  mockClose() {
    this.readyState = WebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'))
    }
  }

  mockMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }

  mockError() {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any

// Mock global location
Object.defineProperty(window, 'location', {
  value: {
    protocol: 'http:',
    hostname: 'localhost'
  },
  writable: true
})

describe('useWebSocket', () => {
  let mockWs: MockWebSocket

  beforeEach(() => {
    vi.clearAllMocks()
    mockWs = new MockWebSocket('ws://localhost:8080/ws')
  })

  it('should initialize with disconnected status', () => {
    const { connectionStatus } = useWebSocket()
    expect(connectionStatus.value).toBe('disconnected')
  })

  it('should connect to WebSocket and update status', () => {
    const { connectWebSocket, connectionStatus } = useWebSocket()

    connectWebSocket()

    expect(connectionStatus.value).toBe('connecting')

    // Simulate WebSocket open
    const wsInstance = MockWebSocket.prototype
    wsInstance.readyState = WebSocket.OPEN
    if (wsInstance.onopen) {
      wsInstance.onopen(new Event('open'))
    }

    expect(connectionStatus.value).toBe('connected')
  })

  it('should not connect if already connected', () => {
    const { connectWebSocket } = useWebSocket()

    const constructorSpy = vi.spyOn(global, 'WebSocket')

    // First connection
    connectWebSocket()
    expect(constructorSpy).toHaveBeenCalledTimes(1)

    // Simulate connection established
    mockWs.readyState = WebSocket.OPEN

    // Second connection attempt should be ignored
    connectWebSocket()
    expect(constructorSpy).toHaveBeenCalledTimes(1) // Still only called once
  })

  it('should send messages when connected', () => {
    const { connectWebSocket, sendMessage } = useWebSocket()

    connectWebSocket()
    mockWs.mockOpen()

    sendMessage('test_type', { data: 'test' })

    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'test_type',
        data: { data: 'test' },
        timestamp: expect.any(String)
      })
    )
  })

  it('should not send messages when disconnected', () => {
    const { sendMessage } = useWebSocket()

    sendMessage('test_type', { data: 'test' })

    expect(mockWs.send).not.toHaveBeenCalled()
  })

  it('should handle incoming messages', () => {
    const { connectWebSocket } = useWebSocket()
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    connectWebSocket()
    mockWs.mockOpen()

    const testMessage = {
      type: 'welcome',
      data: { message: 'Hello' },
      timestamp: new Date().toISOString()
    }

    mockWs.mockMessage(testMessage)

    expect(consoleSpy).toHaveBeenCalledWith('👋 Received welcome message:', { message: 'Hello' })

    consoleSpy.mockRestore()
  })

  it('should register custom message handlers', () => {
    const { connectWebSocket, onMessage } = useWebSocket()
    const mockHandler = vi.fn()

    onMessage('custom_type', mockHandler)

    connectWebSocket()
    mockWs.mockOpen()

    const testMessage = {
      type: 'custom_type',
      data: { custom: 'data' },
      timestamp: new Date().toISOString()
    }

    mockWs.mockMessage(testMessage)

    expect(mockHandler).toHaveBeenCalledWith({ custom: 'data' })
  })

  it('should unregister message handlers', () => {
    const { connectWebSocket, onMessage, offMessage } = useWebSocket()
    const mockHandler = vi.fn()

    onMessage('custom_type', mockHandler)
    offMessage('custom_type')

    connectWebSocket()
    mockWs.mockOpen()

    const testMessage = {
      type: 'custom_type',
      data: { custom: 'data' },
      timestamp: new Date().toISOString()
    }

    mockWs.mockMessage(testMessage)

    expect(mockHandler).not.toHaveBeenCalled()
  })

  it('should handle different message types', () => {
    const { connectWebSocket } = useWebSocket()
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    connectWebSocket()
    mockWs.mockOpen()

    // Test metrics message
    mockWs.mockMessage({
      type: 'metrics',
      data: { cpu: 50 },
      timestamp: new Date().toISOString()
    })

    expect(consoleSpy).toHaveBeenCalledWith('📊 Received metrics:', { cpu: 50 })

    // Test search_share message
    mockWs.mockMessage({
      type: 'search_share',
      data: { query: 'test' },
      timestamp: new Date().toISOString()
    })

    expect(consoleSpy).toHaveBeenCalledWith('🔍 Collaborative search:', { query: 'test' })

    // Test user_join message
    mockWs.mockMessage({
      type: 'user_join',
      data: { user: 'test_user' },
      timestamp: new Date().toISOString()
    })

    expect(consoleSpy).toHaveBeenCalledWith('👋 User joined:', { user: 'test_user' })

    consoleSpy.mockRestore()
  })

  it('should handle connection errors', () => {
    const { connectWebSocket, connectionStatus } = useWebSocket()

    connectWebSocket()
    mockWs.mockError()

    expect(connectionStatus.value).toBe('disconnected')
  })

  it('should handle connection close and attempt reconnection', () => {
    vi.useFakeTimers()

    const { connectWebSocket, connectionStatus } = useWebSocket()
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    connectWebSocket()
    mockWs.mockOpen()

    expect(connectionStatus.value).toBe('connected')

    // Simulate connection close
    mockWs.mockClose()

    expect(connectionStatus.value).toBe('disconnected')
    expect(consoleSpy).toHaveBeenCalledWith('📱 WebSocket disconnected')

    // Should attempt reconnection
    expect(consoleSpy).toHaveBeenCalledWith('🔄 Attempting to reconnect (1/5)')

    vi.useRealTimers()
    consoleSpy.mockRestore()
  })

  it('should disconnect manually', () => {
    const { connectWebSocket, disconnect, connectionStatus } = useWebSocket()

    connectWebSocket()
    mockWs.mockOpen()

    expect(connectionStatus.value).toBe('connected')

    disconnect()

    expect(mockWs.close).toHaveBeenCalled()
    expect(connectionStatus.value).toBe('disconnected')
  })

  it('should use correct WebSocket URL based on protocol', () => {
    const constructorSpy = vi.spyOn(global, 'WebSocket')
    const { connectWebSocket } = useWebSocket()

    // Test HTTP
    window.location.protocol = 'http:'
    connectWebSocket()
    expect(constructorSpy).toHaveBeenCalledWith('ws://localhost:8080/ws')

    // Test HTTPS
    window.location.protocol = 'https:'
    connectWebSocket()
    expect(constructorSpy).toHaveBeenCalledWith('wss://localhost:8080/ws')
  })

  it('should handle malformed JSON messages gracefully', () => {
    const { connectWebSocket } = useWebSocket()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    connectWebSocket()
    mockWs.mockOpen()

    // Send malformed JSON
    if (mockWs.onmessage) {
      mockWs.onmessage(new MessageEvent('message', { data: 'invalid json' }))
    }

    expect(consoleSpy).toHaveBeenCalledWith('Error parsing WebSocket message:', expect.any(Error))

    consoleSpy.mockRestore()
  })

  it('should stop reconnection after max attempts', () => {
    vi.useFakeTimers()

    const { connectWebSocket } = useWebSocket()
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    connectWebSocket()

    // Simulate multiple failed connections
    for (let i = 1; i <= 6; i++) {
      mockWs.mockClose()

      if (i <= 5) {
        expect(consoleSpy).toHaveBeenCalledWith(`🔄 Attempting to reconnect (${i}/5)`)
      }

      // Fast forward timers to trigger reconnection
      if (i < 5) {
        vi.advanceTimersByTime(2000 * i)
      }
    }

    // After 5 attempts, should not try to reconnect again
    const reconnectCalls = consoleSpy.mock.calls.filter(call =>
      call[0].includes('Attempting to reconnect')
    )
    expect(reconnectCalls).toHaveLength(5)

    vi.useRealTimers()
    consoleSpy.mockRestore()
  })

  it('should reset reconnection attempts on successful connection', () => {
    const { connectWebSocket } = useWebSocket()

    connectWebSocket()

    // Simulate failed connection
    mockWs.mockClose()

    // Simulate successful reconnection
    mockWs.mockOpen()

    // The reconnection counter should be reset (tested indirectly by checking console)
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Another close should start from attempt 1 again
    mockWs.mockClose()
    expect(consoleSpy).toHaveBeenCalledWith('🔄 Attempting to reconnect (1/5)')

    consoleSpy.mockRestore()
  })
})