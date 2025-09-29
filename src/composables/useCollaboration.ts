import { ref, reactive, computed } from 'vue'
import { useWebSocket } from './useWebSocket'

export interface CollaborativeUser {
  id: string
  name: string
  avatar?: string
  color: string
  lastActivity: Date
  isTyping: boolean
  currentQuery?: string
  currentCollections?: string[]
}

export interface CollaborativeSearch {
  id: string
  userId: string
  userName: string
  query: string
  collections: string[]
  resultCount: number
  timestamp: Date
  shared: boolean
}

export interface ActivityItem {
  id: string
  type: 'search' | 'join' | 'leave' | 'template_share' | 'collection_update'
  userId: string
  userName: string
  data: any
  timestamp: Date
}

const STORAGE_KEY = 'memory-collaboration-settings'

export function useCollaboration() {
  const { connectionStatus, sendMessage, onMessage, offMessage } = useWebSocket()

  // Current user
  const currentUser = ref<CollaborativeUser | null>(null)

  // Connected users
  const connectedUsers = ref<Map<string, CollaborativeUser>>(new Map())

  // Collaborative searches
  const collaborativeSearches = ref<CollaborativeSearch[]>([])

  // Activity feed
  const activityFeed = ref<ActivityItem[]>([])

  // User preferences
  const collaborationSettings = reactive({
    userName: '',
    userColor: '#2196F3',
    shareSearches: true,
    showActivityFeed: true,
    enableNotifications: true,
    autoJoinRooms: true
  })

  // Typing indicators
  const typingUsers = computed(() =>
    Array.from(connectedUsers.value.values()).filter(user => user.isTyping && user.id !== currentUser.value?.id)
  )

  // Recent collaborative searches
  const recentCollaborativeSearches = computed(() =>
    collaborativeSearches.value
      .slice()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)
  )

  // Active users count
  const activeUsersCount = computed(() => connectedUsers.value.size)

  // Load settings from localStorage
  function loadSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        Object.assign(collaborationSettings, parsed)
      }
    } catch (error) {
      console.error('Failed to load collaboration settings:', error)
    }
  }

  // Save settings to localStorage
  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collaborationSettings))
    } catch (error) {
      console.error('Failed to save collaboration settings:', error)
    }
  }

  // Initialize user session
  function initializeUser() {
    if (!collaborationSettings.userName) {
      collaborationSettings.userName = `User${Math.floor(Math.random() * 1000)}`
      saveSettings()
    }

    currentUser.value = {
      id: generateUserId(),
      name: collaborationSettings.userName,
      color: collaborationSettings.userColor,
      lastActivity: new Date(),
      isTyping: false
    }

    // Announce user joining
    if (connectionStatus.value === 'connected') {
      sendMessage('user_join', {
        user: currentUser.value,
        settings: collaborationSettings
      })
    }
  }

  // Handle user updates
  function updateUser(updates: Partial<CollaborativeUser>) {
    if (currentUser.value) {
      Object.assign(currentUser.value, updates)
      currentUser.value.lastActivity = new Date()

      // Broadcast user updates
      if (connectionStatus.value === 'connected') {
        sendMessage('user_update', {
          userId: currentUser.value.id,
          updates
        })
      }
    }
  }

  // Handle search sharing
  function shareSearch(searchData: {
    query: string
    collections: string[]
    resultCount: number
    options?: any
  }) {
    if (!currentUser.value || !collaborationSettings.shareSearches) return

    const collaborativeSearch: CollaborativeSearch = {
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: currentUser.value.id,
      userName: currentUser.value.name,
      query: searchData.query,
      collections: searchData.collections,
      resultCount: searchData.resultCount,
      timestamp: new Date(),
      shared: true
    }

    collaborativeSearches.value.unshift(collaborativeSearch)

    // Broadcast search
    if (connectionStatus.value === 'connected') {
      sendMessage('search_share', collaborativeSearch)
    }

    // Add to activity feed
    addActivity('search', currentUser.value.id, currentUser.value.name, {
      query: searchData.query,
      resultCount: searchData.resultCount,
      collections: searchData.collections
    })
  }

  // Handle template sharing
  function shareTemplate(template: any) {
    if (!currentUser.value) return

    if (connectionStatus.value === 'connected') {
      sendMessage('template_share', {
        template,
        sharedBy: currentUser.value
      })
    }

    addActivity('template_share', currentUser.value.id, currentUser.value.name, {
      templateName: template.name,
      templateCategory: template.category
    })
  }

  // Typing indicators
  function startTyping(query: string) {
    if (!currentUser.value) return

    updateUser({
      isTyping: true,
      currentQuery: query
    })

    // Clear typing after delay
    setTimeout(() => {
      if (currentUser.value) {
        updateUser({ isTyping: false })
      }
    }, 3000)
  }

  function stopTyping() {
    if (!currentUser.value) return
    updateUser({ isTyping: false })
  }

  // Collection updates
  function shareCollectionUpdate(collections: string[]) {
    if (!currentUser.value) return

    updateUser({ currentCollections: collections })

    addActivity('collection_update', currentUser.value.id, currentUser.value.name, {
      collections
    })
  }

  // Activity management
  function addActivity(type: ActivityItem['type'], userId: string, userName: string, data: any) {
    const activity: ActivityItem = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      userId,
      userName,
      data,
      timestamp: new Date()
    }

    activityFeed.value.unshift(activity)

    // Limit activity feed size
    if (activityFeed.value.length > 100) {
      activityFeed.value = activityFeed.value.slice(0, 100)
    }
  }

  // WebSocket message handlers
  function handleUserJoin(userData: any) {
    const user: CollaborativeUser = {
      ...userData.user,
      lastActivity: new Date(userData.user.lastActivity)
    }

    connectedUsers.value.set(user.id, user)
    addActivity('join', user.id, user.name, {})

    if (collaborationSettings.enableNotifications) {
      showNotification(`${user.name} joined the session`, 'info')
    }
  }

  function handleUserLeave(userData: any) {
    const user = connectedUsers.value.get(userData.userId)
    if (user) {
      connectedUsers.value.delete(userData.userId)
      addActivity('leave', user.id, user.name, {})

      if (collaborationSettings.enableNotifications) {
        showNotification(`${user.name} left the session`, 'warning')
      }
    }
  }

  function handleUserUpdate(userData: any) {
    const user = connectedUsers.value.get(userData.userId)
    if (user) {
      Object.assign(user, userData.updates)
      user.lastActivity = new Date()
    }
  }

  function handleSharedSearch(searchData: CollaborativeSearch) {
    // Don't add our own searches
    if (currentUser.value && searchData.userId === currentUser.value.id) return

    collaborativeSearches.value.unshift({
      ...searchData,
      timestamp: new Date(searchData.timestamp)
    })

    if (collaborationSettings.enableNotifications) {
      showNotification(`${searchData.userName} shared a search: ${searchData.query}`, 'success')
    }
  }

  function handleSharedTemplate(templateData: any) {
    if (collaborationSettings.enableNotifications) {
      showNotification(`${templateData.sharedBy.name} shared template: ${templateData.template.name}`, 'info')
    }
  }

  // Room management
  function joinRoom(roomId: string) {
    if (connectionStatus.value === 'connected') {
      sendMessage('join_room', { roomId })
    }
  }

  function leaveRoom(roomId: string) {
    if (connectionStatus.value === 'connected') {
      sendMessage('leave_room', { roomId })
    }
  }

  // Utility functions
  function generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  function showNotification(message: string, type: 'success' | 'info' | 'warning' | 'error') {
    // This would integrate with a notification system like vue-toastification
    console.log(`[${type.toUpperCase()}] ${message}`)
  }

  function getActivityIcon(type: ActivityItem['type']): string {
    const icons = {
      search: 'mdi-magnify',
      join: 'mdi-login',
      leave: 'mdi-logout',
      template_share: 'mdi-clipboard-text',
      collection_update: 'mdi-folder-multiple'
    }
    return icons[type] || 'mdi-information'
  }

  function getActivityColor(type: ActivityItem['type']): string {
    const colors = {
      search: 'primary',
      join: 'success',
      leave: 'warning',
      template_share: 'info',
      collection_update: 'secondary'
    }
    return colors[type] || 'grey'
  }

  // Clear old activity
  function clearOldActivity() {
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - 24) // Keep 24 hours

    activityFeed.value = activityFeed.value.filter(
      activity => activity.timestamp >= cutoff
    )
  }

  // Cleanup when leaving
  function cleanup() {
    if (currentUser.value && connectionStatus.value === 'connected') {
      sendMessage('user_leave', {
        userId: currentUser.value.id
      })
    }

    cleanupMessageHandlers()
    currentUser.value = null
    connectedUsers.value.clear()
    collaborativeSearches.value = []
    activityFeed.value = []
  }

  // Initialize WebSocket message handlers
  function initializeMessageHandlers() {
    onMessage('user_join', handleUserJoin)
    onMessage('user_leave', handleUserLeave)
    onMessage('user_update', handleUserUpdate)
    onMessage('search_share', handleSharedSearch)
    onMessage('template_share', handleSharedTemplate)
  }

  // Cleanup message handlers
  function cleanupMessageHandlers() {
    offMessage('user_join')
    offMessage('user_leave')
    offMessage('user_update')
    offMessage('search_share')
    offMessage('template_share')
  }

  // Initialize
  loadSettings()
  initializeMessageHandlers()

  // Clean up old activity periodically
  setInterval(clearOldActivity, 60000) // Every minute

  return {
    // State
    currentUser,
    connectedUsers,
    collaborativeSearches,
    activityFeed,
    collaborationSettings,

    // Computed
    typingUsers,
    recentCollaborativeSearches,
    activeUsersCount,

    // Actions
    initializeUser,
    updateUser,
    shareSearch,
    shareTemplate,
    startTyping,
    stopTyping,
    shareCollectionUpdate,
    joinRoom,
    leaveRoom,
    cleanup,
    saveSettings,

    // Message handlers
    handleUserJoin,
    handleUserLeave,
    handleUserUpdate,
    handleSharedSearch,
    handleSharedTemplate,

    // Utilities
    getActivityIcon,
    getActivityColor
  }
}