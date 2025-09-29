<template>
  <div class="search-suggestions-container">
    <!-- Suggestions Dropdown -->
    <v-menu
      v-model="showSuggestions"
      :close-on-content-click="false"
      :max-width="600"
      :min-width="500"
      location="bottom start"
      offset="8"
    >
      <template v-slot:activator="{ props: menuProps }">
        <v-text-field
          v-model="localQuery"
          v-bind="{ ...menuProps, ...$attrs }"
          :label="label"
          :placeholder="placeholder"
          variant="outlined"
          prepend-inner-icon="mdi-magnify"
          hide-details="auto"
          @input="handleInput"
          @keydown="handleKeydown"
          @focus="handleFocus"
          @blur="handleBlur"
          ref="searchInput"
        >
          <template v-slot:append-inner>
            <div class="d-flex gap-1">
              <v-chip
                v-if="searchStats.totalSearches > 0"
                size="x-small"
                variant="text"
                color="primary"
              >
                {{ searchStats.totalSearches }} searches
              </v-chip>

              <v-btn
                v-if="localQuery"
                icon="mdi-close"
                variant="text"
                size="x-small"
                @click="clearSearch"
              />

              <v-btn
                icon="mdi-send"
                variant="text"
                size="small"
                :disabled="!localQuery.trim()"
                @click="executeSearch"
              />
            </div>
          </template>
        </v-text-field>
      </template>

      <v-card v-if="showSuggestions && (suggestions.length > 0 || recentSearches.length > 0)">
        <!-- Search Tips -->
        <div v-if="showSearchTips" class="search-tips pa-3 bg-blue-lighten-5">
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-caption font-weight-bold">
              <v-icon size="small" class="mr-1">mdi-lightbulb</v-icon>
              Search Tips
            </span>
            <v-btn
              icon="mdi-close"
              size="x-small"
              variant="text"
              @click="showSearchTips = false"
            />
          </div>
          <div class="text-caption">
            • Use quotes for exact phrases: <code>"recipe ingredients"</code><br>
            • Add + for required terms: <code>+chicken +recipe</code><br>
            • Use - to exclude terms: <code>recipes -dessert</code><br>
            • Try semantic search: <code>cooking Italian food</code>
          </div>
        </div>

        <v-list density="compact" class="py-0">
          <!-- Current Input Suggestions -->
          <template v-if="suggestions.length > 0">
            <v-list-subheader class="text-caption">
              <v-icon size="small" class="mr-1">mdi-auto-fix</v-icon>
              Suggestions
            </v-list-subheader>

            <v-list-item
              v-for="(suggestion, index) in suggestions"
              :key="`suggestion-${index}`"
              @click="selectSuggestion(suggestion)"
              :class="{ 'bg-grey-lighten-4': selectedIndex === index }"
            >
              <template v-slot:prepend>
                <v-icon size="small" :color="getSuggestionColor(suggestion.type)">
                  {{ getSuggestionIcon(suggestion.type) }}
                </v-icon>
              </template>

              <v-list-item-title>
                <span v-html="highlightMatch(suggestion.text, localQuery)"></span>
              </v-list-item-title>

              <v-list-item-subtitle>
                <v-chip
                  size="x-small"
                  variant="text"
                  :color="getSuggestionColor(suggestion.type)"
                >
                  {{ suggestion.type }}
                </v-chip>
                <span v-if="suggestion.score" class="ml-2 text-caption">
                  Score: {{ suggestion.score.toFixed(2) }}
                </span>
                <span v-if="suggestion.frequency" class="ml-2 text-caption">
                  Used {{ suggestion.frequency }} times
                </span>
              </v-list-item-subtitle>

              <template v-slot:append>
                <v-btn
                  icon="mdi-arrow-top-left"
                  size="x-small"
                  variant="text"
                  @click.stop="insertSuggestion(suggestion)"
                />
              </template>
            </v-list-item>
          </template>

          <!-- Recent Searches -->
          <template v-if="recentSearches.length > 0">
            <v-divider v-if="suggestions.length > 0" />

            <v-list-subheader class="text-caption">
              <v-icon size="small" class="mr-1">mdi-history</v-icon>
              Recent Searches
            </v-list-subheader>

            <v-list-item
              v-for="(search, index) in recentSearches.slice(0, 5)"
              :key="`recent-${index}`"
              @click="selectRecentSearch(search)"
            >
              <template v-slot:prepend>
                <v-icon size="small" color="grey">mdi-clock-outline</v-icon>
              </template>

              <v-list-item-title>
                {{ search.query }}
              </v-list-item-title>

              <v-list-item-subtitle>
                <span class="text-caption">
                  {{ formatTimeAgo(search.timestamp) }} • {{ search.resultCount }} results
                </span>
              </v-list-item-subtitle>

              <template v-slot:append>
                <v-btn
                  icon="mdi-delete"
                  size="x-small"
                  variant="text"
                  @click.stop="removeRecentSearch(search.id)"
                />
              </template>
            </v-list-item>
          </template>

          <!-- Popular Searches -->
          <template v-if="popularSearches.length > 0">
            <v-divider />

            <v-list-subheader class="text-caption">
              <v-icon size="small" class="mr-1">mdi-trending-up</v-icon>
              Trending Searches
            </v-list-subheader>

            <v-list-item
              v-for="(search, index) in popularSearches.slice(0, 3)"
              :key="`popular-${index}`"
              @click="selectPopularSearch(search)"
            >
              <template v-slot:prepend>
                <v-chip size="x-small" color="orange">
                  {{ index + 1 }}
                </v-chip>
              </template>

              <v-list-item-title>
                {{ search.query }}
              </v-list-item-title>

              <v-list-item-subtitle>
                <span class="text-caption">
                  <v-icon size="x-small">mdi-fire</v-icon>
                  {{ search.count }} searches today
                </span>
              </v-list-item-subtitle>
            </v-list-item>
          </template>

          <!-- Collection-specific Suggestions -->
          <template v-if="selectedCollections.size > 0 && collectionSuggestions.length > 0">
            <v-divider />

            <v-list-subheader class="text-caption">
              <v-icon size="small" class="mr-1">mdi-folder</v-icon>
              In Selected Collections
            </v-list-subheader>

            <v-list-item
              v-for="(suggestion, index) in collectionSuggestions"
              :key="`collection-${index}`"
              @click="selectSuggestion(suggestion)"
            >
              <template v-slot:prepend>
                <v-icon size="small" color="blue">mdi-folder-search</v-icon>
              </template>

              <v-list-item-title>
                {{ suggestion.text }}
              </v-list-item-title>

              <v-list-item-subtitle>
                <v-chip
                  size="x-small"
                  variant="text"
                  color="blue"
                >
                  {{ suggestion.collection }}
                </v-chip>
              </v-list-item-subtitle>
            </v-list-item>
          </template>
        </v-list>

        <!-- Quick Actions -->
        <v-card-actions class="bg-grey-lighten-5 pa-2">
          <v-btn
            size="x-small"
            variant="text"
            @click="showAdvancedSearch"
          >
            <v-icon start size="small">mdi-cog</v-icon>
            Advanced
          </v-btn>

          <v-btn
            size="x-small"
            variant="text"
            @click="showSearchHelp"
          >
            <v-icon start size="small">mdi-help-circle</v-icon>
            Help
          </v-btn>

          <v-spacer />

          <v-btn
            size="x-small"
            variant="text"
            @click="clearAllHistory"
            v-if="recentSearches.length > 0"
          >
            Clear History
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>

    <!-- Inline Suggestions (Pills) -->
    <div v-if="inlineSuggestions.length > 0 && !showSuggestions" class="inline-suggestions mt-2">
      <div class="text-caption text-medium-emphasis mb-1">
        Try searching for:
      </div>
      <div class="d-flex flex-wrap gap-1">
        <v-chip
          v-for="(suggestion, index) in inlineSuggestions"
          :key="`inline-${index}`"
          size="small"
          variant="outlined"
          @click="selectInlineSuggestion(suggestion)"
        >
          {{ suggestion }}
        </v-chip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { debounce } from 'lodash-es'

