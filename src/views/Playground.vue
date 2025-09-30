<template>
  <v-container fluid class="playground-container">
    <!-- Header -->
    <PlaygroundHeader
      :connectionStatus="connectionStatus"
      @goBack="$router.push('/')"
    />

    <!-- Collections Browser -->
    <CollectionsBrowser
      v-model:selectedCollections="selectedCollections"
      :collections="collections"
      :loading="collectionsLoading"
      @refresh="refreshCollections"
    />

    <!-- Search Interface -->
    <SearchInterface
      v-model:query="searchQuery"
      v-model:options="searchOptions"
      :loading="searchLoading"
      :realtimeEnabled="realtimeEnabled"
      :collaborativeMode="collaborativeMode"
      :selectedCollections="selectedCollections"
      :searchHistory="queryHistory"
      @search="performSearch"
      @clear="clearSearch"
      @toggleRealtime="toggleRealtime"
      @toggleCollaborative="toggleCollaborative"
      @showQueryBuilder="showQueryBuilder"
      @showTemplates="showTemplates"
      @showSavedSearches="showSavedSearches"
    />

    <!-- Analytics Dashboard -->
    <AnalyticsDashboard />

    <!-- Collaborative Dashboard -->
    <CollaborativeDashboard
      :collaborativeMode="collaborativeMode"
      @runSearch="runCollaborativeSearch"
    />

    <!-- Search Results -->
    <SearchResults
      :results="searchResults"
      :loading="searchLoading"
      :query="searchQuery"
      :metadata="resultsMetadata"
      @exportResults="exportResults"
      @visualizeEmbeddings="visualizeEmbeddings"
    />

    <!-- Query History -->
    <QueryHistory
      :history="queryHistory"
      @runQuery="runHistoryQuery"
      @clearHistory="clearQueryHistory"
      @exportHistory="exportQueryHistory"
    />

    <!-- Modals -->
    <QueryBuilderModal
      v-model="queryBuilderVisible"
      @applyQuery="applyBuiltQuery"
    />

    <EnhancedTemplatesModal
      v-model="templatesVisible"
      :templates="searchTemplates"
      :savedSearches="savedSearches"
      @useTemplate="useTemplate"
      @saveTemplate="handleSaveTemplate"
      @deleteTemplate="handleDeleteTemplate"
      @runSavedSearch="runSavedSearch"
      @deleteSavedSearch="handleDeleteSavedSearch"
    />

    <EnhancedSavedSearchesModal
      v-model="savedSearchesVisible"
      :savedSearches="savedSearches"
      @runSearch="runSavedSearch"
      @saveCurrentSearch="saveCurrentSearch"
      @deleteSearch="handleDeleteSavedSearch"
    />

    <EmbeddingVisualizationModal
      v-model="visualizationVisible"
      :results="searchResults"
      :query="searchQuery"
    />

    <!-- Real-time Preview -->
    <RealtimePreview
      v-if="realtimeEnabled && realtimeResults"
      :results="realtimeResults"
      :query="searchQuery"
      @selectResult="focusResult"
      @viewAll="performSearch"
    />
  </v-container>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { useWebSocket } from '@/composables/useWebSocket'
import { useMemoryAPI } from '@/composables/useMemoryAPI'
import { useSearchHistory } from '@/composables/useSearchHistory'
import { useSearchTemplates } from '@/composables/useSearchTemplates'
import { useSearchAnalytics } from '@/composables/useSearchAnalytics'
import { useCollaboration } from '@/composables/useCollaboration'

// Components
import PlaygroundHeader from '@/components/playground/PlaygroundHeader.vue'
import CollectionsBrowser from '@/components/playground/CollectionsBrowser.vue'
import SearchInterface from '@/components/playground/SearchInterface.vue'
import SearchResults from '@/components/playground/SearchResults.vue'
import QueryHistory from '@/components/playground/QueryHistory.vue'
import QueryBuilderModal from '@/components/playground/QueryBuilderModal.vue'
import EnhancedTemplatesModal from '@/components/playground/EnhancedTemplatesModal.vue'
import EnhancedSavedSearchesModal from '@/components/playground/EnhancedSavedSearchesModal.vue'
import EmbeddingVisualizationModal from '@/components/playground/EmbeddingVisualizationModal.vue'
import RealtimePreview from '@/components/playground/RealtimePreview.vue'
import AnalyticsDashboard from '@/components/playground/AnalyticsDashboard.vue'
import CollaborativeDashboard from '@/components/playground/CollaborativeDashboard.vue'

