<template>
  <v-dialog v-model="localVisible" max-width="1200px" persistent scrollable>
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center bg-primary">
        <span class="text-white">
          <v-icon class="mr-2" color="white">mdi-cube-outline</v-icon>
          Embedding Space Visualization
        </span>
        <v-btn icon="mdi-close" variant="text" color="white" @click="localVisible = false" />
      </v-card-title>

      <v-card-text class="pa-0">
        <!-- Main Visualization -->
        <EmbeddingVisualization
          :results="results"
          :query="query"
          :loading="loading"
        />

        <!-- Analysis Panel -->
        <v-card class="ma-4" variant="outlined">
          <v-card-title class="text-h6">Semantic Analysis</v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="4">
                <h4 class="text-subtitle-2 mb-2">Cluster Analysis</h4>
                <p class="text-body-2 mb-2">{{ clusterAnalysis }}</p>
                <v-progress-linear
                  :model-value="clusterCoherence * 100"
                  color="success"
                  height="8"
                >
                  <template #default>
                    <span class="text-caption">{{ Math.round(clusterCoherence * 100) }}% coherent</span>
                  </template>
                </v-progress-linear>
              </v-col>

              <v-col cols="12" md="4">
                <h4 class="text-subtitle-2 mb-2">Query Relevance</h4>
                <p class="text-body-2 mb-2">{{ relevanceAnalysis }}</p>
                <v-progress-linear
                  :model-value="averageRelevance * 100"
                  color="info"
                  height="8"
                >
                  <template #default>
                    <span class="text-caption">{{ Math.round(averageRelevance * 100) }}% relevant</span>
                  </template>
                </v-progress-linear>
              </v-col>

              <v-col cols="12" md="4">
                <h4 class="text-subtitle-2 mb-2">Semantic Diversity</h4>
                <p class="text-body-2 mb-2">{{ diversityAnalysis }}</p>
                <v-progress-linear
                  :model-value="semanticDiversity * 100"
                  color="warning"
                  height="8"
                >
                  <template #default>
                    <span class="text-caption">{{ Math.round(semanticDiversity * 100) }}% diverse</span>
                  </template>
                </v-progress-linear>
              </v-col>
            </v-row>

            <!-- Top Clusters -->
            <div class="mt-4">
              <h4 class="text-subtitle-2 mb-2">Identified Clusters</h4>
              <div class="d-flex flex-wrap gap-2">
                <v-chip
                  v-for="cluster in topClusters"
                  :key="cluster.id"
                  :color="cluster.color"
                  size="small"
                >
                  {{ cluster.label }} ({{ cluster.size }})
                </v-chip>
              </div>
            </div>

            <!-- Semantic Insights -->
            <div class="mt-4">
              <h4 class="text-subtitle-2 mb-2">Semantic Insights</h4>
              <v-list density="compact">
                <v-list-item
                  v-for="insight in semanticInsights"
                  :key="insight.type"
                >
                  <template #prepend>
                    <v-icon :color="insight.color">{{ insight.icon }}</v-icon>
                  </template>
                  <v-list-item-title>{{ insight.title }}</v-list-item-title>
                  <v-list-item-subtitle>{{ insight.description }}</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </div>
          </v-card-text>
        </v-card>
      </v-card-text>

      <v-card-actions>
        <v-btn variant="text" @click="localVisible = false">
          Close
        </v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          variant="outlined"
          @click="generateReport"
        >
          <v-icon start>mdi-file-document</v-icon>
          Generate Report
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import EmbeddingVisualization from './EmbeddingVisualization.vue'

interface SearchResult {
  id: string
  content: string
  score?: number
  collection?: string
  type?: string
  metadata?: any
}