interface Suggestion {
  text: string
  type: 'semantic' | 'exact' | 'popular' | 'collection' | 'metadata'
  score?: number
  frequency?: number
  collection?: string
}

interface RecentSearch {
  id: string
  query: string
  timestamp: Date
  resultCount: number
}

interface Props {
  modelValue: string
  label?: string
  placeholder?: string
  selectedCollections?: Set<string>
  searchHistory?: RecentSearch[]
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Search',
  placeholder: 'Enter your search query...',
  selectedCollections: () => new Set(),
  searchHistory: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  search: [query: string]
  showAdvanced: []
}>()

// Local state
const localQuery = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const searchInput = ref<any>(null)
const showSuggestions = ref(false)
const suggestions = ref<Suggestion[]>([])
const collectionSuggestions = ref<Suggestion[]>([])
const recentSearches = computed(() => props.searchHistory.slice(0, 10))
const popularSearches = ref<{ query: string; count: number }[]>([])
const inlineSuggestions = ref<string[]>([])
const selectedIndex = ref(-1)
const showSearchTips = ref(true)

// Statistics
const searchStats = computed(() => ({
  totalSearches: props.searchHistory.length,
  uniqueQueries: new Set(props.searchHistory.map(s => s.query)).size,
  averageResults: props.searchHistory.reduce((acc, s) => acc + s.resultCount, 0) / props.searchHistory.length || 0
}))

