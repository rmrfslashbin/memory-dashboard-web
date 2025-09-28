import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  // State
  const drawer = ref(false)
  const theme = ref<'light' | 'dark'>('light')
  const loading = ref(false)
  const apiUrl = ref(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080')
  const connectionStatus = ref<'connected' | 'disconnected' | 'connecting'>('disconnected')

  // Getters
  const isDark = computed(() => theme.value === 'dark')
  const isConnected = computed(() => connectionStatus.value === 'connected')

  // Actions
  function toggleDrawer() {
    drawer.value = !drawer.value
  }

  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  function setLoading(value: boolean) {
    loading.value = value
  }

  function setApiUrl(url: string) {
    apiUrl.value = url
  }

  function setConnectionStatus(status: 'connected' | 'disconnected' | 'connecting') {
    connectionStatus.value = status
  }

  return {
    // State
    drawer,
    theme,
    loading,
    apiUrl,
    connectionStatus,
    // Getters
    isDark,
    isConnected,
    // Actions
    toggleDrawer,
    toggleTheme,
    setLoading,
    setApiUrl,
    setConnectionStatus,
  }
})