interface Props {
  modelValue: boolean
  results: SearchResult[]
  query: string
  loading?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const localVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Analysis computations
const clusterCoherence = computed(() => {
  // Simplified coherence calculation based on score distribution
  if (props.results.length === 0) return 0
  const scores = props.results.map(r => r.score || 0.5)
  const variance = scores.reduce((acc, score) => acc + Math.pow(score - 0.7, 2), 0) / scores.length
  return Math.max(0, 1 - variance)
})

const averageRelevance = computed(() => {
  if (props.results.length === 0) return 0
  const scores = props.results.map(r => r.score || 0.5)
  return scores.reduce((a, b) => a + b, 0) / scores.length
})

const semanticDiversity = computed(() => {
  // Calculate diversity based on collection and type distribution
  const collections = new Set(props.results.map(r => r.collection))
  const types = new Set(props.results.map(r => r.type))
  const totalVariety = collections.size + types.size
  return Math.min(1, totalVariety / 10) // Normalize to 0-1 range
})

const clusterAnalysis = computed(() => {
  const coherence = clusterCoherence.value
  if (coherence > 0.8) return 'Results form tight, coherent clusters with strong semantic relationships.'
  if (coherence > 0.6) return 'Results show moderate clustering with some semantic groupings.'
  if (coherence > 0.4) return 'Results are somewhat scattered with loose semantic connections.'
  return 'Results show high variance with weak semantic clustering.'
})

const relevanceAnalysis = computed(() => {
  const relevance = averageRelevance.value
  if (relevance > 0.8) return 'Highly relevant results with strong query alignment.'
  if (relevance > 0.6) return 'Good relevance with most results matching the query intent.'
  if (relevance > 0.4) return 'Moderate relevance with some results tangentially related.'
  return 'Low relevance scores indicate weak query-result alignment.'
})

const diversityAnalysis = computed(() => {
  const diversity = semanticDiversity.value
  if (diversity > 0.8) return 'High semantic diversity across multiple topics and collections.'
  if (diversity > 0.6) return 'Good diversity with results spanning several semantic areas.'
  if (diversity > 0.4) return 'Moderate diversity with some variety in result types.'
  return 'Low diversity with results concentrated in similar semantic areas.'
})

const topClusters = computed(() => {
  // Group results by collection and type for cluster visualization
  const collectionGroups = new Map<string, number>()
  const typeGroups = new Map<string, number>()

  props.results.forEach(result => {
    const collection = result.collection || 'Unknown'
    const type = result.type || 'Memory'

    collectionGroups.set(collection, (collectionGroups.get(collection) || 0) + 1)
    typeGroups.set(type, (typeGroups.get(type) || 0) + 1)
  })

  const clusters = []
  const colors = ['primary', 'secondary', 'success', 'info', 'warning']
  let colorIndex = 0

  // Add top collections
  Array.from(collectionGroups.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .forEach(([collection, size], index) => {
      clusters.push({
        id: `collection_${collection}`,
        label: collection,
        size,
        color: colors[colorIndex++ % colors.length]
      })
    })

  // Add top types
  Array.from(typeGroups.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .forEach(([type, size], index) => {
      clusters.push({
        id: `type_${type}`,
        label: type,
        size,
        color: colors[colorIndex++ % colors.length]
      })
    })

  return clusters
})

const semanticInsights = computed(() => {
  const insights = []

  // Score distribution insight
  const highScoreCount = props.results.filter(r => (r.score || 0) > 0.8).length
  if (highScoreCount > props.results.length * 0.5) {
    insights.push({
      type: 'high_relevance',
      title: 'High Relevance Results',
      description: `${highScoreCount} results have very high relevance scores (>0.8)`,
      icon: 'mdi-target',
      color: 'success'
    })
  }

  // Collection diversity insight
  const collectionCount = new Set(props.results.map(r => r.collection)).size
  if (collectionCount > 1) {
    insights.push({
      type: 'collection_spread',
      title: 'Cross-Collection Results',
      description: `Results span ${collectionCount} different collections`,
      icon: 'mdi-folder-multiple',
      color: 'info'
    })
  }

  // Query alignment insight
  const queryWords = props.query.toLowerCase().split(' ').filter(w => w.length > 3)
  const contentMatches = props.results.filter(r =>
    queryWords.some(word => r.content.toLowerCase().includes(word))
  ).length

  if (contentMatches > props.results.length * 0.7) {
    insights.push({
      type: 'query_alignment',
      title: 'Strong Query Alignment',
      description: `${contentMatches} results contain key terms from your query`,
      icon: 'mdi-magnify',
      color: 'primary'
    })
  }

  return insights
})

function generateReport() {
  const report = {
    query: props.query,
    resultCount: props.results.length,
    analysis: {
      clusterCoherence: clusterCoherence.value,
      averageRelevance: averageRelevance.value,
      semanticDiversity: semanticDiversity.value,
      clusterAnalysis: clusterAnalysis.value,
      relevanceAnalysis: relevanceAnalysis.value,
      diversityAnalysis: diversityAnalysis.value
    },
    clusters: topClusters.value,
    insights: semanticInsights.value,
    generatedAt: new Date().toISOString()
  }

  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: 'application/json'
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `semantic-analysis-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>