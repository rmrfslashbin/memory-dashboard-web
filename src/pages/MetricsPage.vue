<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between align-center">
      <div>
        <v-icon class="mr-2">mdi-chart-line</v-icon>
        System Metrics
      </div>
      <v-btn icon="mdi-refresh" variant="text" :loading="loading" @click="loadMetrics" />
    </v-card-title>

    <v-card-text>
      <div v-if="loading" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
        <p class="mt-2">Loading metrics...</p>
      </div>

      <div v-else-if="error" class="text-center py-8">
        <v-icon size="48" color="error">mdi-alert-circle</v-icon>
        <p class="mt-2 text-error">{{ error }}</p>
        <v-btn color="primary" @click="loadMetrics" class="mt-4">Try Again</v-btn>
      </div>

      <div v-else-if="metrics">
        <v-row>
          <!-- System Resources -->
          <v-col cols="12" md="3">
            <v-card variant="outlined">
              <v-card-title>System Resources</v-card-title>
              <v-card-text>
                <v-list density="compact">
                  <v-list-item v-if="metrics.memory_alloc">
                    <v-list-item-title>Memory Allocated</v-list-item-title>
                    <v-list-item-subtitle>{{ metrics.memory_alloc }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item v-if="metrics.goroutines">
                    <v-list-item-title>Goroutines</v-list-item-title>
                    <v-list-item-subtitle>{{ metrics.goroutines }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item v-if="metrics.gc_cycles">
                    <v-list-item-title>GC Cycles</v-list-item-title>
                    <v-list-item-subtitle>{{ metrics.gc_cycles }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Collections -->
          <v-col cols="12" md="3">
            <v-card variant="outlined">
              <v-card-title>Collections</v-card-title>
              <v-card-text>
                <div class="text-center py-4">
                  <div class="text-h3 text-primary">{{ metrics.collections_count || 0 }}</div>
                  <div class="text-caption text-medium-emphasis mt-2">Total Collections</div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Embedding Cache -->
          <v-col cols="12" md="6">
            <v-card variant="outlined">
              <v-card-title>Embedding Cache</v-card-title>
              <v-card-text>
                <v-row dense v-if="metrics.embedding_cache">
                  <v-col cols="6">
                    <div class="text-body-2 text-medium-emphasis">Hit Rate</div>
                    <div class="text-h6">{{ metrics.embedding_cache.hit_rate_percent?.toFixed(1) }}%</div>
                  </v-col>
                  <v-col cols="6">
                    <div class="text-body-2 text-medium-emphasis">Cache Size</div>
                    <div class="text-h6">{{ metrics.embedding_cache.cache_size }} / {{ metrics.embedding_cache.cache_capacity }}</div>
                  </v-col>
                  <v-col cols="6">
                    <div class="text-body-2 text-medium-emphasis">Cache Hits</div>
                    <div class="text-h6">{{ metrics.embedding_cache.cache_hits }}</div>
                  </v-col>
                  <v-col cols="6">
                    <div class="text-body-2 text-medium-emphasis">Cache Misses</div>
                    <div class="text-h6">{{ metrics.embedding_cache.cache_misses }}</div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Memory Operations -->
          <v-col cols="12" md="6" v-if="metrics.memory_operations">
            <v-card variant="outlined">
              <v-card-title>Search Performance</v-card-title>
              <v-card-text v-if="metrics.memory_operations.histograms?.operation_duration_memory_search">
                <v-list density="compact">
                  <v-list-item>
                    <v-list-item-title>Total Searches</v-list-item-title>
                    <v-list-item-subtitle>{{ metrics.memory_operations.histograms.operation_duration_memory_search.count }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title>Avg Duration</v-list-item-title>
                    <v-list-item-subtitle>{{ metrics.memory_operations.histograms.operation_duration_memory_search.mean?.toFixed(2) }} ms</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title>P95 Duration</v-list-item-title>
                    <v-list-item-subtitle>{{ metrics.memory_operations.histograms.operation_duration_memory_search.p95?.toFixed(2) }} ms</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title>Min / Max</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ metrics.memory_operations.histograms.operation_duration_memory_search.min?.toFixed(2) }} /
                      {{ metrics.memory_operations.histograms.operation_duration_memory_search.max?.toFixed(2) }} ms
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Search Results -->
          <v-col cols="12" md="6" v-if="metrics.memory_operations?.histograms?.search_result_count">
            <v-card variant="outlined">
              <v-card-title>Search Results</v-card-title>
              <v-card-text>
                <v-list density="compact">
                  <v-list-item>
                    <v-list-item-title>Total Searches</v-list-item-title>
                    <v-list-item-subtitle>{{ metrics.memory_operations.histograms.search_result_count.count }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title>Avg Results</v-list-item-title>
                    <v-list-item-subtitle>{{ metrics.memory_operations.histograms.search_result_count.mean?.toFixed(1) }}</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item>
                    <v-list-item-title>Min / Max Results</v-list-item-title>
                    <v-list-item-subtitle>
                      {{ metrics.memory_operations.histograms.search_result_count.min }} /
                      {{ metrics.memory_operations.histograms.search_result_count.max }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Active Operations -->
          <v-col cols="12" v-if="metrics.memory_operations?.gauges">
            <v-card variant="outlined">
              <v-card-title>Current Activity</v-card-title>
              <v-card-text>
                <v-list density="compact">
                  <v-list-item>
                    <v-list-item-title>Active Operations</v-list-item-title>
                    <v-list-item-subtitle>{{ metrics.memory_operations.gauges.active_operations || 0 }}</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { memoryAPI } from '@/utils/memory-api'

const appStore = useAppStore()
const loading = ref(false)
const error = ref<string | null>(null)
const metrics = ref<any>(null)

async function loadMetrics() {
  loading.value = true
  error.value = null

  try {
    const response = await memoryAPI.getMetrics()

    if (response.success) {
      metrics.value = response.data
    } else {
      error.value = response.error?.message || 'Failed to load metrics'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load metrics'
  } finally {
    loading.value = false
  }
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)

  return parts.length > 0 ? parts.join(' ') : '< 1m'
}

onMounted(() => {
  loadMetrics()
})
</script>