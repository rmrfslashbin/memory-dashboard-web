<template>
  <v-card class="mb-6">
    <v-card-title class="d-flex justify-space-between align-center">
      <span>Query History</span>
      <div class="d-flex gap-2">
        <v-btn
          variant="outlined"
          size="small"
          @click="$emit('clearHistory')"
          :disabled="history.length === 0"
        >
          Clear History
        </v-btn>
        <v-btn
          variant="outlined"
          size="small"
          @click="$emit('exportHistory')"
          :disabled="history.length === 0"
        >
          Export History
        </v-btn>
      </div>
    </v-card-title>

    <v-card-text>
      <div v-if="history.length === 0" class="text-center py-8">
        <v-icon size="48" color="grey-lighten-1">mdi-history</v-icon>
        <p class="mt-2 text-medium-emphasis">Your search history will appear here</p>
      </div>

      <v-list v-else class="pa-0">
        <v-list-item
          v-for="(item, index) in recentHistory"
          :key="item.id"
          class="mb-2"
          style="border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 8px;"
        >
          <template v-slot:prepend>
            <v-chip size="small" variant="flat" color="primary">
              {{ index + 1 }}
            </v-chip>
          </template>

          <template v-slot:title>
            <div class="d-flex justify-space-between align-center">
              <span class="text-subtitle-2">{{ item.query }}</span>
              <v-chip size="x-small" variant="outlined">
                {{ item.resultCount }} results
              </v-chip>
            </div>
          </template>

          <template v-slot:subtitle>
            <div class="mt-1">
              <div class="d-flex flex-wrap gap-1 mb-1">
                <v-chip
                  v-for="collection in item.collections.slice(0, 3)"
                  :key="collection"
                  size="x-small"
                  variant="outlined"
                >
                  {{ collection }}
                </v-chip>
                <v-chip
                  v-if="item.collections.length > 3"
                  size="x-small"
                  variant="outlined"
                >
                  +{{ item.collections.length - 3 }} more
                </v-chip>
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ formatDate(item.timestamp) }}
              </div>
            </div>
          </template>

          <template v-slot:append>
            <v-btn
              icon="mdi-play"
              variant="text"
              size="small"
              @click="$emit('runQuery', item)"
            />
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface HistoryItem {
  id: string
  query: string
  collections: string[]
  options: Record<string, any>
  timestamp: Date
  resultCount: number
}

interface Props {
  history: HistoryItem[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  runQuery: [item: HistoryItem]
  clearHistory: []
  exportHistory: []
}>()

const recentHistory = computed(() => props.history.slice(0, 10))

function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minutes ago`
  if (hours < 24) return `${hours} hours ago`
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString()
}
</script>