// Suggestion generation
const generateSuggestions = debounce(async (query: string) => {
  if (!query || query.length < 2) {
    suggestions.value = []
    return
  }

  // Generate suggestions based on query
  const newSuggestions: Suggestion[] = []

  // Semantic variations
  if (query.length >= 3) {
    newSuggestions.push({
      text: `${query} recipes`,
      type: 'semantic',
      score: 0.95
    })

    newSuggestions.push({
      text: `how to ${query}`,
      type: 'semantic',
      score: 0.92
    })

    newSuggestions.push({
      text: `${query} tutorial`,
      type: 'semantic',
      score: 0.90
    })
  }

  // Exact match suggestions
  if (query.split(' ').length === 1) {
    newSuggestions.push({
      text: `"${query}"`,
      type: 'exact',
      score: 1.0
    })
  }

  // Popular completions based on history
  const historyMatches = props.searchHistory
    .filter(s => s.query.toLowerCase().startsWith(query.toLowerCase()))
    .slice(0, 3)
    .map(s => ({
      text: s.query,
      type: 'popular' as const,
      frequency: props.searchHistory.filter(h => h.query === s.query).length
    }))

  newSuggestions.push(...historyMatches)

  // Collection-specific suggestions
  if (props.selectedCollections.size > 0) {
    const collectionName = Array.from(props.selectedCollections)[0]
    collectionSuggestions.value = [
      {
        text: `${query} in ${collectionName}`,
        type: 'collection',
        collection: collectionName
      }
    ]
  }

  suggestions.value = newSuggestions.slice(0, 8)
}, 300)

// Generate popular searches
function generatePopularSearches() {
  // In a real app, this would come from the backend
  popularSearches.value = [
    { query: 'Italian recipes', count: 127 },
    { query: 'chicken dinner', count: 89 },
    { query: 'vegetarian meals', count: 76 },
    { query: 'dessert ideas', count: 65 },
    { query: 'quick breakfast', count: 54 }
  ]
}

// Generate inline suggestions
function generateInlineSuggestions() {
  // Context-aware suggestions
  const hour = new Date().getHours()
  const suggestions: string[] = []

  if (hour >= 5 && hour < 11) {
    suggestions.push('breakfast recipes', 'morning routine', 'coffee preparation')
  } else if (hour >= 11 && hour < 14) {
    suggestions.push('lunch ideas', 'quick meals', 'healthy snacks')
  } else if (hour >= 17 && hour < 21) {
    suggestions.push('dinner recipes', 'cooking tips', 'meal prep')
  } else {
    suggestions.push('late night snacks', 'desserts', 'comfort food')
  }

  // Add collection-specific suggestions
  if (props.selectedCollections.size > 0) {
    const collection = Array.from(props.selectedCollections)[0]
    if (collection.includes('recipe')) {
      suggestions.push('ingredient substitutions', 'cooking techniques')
    }
  }

  inlineSuggestions.value = suggestions.slice(0, 5)
}

