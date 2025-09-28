<template>
  <div>
    <v-card>
      <v-card-title class="text-h4">
        <v-icon class="mr-2">mdi-view-dashboard</v-icon>
        Memory System Dashboard
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-card class="memory-card">
              <v-card-title>System Status</v-card-title>
              <v-card-text>
                <v-chip :color="appStore.isConnected ? 'success' : 'error'">
                  {{ appStore.isConnected ? 'Connected' : 'Disconnected' }}
                </v-chip>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card class="memory-card">
              <v-card-title>API Endpoint</v-card-title>
              <v-card-text>
                <code class="memory-code">{{ appStore.apiUrl }}</code>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="4">
            <v-card class="memory-card">
              <v-card-title>Quick Actions</v-card-title>
              <v-card-actions>
                <v-btn
                  color="primary"
                  prepend-icon="mdi-magnify"
                  @click="$router.push('/search')"
                >
                  Search
                </v-btn>
                <v-btn
                  color="accent"
                  prepend-icon="mdi-folder-multiple"
                  @click="$router.push('/collections')"
                >
                  Collections
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <v-row class="mt-4">
          <v-col cols="12">
            <v-alert
              type="info"
              variant="tonal"
              prepend-icon="mdi-information"
            >
              <strong>Welcome to Memory Dashboard!</strong><br>
              This is a Vue 3 + Vuetify 3 web interface for the Memory System API.
              Use the navigation drawer to explore collections, search memories,
              and access the interactive playground.
            </v-alert>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
</script>