// Composables
const appStore = useAppStore()
const connectionStatus = computed(() => appStore.connectionStatus)
const { connectWebSocket, sendMessage } = useWebSocket()
const { searchMemories, getCollectionDetails, exportSearchResults } = useMemoryAPI()
const { queryHistory, addToHistory, clearHistory } = useSearchHistory()
const { searchTemplates, savedSearches, saveTemplate, saveSearch, deleteTemplate: deleteTemplateFromStore, deleteSavedSearch: deleteSavedSearchFromStore } = useSearchTemplates()
const { recordSearch } = useSearchAnalytics()
const {
  initializeUser,
  shareSearch,
  startTyping,
  stopTyping,
  shareCollectionUpdate,
  cleanup: cleanupCollaboration
} = useCollaboration()

// Reactive state
const collections = ref([])
const collectionsLoading = ref(false)
const selectedCollections = ref(new Set())

const searchQuery = ref('')
const searchLoading = ref(false)
const searchResults = ref([])
const resultsMetadata = ref({})
const realtimeResults = ref(null)

const searchOptions = reactive({
  limit: 10,
  sortBy: 'score',
  minScore: 0,
  searchMode: 'semantic'
})

// Feature toggles
const realtimeEnabled = ref(false)
const collaborativeMode = ref(false)

// Modal visibility
const queryBuilderVisible = ref(false)
const templatesVisible = ref(false)
const savedSearchesVisible = ref(false)
const visualizationVisible = ref(false)

// Search functionality
async function performSearch() {
  if (!searchQuery.value.trim()) return

  searchLoading.value = true
  const startTime = performance.now()

  try {
    const params = {
      query: searchQuery.value,
      collections: Array.from(selectedCollections.value),
      ...searchOptions
    }

    const results = await searchMemories(params)
    // API returns { results: [...], query, collection, limit }
    searchResults.value = results.results || results.memories || []
    resultsMetadata.value = {
      query: results.query,
      collection: results.collection,
      limit: results.limit,
      total: searchResults.value.length
    }

    const endTime = performance.now()
    const queryTime = endTime - startTime

    // Calculate average score from results
    const avgScore = searchResults.value.length > 0
      ? searchResults.value.reduce((sum, r) => sum + (r.score || 0), 0) / searchResults.value.length
      : 0

    // Add to history
    addToHistory({
      query: searchQuery.value,
      collections: Array.from(selectedCollections.value),
      options: { ...searchOptions },
      timestamp: new Date(),
      resultCount: searchResults.value.length
    })

    // Record analytics
    recordSearch({
      queryTime,
      resultCount: searchResults.value.length,
      searchMode: searchOptions.searchMode,
      collections: Array.from(selectedCollections.value),
      minScore: searchOptions.minScore,
      avgScore,
      maxScore: searchResults.value.length > 0 ? Math.max(...searchResults.value.map(r => r.score || 0)) : 0,
      query: searchQuery.value
    })

    // Share search if collaborative mode is enabled
    if (collaborativeMode.value && connectionStatus.value === 'connected') {
      shareSearch({
        query: searchQuery.value,
        collections: Array.from(selectedCollections.value),
        resultCount: searchResults.value.length,
        options: searchOptions
      })
    }

  } catch (error) {
    console.error('Search error:', error)
    // Handle error
  } finally {
    searchLoading.value = false
  }
}

async function performRealtimeSearch() {
  if (!realtimeEnabled.value || !searchQuery.value.trim()) return

  const startTime = performance.now()

  try {
    const params = {
      query: searchQuery.value,
      collections: Array.from(selectedCollections.value),
      limit: 5,
      sortBy: 'score'
    }

    const results = await searchMemories(params)
    // API returns { results: [...] }
    realtimeResults.value = results.results || results.memories || []

    const endTime = performance.now()
    const queryTime = endTime - startTime

    // Record realtime search analytics (if results exist)
    if (realtimeResults.value?.length > 0) {
      const avgScore = realtimeResults.value.reduce((sum, r) => sum + (r.score || 0), 0) / realtimeResults.value.length

      recordSearch({
        queryTime,
        resultCount: realtimeResults.value.length,
        searchMode: 'realtime',
        collections: Array.from(selectedCollections.value),
        minScore: 0,
        avgScore,
        maxScore: Math.max(...results.memories.map(r => r.score || 0)),
        query: searchQuery.value
      })
    }

  } catch (error) {
    console.error('Realtime search error:', error)
  }
}

// Collections management
async function refreshCollections() {
  collectionsLoading.value = true
  try {
    const result = await getCollectionDetails()
    // API returns { collections: [...] }
    const collectionsList = result?.collections || result || []

    // Transform to expected format with name and counts
    collections.value = collectionsList.map((col: any) => ({
      name: col.name || col,
      description: col.description,
      vectorCount: typeof col.memory_count === 'number' ? col.memory_count : 0,
      indexedVectorCount: typeof col.memory_count === 'number' ? col.memory_count : 0,
      status: col.status,
      type: col.type,
      tags: col.tags || []
    }))
  } catch (error) {
    console.error('Error loading collections:', error)
  } finally {
    collectionsLoading.value = false
  }
}

