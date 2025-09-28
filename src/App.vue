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
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from 'vuetify'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
const theme = useTheme()

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
