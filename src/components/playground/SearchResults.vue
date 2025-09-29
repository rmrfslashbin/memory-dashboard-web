<template>
  <v-card class="mb-6">
    <!-- Results Header -->
    <v-card-title class="d-flex justify-space-between align-center">
      <span>Search Results</span>

      <div class="d-flex gap-2">
        <v-btn
          v-if="results.length > 0"
          variant="outlined"
          size="small"
          @click="$emit('exportResults')"
        >
          <v-icon start>mdi-export</v-icon>
          Export
        </v-btn>

        <v-btn
          v-if="results.length > 0"
          variant="outlined"
          size="small"
          @click="$emit('visualizeEmbeddings')"
        >
          <v-icon start>mdi-chart-scatter-plot</v-icon>
          Visualize
        </v-btn>
      </div>
    </v-card-title>

    <!-- Results Metadata -->
    <v-card-subtitle v-if="metadata && Object.keys(metadata).length > 0">
      <div class="d-flex flex-wrap gap-2 align-center">
        <v-chip
          v-if="metadata.total_count"
          size="small"
          variant="flat"
          color="primary"
        >
          <v-icon start size="small">mdi-database-search</v-icon>
          {{ metadata.total_count }} total results
        </v-chip>

        <v-chip
          v-if="metadata.search_time"
          size="small"
          variant="flat"
          color="blue-grey"
        >
          <v-icon start size="small">mdi-clock-fast</v-icon>
          {{ formatSearchTime(metadata.search_time) }}
        </v-chip>

        <v-chip
          v-if="metadata.collections_searched"
          size="small"
          variant="flat"
          color="green"
        >
          <v-icon start size="small">mdi-database</v-icon>
          {{ metadata.collections_searched }} collections
        </v-chip>

        <v-chip
          v-if="query"
          size="small"
          variant="outlined"
        >
          <v-icon start size="small">mdi-magnify</v-icon>
          "{{ truncateQuery(query) }}"
        </v-chip>
      </div>
    </v-card-subtitle>

    <v-card-text>
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" size="64" />
        <p class="mt-4">Searching...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="results.length === 0 && query" class="text-center py-8">
        <v-icon size="64" color="grey-lighten-1">mdi-magnify</v-icon>
        <h3 class="mt-4 mb-2">No Results Found</h3>
        <p class="text-medium-emphasis">
          Try adjusting your search query or reducing the minimum score threshold.
        </p>
      </div>

      <!-- Initial State -->
      <div v-else-if="results.length === 0 && !query" class="text-center py-8">
        <v-icon size="64" color="grey-lighten-1">mdi-magnify-scan</v-icon>
        <h3 class="mt-4 mb-2">Welcome to Search Playground</h3>
        <p class="text-medium-emphasis mb-4">
          Enter a search query above to explore your memory system with semantic search.
        </p>
        <p class="text-medium-emphasis">
          Try searching for concepts, ideas, or any text - the system will find semantically similar content.
        </p>
      </div>

      <!-- Results List -->
      <div v-else>
        <v-list class="pa-0">
          <v-list-item
            v-for="(result, index) in results"
            :key="result.id"
            class="result-item pa-4 mb-4"
            :class="{ 'highlighted': highlightedResultId === result.id }"
            style="border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)); border-radius: 8px;"
          >
            <!-- Result Header -->
            <template v-slot:prepend>
              <div class="result-index">
                <v-chip
                  size="small"
                  color="primary"
                  variant="flat"
                >
                  {{ index + 1 }}
                </v-chip>
              </div>
            </template>

            <template v-slot:title>
              <div class="d-flex justify-space-between align-center">
                <div class="result-id">
                  <code class="text-caption">{{ result.id }}</code>
                </div>
                <div class="result-score">
                  <v-chip
                    :color="getScoreColor(result.score)"
                    size="small"
                    variant="flat"
                  >
                    <v-icon start size="x-small">mdi-target</v-icon>
                    {{ formatScore(result.score) }}
                  </v-chip>
                </div>
              </div>
            </template>

            <template v-slot:subtitle>
              <div class="result-metadata mt-2">
                <div class="d-flex flex-wrap gap-1 mb-2">
                  <v-chip
                    v-if="result.collection"
                    size="x-small"
                    variant="outlined"
                  >
                    <v-icon start size="x-small">mdi-database</v-icon>
                    {{ result.collection }}
                  </v-chip>

                  <v-chip
                    v-if="result.type"
                    size="x-small"
                    variant="outlined"
                  >
                    <v-icon start size="x-small">mdi-tag</v-icon>
                    {{ result.type }}
                  </v-chip>

                  <v-chip
                    v-if="result.created_at"
                    size="x-small"
                    variant="outlined"
                  >
                    <v-icon start size="x-small">mdi-calendar</v-icon>
                    {{ formatDate(result.created_at) }}
                  </v-chip>
                </div>

                <!-- Content Preview -->
                <div class="result-content mt-3">
                  <v-expansion-panels variant="accordion" density="compact">
                    <v-expansion-panel>
                      <v-expansion-panel-title class="text-body-2">
                        {{ truncateContent(result.content) }}
                      </v-expansion-panel-title>
                      <v-expansion-panel-text>
                        <pre class="text-body-2 whitespace-pre-wrap">{{ result.content }}</pre>

                        <!-- Metadata -->
                        <div v-if="result.metadata" class="mt-3">
                          <h4 class="text-subtitle-2 mb-2">Metadata</h4>
                          <v-card variant="outlined" density="compact">
                            <v-card-text class="pa-2">
                              <pre class="text-caption">{{ JSON.stringify(result.metadata, null, 2) }}</pre>
                            </v-card-text>
                          </v-card>
                        </div>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </div>
              </div>
            </template>

            <template v-slot:append>
              <div class="result-actions">
                <v-menu>
                  <template v-slot:activator="{ props }">
                    <v-btn
                      icon="mdi-dots-vertical"
                      variant="text"
                      size="small"
                      v-bind="props"
                    />
                  </template>
                  <v-list density="compact">
                    <v-list-item @click="copyResultId(result.id)">
                      <v-list-item-title>
                        <v-icon start>mdi-content-copy</v-icon>
                        Copy ID
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="copyResultContent(result.content)">
                      <v-list-item-title>
                        <v-icon start>mdi-content-copy</v-icon>
                        Copy Content
                      </v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="openResultDetails(result)">
                      <v-list-item-title>
                        <v-icon start>mdi-information</v-icon>
                        View Details
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
            </template>
          </v-list-item>
        </v-list>

        <!-- Pagination (if needed) -->
        <div v-if="metadata && metadata.has_more" class="text-center mt-4">
          <v-btn
            color="primary"
            variant="outlined"
            @click="loadMoreResults"
          >
            Load More Results
          </v-btn>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface SearchResult {
  id: string
  content: string
  score: number
  collection?: string
  type?: string
  created_at?: string
  metadata?: Record<string, any>
}