// Feature toggles
function toggleRealtime() {
  realtimeEnabled.value = !realtimeEnabled.value
  if (!realtimeEnabled.value) {
    realtimeResults.value = null
  }
}

function toggleCollaborative() {
  collaborativeMode.value = !collaborativeMode.value
  if (collaborativeMode.value && connectionStatus.value !== 'connected') {
    connectWebSocket()
  }

  if (collaborativeMode.value) {
    initializeUser()
  } else {
    cleanupCollaboration()
  }
}

// Modal handlers
function showQueryBuilder() {
  queryBuilderVisible.value = true
}

// Handle query from query builder
function applyBuiltQuery(builtQuery: any) {
  // Apply filters from query builder
  if (builtQuery.content?.$contains) {
    searchQuery.value = builtQuery.content.$contains
  }
  if (builtQuery.min_score !== undefined) {
    searchOptions.minScore = builtQuery.min_score
  }
  if (builtQuery.type) {
    searchOptions.searchMode = 'hybrid'
  }

  // Perform search with built query
  performSearch()
}

function showTemplates() {
  templatesVisible.value = true
}

function showSavedSearches() {
  savedSearchesVisible.value = true
}

function clearSearch() {
  searchQuery.value = ''
  searchResults.value = []
  resultsMetadata.value = {}
  realtimeResults.value = null
}

// Export functionality
async function exportResults() {
  try {
    await exportSearchResults(searchResults.value, {
      query: searchQuery.value,
      collections: Array.from(selectedCollections.value),
      options: searchOptions
    })
  } catch (error) {
    console.error('Export error:', error)
  }
}

function visualizeEmbeddings() {
  visualizationVisible.value = true
}

// Template and saved search handlers
function useTemplate(template: any) {
  searchQuery.value = template.query
  Object.assign(searchOptions, template.options)
  if (template.collections) {
    selectedCollections.value = new Set(template.collections)
  }
  templatesVisible.value = false
}

function saveCurrentSearch() {
  const searchName = prompt('Enter a name for this saved search:')
  if (!searchName) return

  const searchData = {
    name: searchName,
    query: searchQuery.value,
    collections: Array.from(selectedCollections.value),
    options: { ...searchOptions },
    timestamp: new Date(),
    resultCount: searchResults.value.length
  }
  saveSearch(searchData)
}

function runSavedSearch(search: any) {
  searchQuery.value = search.query
  selectedCollections.value = new Set(search.collections)
  Object.assign(searchOptions, search.options)
  savedSearchesVisible.value = false
  performSearch()
}

// Enhanced template handlers
function handleSaveTemplate(template: any) {
  saveTemplate(template)
}

function handleDeleteTemplate(id: string) {
  deleteTemplateFromStore(id)
}

function handleDeleteSavedSearch(id: string) {
  deleteSavedSearchFromStore(id)
}

// History handlers
function runHistoryQuery(historyItem: any) {
  searchQuery.value = historyItem.query
  selectedCollections.value = new Set(historyItem.collections)
  Object.assign(searchOptions, historyItem.options)
  performSearch()
}

function clearQueryHistory() {
  clearHistory()
}

async function exportQueryHistory() {
  // Export history logic
}

// Real-time search watcher with typing indicators
let realtimeTimeout: NodeJS.Timeout
let typingTimeout: NodeJS.Timeout

watch(searchQuery, (newQuery) => {
  if (realtimeEnabled.value) {
    clearTimeout(realtimeTimeout)
    realtimeTimeout = setTimeout(performRealtimeSearch, 800)
  }

  // Handle typing indicators for collaboration
  if (collaborativeMode.value && connectionStatus.value === 'connected') {
    startTyping(newQuery)

    clearTimeout(typingTimeout)
    typingTimeout = setTimeout(() => {
      stopTyping()
    }, 3000)
  }
})

// Handle collaborative search from other users
function runCollaborativeSearch(search: any) {
  searchQuery.value = search.query
  selectedCollections.value = new Set(search.collections)
  performSearch()
}

// Handle collection changes for collaboration
watch(selectedCollections, (newCollections) => {
  if (collaborativeMode.value && connectionStatus.value === 'connected') {
    shareCollectionUpdate(Array.from(newCollections))
  }
}, { deep: true })

// Initialize
onMounted(async () => {
  await refreshCollections()
  connectWebSocket()

  // Initialize collaboration if enabled
  if (collaborativeMode.value) {
    initializeUser()
  }
})

// Cleanup on unmount
onUnmounted(() => {
  cleanupCollaboration()
})
</script>

<style scoped>
.playground-container {
  max-width: 1200px;
  margin: 0 auto;
}
</style>