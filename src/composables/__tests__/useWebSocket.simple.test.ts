import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWebSocket } from '../useWebSocket'

describe('useWebSocket (simple)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with disconnected status', () => {
    const { connectionStatus } = useWebSocket()
    expect(connectionStatus.value).toBe('disconnected')
  })

  it('should register and unregister message handlers', () => {
    const { onMessage, offMessage } = useWebSocket()
    const mockHandler = vi.fn()

    // Should not throw when registering
    expect(() => onMessage('test_type', mockHandler)).not.toThrow()

    // Should not throw when unregistering
    expect(() => offMessage('test_type')).not.toThrow()
  })

  it('should handle sendMessage when disconnected', () => {
    const { sendMessage } = useWebSocket()

    // Should not throw when trying to send while disconnected (should be defensive)
    expect(() => sendMessage('test_type', { data: 'test' })).not.toThrow()
  })

  it('should disconnect cleanly', () => {
    const { disconnect, connectionStatus } = useWebSocket()

    // Should not throw when disconnecting
    expect(() => disconnect()).not.toThrow()
    expect(connectionStatus.value).toBe('disconnected')
  })

  it('should handle multiple message handlers', () => {
    const { onMessage, offMessage } = useWebSocket()
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    onMessage('type1', handler1)
    onMessage('type2', handler2)

    // Should be able to remove individual handlers
    offMessage('type1')

    // Should not throw
    expect(() => offMessage('type2')).not.toThrow()
  })
})