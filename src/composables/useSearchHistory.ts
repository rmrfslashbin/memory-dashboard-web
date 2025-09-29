import { ref, computed } from 'vue'

interface HistoryItem {
  id: string
  query: string
  collections: string[]
  options: Record<string, any>
  timestamp: Date
  resultCount: number
}

const STORAGE_KEY = 'memory-search-history'
const MAX_HISTORY_ITEMS = 50

export function useSearchHistory() {
  const historyItems = ref<HistoryItem[]>([])

  // Load history from localStorage
  function loadHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        historyItems.value = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }))
      }
    } catch (error) {
      console.error('Failed to load search history:', error)
      historyItems.value = []
    }
  }

  // Save history to localStorage
  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historyItems.value))
    } catch (error) {
      console.error('Failed to save search history:', error)
    }
  }

  // Add item to history
  function addToHistory(item: Omit<HistoryItem, 'id'>) {
    const historyItem: HistoryItem = {
      ...item,
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Remove duplicate queries (same query + collections)
    historyItems.value = historyItems.value.filter(existing =>
      !(existing.query === item.query &&
        JSON.stringify(existing.collections.sort()) === JSON.stringify(item.collections.sort()))
    )

    // Add to beginning of list
    historyItems.value.unshift(historyItem)

    // Limit to max items
    if (historyItems.value.length > MAX_HISTORY_ITEMS) {
      historyItems.value = historyItems.value.slice(0, MAX_HISTORY_ITEMS)
    }

    saveHistory()
  }

  // Clear all history
  function clearHistory() {
    historyItems.value = []
    saveHistory()
  }

  // Remove specific item
  function removeHistoryItem(id: string) {
    historyItems.value = historyItems.value.filter(item => item.id !== id)
    saveHistory()
  }

  // Get recent searches (last 10)
  const recentSearches = computed(() =>
    historyItems.value.slice(0, 10)
  )

  // Get unique queries for suggestions
  const queryOptions = computed(() =>
    [...new Set(historyItems.value.map(item => item.query))]
      .slice(0, 20)
  )

  // Get popular collections
  const popularCollections = computed(() => {
    const collectionCounts = new Map<string, number>()

    historyItems.value.forEach(item => {
      item.collections.forEach(collection => {
        collectionCounts.set(collection, (collectionCounts.get(collection) || 0) + 1)
      })
    })

    return Array.from(collectionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([collection]) => collection)
  })

  // Initialize by loading existing history
  loadHistory()

  // Generate smart suggestions based on query input
  function getSmartSuggestions(query: string): string[] {
    if (!query || query.length < 2) return []

    const suggestions: string[] = []

    // Find partial matches in history
    const partialMatches = historyItems.value
      .filter(item => item.query.toLowerCase().includes(query.toLowerCase()))
      .map(item => item.query)
      .filter(q => q.toLowerCase() !== query.toLowerCase())
      .slice(0, 5)

    suggestions.push(...partialMatches)

    // Generate contextual suggestions
    const words = query.toLowerCase().split(' ')
    const lastWord = words[words.length - 1]

    // Common query patterns
    if (lastWord === 'how') {
      suggestions.push(`${query} to cook`, `${query} to make`, `${query} to prepare`)
    } else if (lastWord === 'recipe' || lastWord === 'recipes') {
      suggestions.push(`${query} easy`, `${query} quick`, `${query} healthy`)
    } else if (query.includes('cook') || query.includes('recipe')) {
      suggestions.push(`${query} ingredients`, `${query} steps`, `${query} time`)
    }

    // Remove duplicates and limit results
    return [...new Set(suggestions)].slice(0, 8)
  }

  // Get trending queries from history
  function getTrendingQueries(): { query: string; count: number }[] {
    const queryCount = new Map<string, number>()

    // Count queries from last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    historyItems.value
      .filter(item => item.timestamp >= weekAgo)
      .forEach(item => {
        queryCount.set(item.query, (queryCount.get(item.query) || 0) + 1)
      })

    return Array.from(queryCount.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  // Get suggested collections based on query
  function getSuggestedCollections(query: string): string[] {
    const queryLower = query.toLowerCase()

    // Find collections used with similar queries
    const relatedCollections = new Map<string, number>()

    historyItems.value
      .filter(item =>
        item.query.toLowerCase().includes(queryLower) ||
        queryLower.includes(item.query.toLowerCase())
      )
      .forEach(item => {
        item.collections.forEach(collection => {
          relatedCollections.set(collection, (relatedCollections.get(collection) || 0) + 1)
        })
      })

    return Array.from(relatedCollections.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([collection]) => collection)
      .slice(0, 3)
  }

  return {
    queryHistory: historyItems,
    recentSearches,
    queryOptions,
    popularCollections,
    addToHistory,
    clearHistory,
    removeHistoryItem,
    getSmartSuggestions,
    getTrendingQueries,
    getSuggestedCollections
  }
}