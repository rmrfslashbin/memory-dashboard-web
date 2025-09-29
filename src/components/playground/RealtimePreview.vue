<template>
  <v-card
    class="realtime-preview"
    elevation="8"
    style="position: fixed; bottom: 20px; right: 20px; width: 350px; max-height: 500px; z-index: 1000;"
  >
    <v-card-title class="d-flex justify-space-between align-center">
      <span class="text-subtitle-1">🔍 Live Results</span>
      <v-btn icon="mdi-close" variant="text" size="small" @click="$emit('close')" />
    </v-card-title>

    <v-card-subtitle v-if="results">
      <div class="text-caption">
        "{{ truncateQuery(query) }}" • {{ results.memories?.length || 0 }} results
      </div>
    </v-card-subtitle>

    <v-card-text class="pa-2" style="max-height: 350px; overflow-y: auto;">
      <div v-if="!results || !results.memories?.length" class="text-center py-4">
        <v-progress-circular indeterminate size="32" />
        <p class="mt-2 text-caption">Searching...</p>
      </div>

      <div v-else>
        <v-list density="compact" class="pa-0">
          <v-list-item
            v-for="(result, index) in results.memories.slice(0, 3)"
            :key="result.id"
            class="mb-2"
            style="border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 4px; cursor: pointer;"
            @click="$emit('selectResult', result.id)"
          >
            <template v-slot:prepend>
              <v-chip size="x-small" color="primary">{{ index + 1 }}</v-chip>
            </template>

            <template v-slot:title>
              <div class="text-caption font-weight-bold">
                {{ result.id.substring(0, 12) }}...
              </div>
            </template>

            <template v-slot:subtitle>
              <div class="text-caption">
                {{ truncateContent(result.content || '') }}
              </div>
              <div class="mt-1">
                <v-chip
                  size="x-small"
                  :color="getScoreColor(result.score)"
                  variant="flat"
                >
                  {{ formatScore(result.score) }}
                </v-chip>
              </div>
            </template>
          </v-list-item>
        </v-list>

        <div v-if="results.memories.length > 3" class="text-center mt-2">
          <div class="text-caption text-medium-emphasis">
            +{{ results.memories.length - 3 }} more results
          </div>
        </div>

        <v-btn
          color="primary"
          variant="flat"
          size="small"
          block
          class="mt-3"
          @click="$emit('viewAll')"
        >
          View All Results
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
interface SearchResults {
  memories: Array<{
    id: string
    content: string
    score: number
    collection?: string
  }>
}

interface Props {
  results: SearchResults | null
  query: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  selectResult: [id: string]
  viewAll: []
  close: []
}>()

function truncateQuery(query: string): string {
  return query.length > 30 ? `${query.substring(0, 30)}...` : query
}

function truncateContent(content: string): string {
  return content.length > 60 ? `${content.substring(0, 60)}...` : content
}

function formatScore(score: number): string {
  return score?.toFixed(3) || 'N/A'
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return 'success'
  if (score >= 0.6) return 'warning'
  return 'error'
}
</script>

<style scoped>
.realtime-preview {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>