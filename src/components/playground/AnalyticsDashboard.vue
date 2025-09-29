<template>
  <v-card class="mb-6">
    <v-card-title class="d-flex justify-space-between align-center">
      <div class="d-flex align-center">
        <v-icon class="mr-2">mdi-chart-line</v-icon>
        Search Performance Analytics
      </div>

      <div class="d-flex gap-2">
        <v-btn
          size="small"
          variant="outlined"
          @click="exportData"
          :disabled="currentAnalysis.totalSearches === 0"
        >
          <v-icon start>mdi-download</v-icon>
          Export
        </v-btn>

        <v-btn
          size="small"
          variant="outlined"
          color="warning"
          @click="clearData"
          :disabled="currentAnalysis.totalSearches === 0"
        >
          <v-icon start>mdi-delete</v-icon>
          Clear
        </v-btn>
      </div>
    </v-card-title>

    <v-card-text>
      <!-- Performance Overview -->
      <v-row class="mb-4">
        <v-col cols="12" sm="6" md="3">
          <v-card variant="tonal" color="primary">
            <v-card-text class="text-center">
              <v-icon size="32" class="mb-2">mdi-speedometer</v-icon>
              <div class="text-h5">{{ Math.round(currentAnalysis.avgQueryTime) }}ms</div>
              <div class="text-caption">Average Query Time</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-card variant="tonal" color="success">
            <v-card-text class="text-center">
              <v-icon size="32" class="mb-2">mdi-magnify</v-icon>
              <div class="text-h5">{{ currentAnalysis.totalSearches }}</div>
              <div class="text-caption">Total Searches</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-card variant="tonal" color="info">
            <v-card-text class="text-center">
              <v-icon size="32" class="mb-2">mdi-flash</v-icon>
              <div class="text-h5">{{ Math.round(currentAnalysis.fastestQuery) }}ms</div>
              <div class="text-caption">Fastest Query</div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="3">
          <v-card variant="tonal" color="warning">
            <v-card-text class="text-center">
              <v-icon size="32" class="mb-2">mdi-clock-alert</v-icon>
              <div class="text-h5">{{ Math.round(currentAnalysis.slowestQuery) }}ms</div>
              <div class="text-caption">Slowest Query</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Performance Insights -->
      <div v-if="performanceInsights.length > 0" class="mb-4">
        <h4 class="text-subtitle-1 mb-2">Performance Insights</h4>
        <v-row>
          <v-col
            v-for="insight in performanceInsights"
            :key="insight.title"
            cols="12"
            md="6"
          >
            <v-alert
              :type="insight.type === 'warning' ? 'warning' : insight.type === 'optimization' ? 'info' : 'success'"
              variant="tonal"
              :icon="insight.icon"
              density="compact"
            >
              <v-alert-title>{{ insight.title }}</v-alert-title>
              <div class="text-body-2 mb-1">{{ insight.description }}</div>
              <div class="text-caption text-medium-emphasis">
                💡 {{ insight.suggestion }}
              </div>
            </v-alert>
          </v-col>
        </v-row>
      </div>

      <!-- Analytics Charts -->
      <v-row>
        <!-- Query Time Distribution -->
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title class="text-subtitle-1">Query Time Distribution</v-card-title>
            <v-card-text>
              <div class="d-flex flex-column gap-3">
                <div class="d-flex align-center">
                  <v-icon color="success" class="mr-2">mdi-flash</v-icon>
                  <div class="flex-grow-1">
                    Fast (&lt;100ms)
                    <v-progress-linear
                      :model-value="getPercentage(currentAnalysis.timeDistribution.fast, currentAnalysis.totalSearches)"
                      color="success"
                      height="8"
                      class="mt-1"
                    />
                  </div>
                  <div class="ml-2 text-body-2">{{ currentAnalysis.timeDistribution.fast }}</div>
                </div>

                <div class="d-flex align-center">
                  <v-icon color="warning" class="mr-2">mdi-speedometer-medium</v-icon>
                  <div class="flex-grow-1">
                    Medium (100-500ms)
                    <v-progress-linear
                      :model-value="getPercentage(currentAnalysis.timeDistribution.medium, currentAnalysis.totalSearches)"
                      color="warning"
                      height="8"
                      class="mt-1"
                    />
                  </div>
                  <div class="ml-2 text-body-2">{{ currentAnalysis.timeDistribution.medium }}</div>
                </div>

                <div class="d-flex align-center">
                  <v-icon color="error" class="mr-2">mdi-speedometer-slow</v-icon>
                  <div class="flex-grow-1">
                    Slow (&gt;500ms)
                    <v-progress-linear
                      :model-value="getPercentage(currentAnalysis.timeDistribution.slow, currentAnalysis.totalSearches)"
                      color="error"
                      height="8"
                      class="mt-1"
                    />
                  </div>
                  <div class="ml-2 text-body-2">{{ currentAnalysis.timeDistribution.slow }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Score Distribution -->
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title class="text-subtitle-1">Score Distribution</v-card-title>
            <v-card-text>
              <div class="d-flex flex-column gap-3">
                <div class="d-flex align-center">
                  <v-icon color="success" class="mr-2">mdi-target</v-icon>
                  <div class="flex-grow-1">
                    High (≥0.8)
                    <v-progress-linear
                      :model-value="getPercentage(currentAnalysis.scoreDistribution.high, getTotalScores())"
                      color="success"
                      height="8"
                      class="mt-1"
                    />
                  </div>
                  <div class="ml-2 text-body-2">{{ currentAnalysis.scoreDistribution.high }}</div>
                </div>

                <div class="d-flex align-center">
                  <v-icon color="warning" class="mr-2">mdi-target-account</v-icon>
                  <div class="flex-grow-1">
                    Medium (0.5-0.79)
                    <v-progress-linear
                      :model-value="getPercentage(currentAnalysis.scoreDistribution.medium, getTotalScores())"
                      color="warning"
                      height="8"
                      class="mt-1"
                    />
                  </div>
                  <div class="ml-2 text-body-2">{{ currentAnalysis.scoreDistribution.medium }}</div>
                </div>

                <div class="d-flex align-center">
                  <v-icon color="error" class="mr-2">mdi-target-variant</v-icon>
                  <div class="flex-grow-1">
                    Low (&lt;0.5)
                    <v-progress-linear
                      :model-value="getPercentage(currentAnalysis.scoreDistribution.low, getTotalScores())"
                      color="error"
                      height="8"
                      class="mt-1"
                    />
                  </div>
                  <div class="ml-2 text-body-2">{{ currentAnalysis.scoreDistribution.low }}</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Search Mode Usage -->
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title class="text-subtitle-1">Search Mode Usage</v-card-title>
            <v-card-text>
              <div v-if="searchModeDistribution.length === 0" class="text-center py-4">
                <v-icon size="48" color="grey-lighten-1">mdi-chart-pie</v-icon>
                <p class="mt-2 text-medium-emphasis">No search data available</p>
              </div>

              <div v-else class="d-flex flex-column gap-2">
                <div
                  v-for="mode in searchModeDistribution"
                  :key="mode.mode"
                  class="d-flex align-center"
                >
                  <v-chip
                    size="small"
                    :color="getModeColor(mode.mode)"
                    class="mr-2"
                  >
                    {{ mode.mode }}
                  </v-chip>
                  <div class="flex-grow-1">
                    <v-progress-linear
                      :model-value="mode.percentage"
                      :color="getModeColor(mode.mode)"
                      height="6"
                    />
                  </div>
                  <div class="ml-2 text-caption">{{ mode.count }} ({{ mode.percentage }}%)</div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Popular Collections -->
        <v-col cols="12" md="6">
          <v-card variant="outlined">
            <v-card-title class="text-subtitle-1">Popular Collections</v-card-title>
            <v-card-text>
              <div v-if="currentAnalysis.popularCollections.length === 0" class="text-center py-4">
                <v-icon size="48" color="grey-lighten-1">mdi-folder-multiple</v-icon>
                <p class="mt-2 text-medium-emphasis">No collection data available</p>
              </div>

              <v-list v-else density="compact">
                <v-list-item
                  v-for="(collection, index) in currentAnalysis.popularCollections"
                  :key="collection"
                >
                  <template #prepend>
                    <v-avatar size="24" :color="getCollectionColor(index)">
                      {{ index + 1 }}
                    </v-avatar>
                  </template>

                  <v-list-item-title>{{ collection }}</v-list-item-title>

                  <template #append>
                    <v-chip size="small" variant="outlined">
                      {{ getCollectionUsageCount(collection) }}
                    </v-chip>
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Recent Search History -->
      <div v-if="recentMetrics.length > 0" class="mt-4">
        <h4 class="text-subtitle-1 mb-2">Recent Search Performance</h4>
        <v-card variant="outlined">
          <v-card-text>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>Query</th>
                  <th>Mode</th>
                  <th>Time</th>
                  <th>Results</th>
                  <th>Avg Score</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="metric in recentMetrics.slice(0, 10)"
                  :key="metric.timestamp.getTime()"
                >
                  <td class="text-truncate" style="max-width: 200px;">
                    {{ metric.query }}
                  </td>
                  <td>
                    <v-chip size="x-small" :color="getModeColor(metric.searchMode)">
                      {{ metric.searchMode }}
                    </v-chip>
                  </td>
                  <td :class="getTimeClass(metric.queryTime)">
                    {{ Math.round(metric.queryTime) }}ms
                  </td>
                  <td>{{ metric.resultCount }}</td>
                  <td>
                    <span v-if="metric.avgScore" :class="getScoreClass(metric.avgScore)">
                      {{ metric.avgScore.toFixed(2) }}
                    </span>
                    <span v-else class="text-medium-emphasis">-</span>
                  </td>
                  <td class="text-caption text-medium-emphasis">
                    {{ formatRelativeTime(metric.timestamp) }}
                  </td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { useSearchAnalytics } from '@/composables/useSearchAnalytics'

const {
  currentAnalysis,
  performanceInsights,
  recentMetrics,
  searchModeDistribution,
  clearAnalytics,
  exportAnalytics,
  searchMetrics
} = useSearchAnalytics()

function getPercentage(value: number, total: number): number {
  return total > 0 ? (value / total) * 100 : 0
}

function getTotalScores(): number {
  return currentAnalysis.scoreDistribution.high +
         currentAnalysis.scoreDistribution.medium +
         currentAnalysis.scoreDistribution.low
}

function getModeColor(mode: string): string {
  const colors = {
    'semantic': 'blue',
    'hybrid': 'purple',
    'exact': 'green'
  }
  return colors[mode as keyof typeof colors] || 'grey'
}

function getCollectionColor(index: number): string {
  const colors = ['primary', 'secondary', 'success', 'info', 'warning']
  return colors[index % colors.length]
}

function getCollectionUsageCount(collection: string): number {
  return searchMetrics.value.filter(m =>
    m.collections.includes(collection)
  ).length
}

function getTimeClass(time: number): string {
  if (time < 100) return 'text-success'
  if (time < 500) return 'text-warning'
  return 'text-error'
}

function getScoreClass(score: number): string {
  if (score >= 0.8) return 'text-success'
  if (score >= 0.5) return 'text-warning'
  return 'text-error'
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}

function clearData() {
  if (confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
    clearAnalytics()
  }
}

function exportData() {
  exportAnalytics()
}
</script>

<style scoped>
.text-truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>