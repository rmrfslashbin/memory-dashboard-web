import { ref, onUnmounted } from 'vue'

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting'

interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
}

export function useWebSocket() {
  const connectionStatus = ref<ConnectionStatus>('disconnected')
  const ws = ref<WebSocket | null>(null)
  const reconnectAttempts = ref(0)
  const maxReconnectAttempts = 5

  function connectWebSocket() {
    if (ws.value?.readyState === WebSocket.OPEN) return

    connectionStatus.value = 'connecting'

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.hostname}:8080/ws`

      ws.value = new WebSocket(wsUrl)

      ws.value.onopen = () => {
        console.log('📱 WebSocket connected')
        connectionStatus.value = 'connected'
        reconnectAttempts.value = 0
      }

      ws.value.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          handleWebSocketMessage(message)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.value.onclose = () => {
        console.log('📱 WebSocket disconnected')
        connectionStatus.value = 'disconnected'

        // Attempt to reconnect
        if (reconnectAttempts.value < maxReconnectAttempts) {
          reconnectAttempts.value++
          console.log(`🔄 Attempting to reconnect (${reconnectAttempts.value}/${maxReconnectAttempts})`)
          setTimeout(connectWebSocket, 2000 * reconnectAttempts.value)
        }
      }

      ws.value.onerror = (error) => {
        console.error('WebSocket error:', error)
        connectionStatus.value = 'disconnected'
      }

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error)
      connectionStatus.value = 'disconnected'
    }
  }

  function sendMessage(type: string, data: any) {
    if (ws.value?.readyState === WebSocket.OPEN && ws.value.send) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: new Date().toISOString()
      }
      try {
        ws.value.send(JSON.stringify(message))
      } catch (error) {
        console.error('Failed to send WebSocket message:', error)
      }
    }
  }

  const messageHandlers = ref<Map<string, (data: any) => void>>(new Map())

  function handleWebSocketMessage(message: WebSocketMessage) {
    // Check for registered handlers first
    const handler = messageHandlers.value.get(message.type)
    if (handler) {
      handler(message.data)
      return
    }

    // Default handlers
    switch (message.type) {
      case 'welcome':
        console.log('👋 Received welcome message:', message.data)
        break

      case 'metrics':
        console.log('📊 Received metrics:', message.data)
        break

      case 'search_broadcast':
      case 'search_share':
        console.log('🔍 Collaborative search:', message.data)
        break

      case 'user_join':
        console.log('👋 User joined:', message.data)
        break

      case 'user_leave':
        console.log('👋 User left:', message.data)
        break

      case 'user_update':
        console.log('👤 User updated:', message.data)
        break

      case 'template_share':
        console.log('📋 Template shared:', message.data)
        break

      case 'realtime_results':
        console.log('⚡ Real-time results:', message.data)
        break

      default:
        console.log('📨 Received message:', message)
    }
  }

  function onMessage(type: string, handler: (data: any) => void) {
    messageHandlers.value.set(type, handler)
  }

  function offMessage(type: string) {
    messageHandlers.value.delete(type)
  }

  function disconnect() {
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    connectionStatus.value = 'disconnected'
  }

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect()
  })

  return {
    connectionStatus,
    connectWebSocket,
    sendMessage,
    disconnect,
    onMessage,
    offMessage
  }
}