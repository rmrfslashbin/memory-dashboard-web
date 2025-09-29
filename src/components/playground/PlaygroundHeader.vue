<template>
  <v-card class="mb-6">
    <v-card-text>
      <div class="d-flex justify-space-between align-center">
        <div>
          <v-breadcrumbs
            :items="breadcrumbs"
            class="pa-0"
          >
            <template v-slot:item="{ item }">
              <v-breadcrumbs-item
                :href="item.href"
                :disabled="item.disabled"
              >
                {{ item.title }}
              </v-breadcrumbs-item>
            </template>
          </v-breadcrumbs>
          <h1 class="text-h4 mt-2">
            <v-icon class="mr-2">mdi-magnify</v-icon>
            Search Playground
          </h1>
        </div>

        <!-- Connection Status -->
        <div class="text-right">
          <v-chip
            :color="connectionStatusColor"
            :prepend-icon="connectionStatusIcon"
            variant="flat"
            size="small"
          >
            {{ connectionStatusText }}
          </v-chip>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  connectionStatus: 'connected' | 'disconnected' | 'connecting'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  goBack: []
}>()

const breadcrumbs = computed(() => [
  {
    title: '← Back to Hub',
    href: '/',
    disabled: false
  },
  {
    title: 'Developer Dashboard',
    href: '/dashboard',
    disabled: false
  },
  {
    title: 'Search Playground',
    href: '#',
    disabled: true
  }
])

const connectionStatusColor = computed(() => {
  switch (props.connectionStatus) {
    case 'connected': return 'success'
    case 'connecting': return 'warning'
    case 'disconnected': return 'error'
    default: return 'grey'
  }
})

const connectionStatusIcon = computed(() => {
  switch (props.connectionStatus) {
    case 'connected': return 'mdi-wifi'
    case 'connecting': return 'mdi-wifi-sync'
    case 'disconnected': return 'mdi-wifi-off'
    default: return 'mdi-wifi-off'
  }
})

const connectionStatusText = computed(() => {
  switch (props.connectionStatus) {
    case 'connected': return 'Connected'
    case 'connecting': return 'Connecting...'
    case 'disconnected': return 'Disconnected'
    default: return 'Unknown'
  }
})
</script>