// Event handlers
function handleInput(event: any) {
  const query = event.target?.value || localQuery.value
  generateSuggestions(query)
  showSuggestions.value = true
  selectedIndex.value = -1
}

function handleKeydown(event: KeyboardEvent) {
  const totalSuggestions = suggestions.value.length + recentSearches.value.length

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      selectedIndex.value = Math.min(selectedIndex.value + 1, totalSuggestions - 1)
      break

    case 'ArrowUp':
      event.preventDefault()
      selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
      break

    case 'Enter':
      event.preventDefault()
      if (selectedIndex.value >= 0) {
        if (selectedIndex.value < suggestions.value.length) {
          selectSuggestion(suggestions.value[selectedIndex.value])
        } else {
          const recentIndex = selectedIndex.value - suggestions.value.length
          selectRecentSearch(recentSearches.value[recentIndex])
        }
      } else {
        executeSearch()
      }
      break

    case 'Escape':
      showSuggestions.value = false
      selectedIndex.value = -1
      break

    case 'Tab':
      if (suggestions.value.length > 0 && selectedIndex.value === -1) {
        event.preventDefault()
        selectSuggestion(suggestions.value[0])
      }
      break
  }
}

function handleFocus() {
  if (localQuery.value.length > 0 || recentSearches.value.length > 0) {
    showSuggestions.value = true
  }
  generateInlineSuggestions()
}

function handleBlur() {
  // Delay to allow click events on suggestions
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

// Selection handlers
function selectSuggestion(suggestion: Suggestion) {
  localQuery.value = suggestion.text
  showSuggestions.value = false
  executeSearch()
}

function insertSuggestion(suggestion: Suggestion) {
  localQuery.value = suggestion.text
  searchInput.value?.focus()
}

function selectRecentSearch(search: RecentSearch) {
  localQuery.value = search.query
  showSuggestions.value = false
  executeSearch()
}

function selectPopularSearch(search: { query: string; count: number }) {
  localQuery.value = search.query
  showSuggestions.value = false
  executeSearch()
}

function selectInlineSuggestion(suggestion: string) {
  localQuery.value = suggestion
  executeSearch()
}

function executeSearch() {
  if (localQuery.value.trim()) {
    emit('search', localQuery.value)
    showSuggestions.value = false
  }
}

function clearSearch() {
  localQuery.value = ''
  suggestions.value = []
  showSuggestions.value = false
}

function removeRecentSearch(id: string) {
  // This would typically update the search history
  console.log('Removing search:', id)
}

function clearAllHistory() {
  // This would clear the search history
  console.log('Clearing all history')
  showSuggestions.value = false
}

function showAdvancedSearch() {
  showSuggestions.value = false
  emit('showAdvanced')
}

function showSearchHelp() {
  showSearchTips.value = true
}

// Utility functions
function highlightMatch(text: string, query: string): string {
  if (!query) return text

  const regex = new RegExp(`(${query})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function getSuggestionIcon(type: string): string {
  switch (type) {
    case 'semantic': return 'mdi-brain'
    case 'exact': return 'mdi-equal'
    case 'popular': return 'mdi-trending-up'
    case 'collection': return 'mdi-folder'
    case 'metadata': return 'mdi-tag'
    default: return 'mdi-magnify'
  }
}

function getSuggestionColor(type: string): string {
  switch (type) {
    case 'semantic': return 'purple'
    case 'exact': return 'green'
    case 'popular': return 'orange'
    case 'collection': return 'blue'
    case 'metadata': return 'grey'
    default: return 'primary'
  }
}

// Initialize
onMounted(() => {
  generatePopularSearches()
  generateInlineSuggestions()
})

// Watch for query changes
watch(() => props.modelValue, (newQuery) => {
  if (newQuery) {
    generateSuggestions(newQuery)
  }
})
</script>

<style scoped>
.search-suggestions-container {
  position: relative;
}

.search-tips {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.search-tips code {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.85em;
}

.inline-suggestions {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

:deep(mark) {
  background: yellow;
  padding: 0;
  font-weight: bold;
}

:deep(.v-list-item:hover) {
  background: rgba(0, 0, 0, 0.04);
}

:deep(.v-list-item.bg-grey-lighten-4) {
  background: rgba(0, 0, 0, 0.08) !important;
}
</style>