interface ResultsMetadata {
  total_count?: number
  search_time?: number
  collections_searched?: number
  has_more?: boolean
}

interface Props {
  results: SearchResult[]
  loading: boolean
  query: string
  metadata: ResultsMetadata
}

const props = defineProps<Props>()

const emit = defineEmits<{
  exportResults: []
  visualizeEmbeddings: []
}>()

const highlightedResultId = ref<string | null>(null)

function formatScore(score: number): string {
  return score?.toFixed(3) || 'N/A'
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return 'success'
  if (score >= 0.6) return 'warning'
  if (score >= 0.4) return 'orange'
  return 'error'
}

function formatSearchTime(timeMs: number): string {
  if (timeMs < 1000) {
    return `${timeMs.toFixed(0)}ms`
  }
  return `${(timeMs / 1000).toFixed(2)}s`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}

function truncateQuery(query: string): string {
  return query.length > 50 ? `${query.substring(0, 50)}...` : query
}

function truncateContent(content: string): string {
  return content.length > 150 ? `${content.substring(0, 150)}...` : content
}

function copyResultId(id: string) {
  navigator.clipboard.writeText(id)
}

function copyResultContent(content: string) {
  navigator.clipboard.writeText(content)
}

function openResultDetails(result: SearchResult) {
  // Open result details in a modal or new view
  console.log('Opening result details:', result)
}

function loadMoreResults() {
  // Implement pagination logic
  console.log('Loading more results...')
}

// Expose function to highlight specific result
function highlightResult(resultId: string) {
  highlightedResultId.value = resultId
  setTimeout(() => {
    highlightedResultId.value = null
  }, 3000)
}

defineExpose({
  highlightResult
})
</script>

<style scoped>
.result-item.highlighted {
  border-color: rgb(var(--v-theme-primary)) !important;
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.result-content pre {
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-word;
}

.whitespace-pre-wrap {
  white-space: pre-wrap;
}
</style>