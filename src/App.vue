<template>
  <v-app>
    <v-app-bar
      elevation="0"
      border="b"
      density="compact"
    >
      <v-app-bar-nav-icon @click="toggleDrawer" />
      <v-toolbar-title class="text-h6 font-weight-bold">
        Memory Dashboard
      </v-toolbar-title>
      <v-spacer />

      <!-- Connection Status -->
      <v-chip
        :color="connectionColor"
        :prepend-icon="connectionIcon"
        size="small"
        class="mr-2"
      >
        {{ connectionStatus }}
      </v-chip>

      <!-- Theme Toggle -->
      <v-btn
        :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        @click="toggleTheme"
      />
    </v-app-bar>

    <!-- Navigation Drawer -->
    <v-navigation-drawer
      v-model="drawer"
      temporary
    >
      <v-list nav>
        <v-list-item
          v-for="item in navigationItems"
          :key="item.name"
          :to="item.to"
          :prepend-icon="item.icon"
          :title="item.title"
        />
      </v-list>
    </v-navigation-drawer>

    <!-- Main Content -->
    <v-main>
      <v-container fluid>
        <!-- Global Error Boundary -->
        <ErrorBoundary
          :allow-retry="true"
          :allow-report-error="true"
          @retry="handleGlobalRetry"
        >
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </ErrorBoundary>
      </v-container>
    </v-main>

    <!-- Global Error Notifications -->
    <ErrorNotification
      v-for="error in recentErrors"
      :key="error.id"
      :error="error"
      :timeout="getNotificationTimeout(error)"
      @dismiss="clearError(error.id)"
      @retry="handleErrorRetry(error)"
    />
  </v-app>
</template>

<script setup lang="ts">
import { computed, provide, onMounted } from 'vue'
import { useTheme } from 'vuetify'
import { useAppStore } from '@/stores/app'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { ErrorReporterKey } from '@/types/errors'
import { memoryAPI } from '@/utils/memory-api'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import ErrorNotification from '@/components/ErrorNotification.vue'

const appStore = useAppStore()
const theme = useTheme()
const { recentErrors, clearError, errorReporter } = useErrorHandler()

// Provide error reporter for ErrorBoundary
provide(ErrorReporterKey, errorReporter)

// Check API connection on mount
onMounted(async () => {
  appStore.setConnectionStatus('connecting')
  try {
    const response = await memoryAPI.healthCheck()
    if (response.success) {
      appStore.setConnectionStatus('connected')
      console.log('Connected to Memory API:', appStore.apiUrl)
    } else {
      appStore.setConnectionStatus('disconnected')
      console.warn('Failed to connect to Memory API:', response.error)
    }
  } catch (error) {
    appStore.setConnectionStatus('disconnected')
    console.error('Error connecting to Memory API:', error)
  }
})

const navigationItems = [
  { name: 'Dashboard', title: 'Dashboard', icon: 'mdi-view-dashboard', to: '/' },
  { name: 'Collections', title: 'Collections', icon: 'mdi-folder-multiple', to: '/collections' },
  { name: 'Search', title: 'Search', icon: 'mdi-magnify', to: '/search' },
  { name: 'Playground', title: 'Playground', icon: 'mdi-code-braces', to: '/playground' },
  { name: 'Metrics', title: 'Metrics', icon: 'mdi-chart-line', to: '/metrics' },
  { name: 'Settings', title: 'Settings', icon: 'mdi-cog', to: '/settings' },
]

const drawer = computed({
  get: () => appStore.drawer,
  set: (value) => appStore.drawer = value
})

const isDark = computed(() => appStore.isDark)
const connectionStatus = computed(() => appStore.connectionStatus)

const connectionColor = computed(() => {
  switch (appStore.connectionStatus) {
    case 'connected': return 'success'
    case 'connecting': return 'warning'
    case 'disconnected': return 'error'
    default: return 'grey'
  }
})

const connectionIcon = computed(() => {
  switch (appStore.connectionStatus) {
    case 'connected': return 'mdi-check-circle'
    case 'connecting': return 'mdi-loading mdi-spin'
    case 'disconnected': return 'mdi-alert-circle'
    default: return 'mdi-help-circle'
  }
})

function toggleDrawer() {
  appStore.toggleDrawer()
}

function toggleTheme() {
  appStore.toggleTheme()
  theme.global.name.value = appStore.theme
}

// Error handling functions
function handleGlobalRetry() {
  console.log('Global retry triggered')
  // Force refresh of the current route
  window.location.reload()
}

function getNotificationTimeout(error: any): number {
  // Longer timeout for critical errors
  if (!error.recoverable) return 15000

  // Variable timeout based on error type
  const timeouts = {
    network: 12000,
    validation: 6000,
    authentication: 10000,
    authorization: 10000,
    not_found: 8000,
    server_error: 15000,
    client_error: 8000,
    timeout: 10000,
    rate_limit: 12000,
    unknown: 8000
  }

  return timeouts[error.type] || 8000
}

async function handleErrorRetry(error: any) {
  console.log('Retrying error:', error.id)
  // This would typically trigger a retry of the original failed action
  // The specific implementation depends on how the error was originally handled
}
</script>

<style scoped lang="scss">
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
