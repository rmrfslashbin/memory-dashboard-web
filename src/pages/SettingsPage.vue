<template>
  <v-card>
    <v-card-title>
      <v-icon class="mr-2">mdi-cog</v-icon>
      Settings
    </v-card-title>

    <v-card-text>
      <v-row>
        <!-- Theme Settings -->
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title>Appearance</v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>Theme</v-list-item-title>
                  <template v-slot:append>
                    <v-btn-toggle
                      v-model="appStore.theme"
                      mandatory
                      density="compact"
                      @update:model-value="updateTheme"
                    >
                      <v-btn value="light" size="small">
                        <v-icon>mdi-weather-sunny</v-icon>
                        Light
                      </v-btn>
                      <v-btn value="dark" size="small">
                        <v-icon>mdi-weather-night</v-icon>
                        Dark
                      </v-btn>
                    </v-btn-toggle>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- API Settings -->
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title>API Connection</v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>API URL</v-list-item-title>
                  <v-list-item-subtitle>{{ appStore.apiUrl }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Status</v-list-item-title>
                  <template v-slot:append>
                    <v-chip :color="appStore.isConnected ? 'success' : 'error'" size="small">
                      {{ appStore.isConnected ? 'Connected' : 'Disconnected' }}
                    </v-chip>
                  </template>
                </v-list-item>
              </v-list>

              <v-alert type="info" variant="tonal" class="mt-4">
                To change the API URL, update the <code>VITE_API_BASE_URL</code> environment variable and restart the development server.
              </v-alert>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- About -->
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-title>About</v-card-title>
            <v-card-text>
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>Application</v-list-item-title>
                  <v-list-item-subtitle>Memory Dashboard</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Version</v-list-item-title>
                  <v-list-item-subtitle>v2025.09.0</v-list-item-subtitle>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Framework</v-list-item-title>
                  <v-list-item-subtitle>Vue 3 + Vuetify 3</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import { useTheme } from 'vuetify'

const appStore = useAppStore()
const theme = useTheme()

function updateTheme(newTheme: 'light' | 'dark') {
  theme.global.name.value = newTheme
}
</script>