import { ref, reactive, computed } from 'vue'

export interface SearchMetrics {
  queryTime: number
  resultCount: number
  searchMode: string
  collections: string[]
  minScore: number
  avgScore: number
  maxScore: number
  query: string
  timestamp: Date
  tokensProcessed?: number
  embeddingTime?: number
  vectorSearchTime?: number
  postProcessingTime?: number
}

export interface PerformanceInsight {
  type: 'optimization' | 'warning' | 'info'
  title: string
  description: string
  suggestion: string
  severity: 'high' | 'medium' | 'low'
  icon: string
}

const STORAGE_KEY = 'memory-search-analytics'
const MAX_METRICS_ITEMS = 500

export function useSearchAnalytics() {
  const searchMetrics = ref<SearchMetrics[]>([])
  const currentAnalysis = reactive({
    avgQueryTime: 0,
    totalSearches: 0,
    fastestQuery: 0,
    slowestQuery: 0,
    mostUsedMode: '',
    popularCollections: [] as string[],
    scoreDistribution: {
      high: 0,    // >= 0.8
      medium: 0,  // 0.5 - 0.79
      low: 0      // < 0.5
    },
    timeDistribution: {
      fast: 0,    // < 100ms
      medium: 0,  // 100-500ms
      slow: 0     // > 500ms
    }
  })

  // Load metrics from localStorage
  function loadMetrics() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        searchMetrics.value = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }))
        updateAnalysis()
      }
    } catch (error) {
      console.error('Failed to load search analytics:', error)
      searchMetrics.value = []
    }
  }

  // Save metrics to localStorage
  function saveMetrics() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(searchMetrics.value))
    } catch (error) {
      console.error('Failed to save search analytics:', error)
    }
  }

  // Add search metrics
  function recordSearch(metrics: Omit<SearchMetrics, 'timestamp'>) {
    const searchMetric: SearchMetrics = {
      ...metrics,
      timestamp: new Date()
    }

    searchMetrics.value.unshift(searchMetric)

    // Limit stored metrics
    if (searchMetrics.value.length > MAX_METRICS_ITEMS) {
      searchMetrics.value = searchMetrics.value.slice(0, MAX_METRICS_ITEMS)
    }

    updateAnalysis()
    saveMetrics()
  }

  // Update analysis calculations
  function updateAnalysis() {
    if (searchMetrics.value.length === 0) {
      resetAnalysis()
      return
    }

    const metrics = searchMetrics.value
    const queryTimes = metrics.map(m => m.queryTime)
    const scores = metrics.flatMap(m => {
      // Extract scores from results if available
      return [m.avgScore].filter(Boolean)
    })

    // Basic statistics
    currentAnalysis.totalSearches = metrics.length
    currentAnalysis.avgQueryTime = queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length
    currentAnalysis.fastestQuery = Math.min(...queryTimes)
    currentAnalysis.slowestQuery = Math.max(...queryTimes)

    // Most used search mode
    const modeCount = new Map<string, number>()
    metrics.forEach(m => {
      modeCount.set(m.searchMode, (modeCount.get(m.searchMode) || 0) + 1)
    })
    currentAnalysis.mostUsedMode = Array.from(modeCount.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || ''

    // Popular collections
    const collectionCount = new Map<string, number>()
    metrics.forEach(m => {
      m.collections.forEach(collection => {
        collectionCount.set(collection, (collectionCount.get(collection) || 0) + 1)
      })
    })
    currentAnalysis.popularCollections = Array.from(collectionCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([collection]) => collection)

    // Score distribution
    currentAnalysis.scoreDistribution = {
      high: scores.filter(s => s >= 0.8).length,
      medium: scores.filter(s => s >= 0.5 && s < 0.8).length,
      low: scores.filter(s => s < 0.5).length
    }

    // Time distribution
    currentAnalysis.timeDistribution = {
      fast: queryTimes.filter(t => t < 100).length,
      medium: queryTimes.filter(t => t >= 100 && t <= 500).length,
      slow: queryTimes.filter(t => t > 500).length
    }
  }

  function resetAnalysis() {
    currentAnalysis.avgQueryTime = 0
    currentAnalysis.totalSearches = 0
    currentAnalysis.fastestQuery = 0
    currentAnalysis.slowestQuery = 0
    currentAnalysis.mostUsedMode = ''
    currentAnalysis.popularCollections = []
    currentAnalysis.scoreDistribution = { high: 0, medium: 0, low: 0 }
    currentAnalysis.timeDistribution = { fast: 0, medium: 0, slow: 0 }
  }

  // Get recent metrics (last N searches)
  const recentMetrics = computed(() =>
    searchMetrics.value.slice(0, 20)
  )

  // Get performance insights
  const performanceInsights = computed((): PerformanceInsight[] => {
    const insights: PerformanceInsight[] = []

    if (currentAnalysis.avgQueryTime > 1000) {
      insights.push({
        type: 'warning',
        title: 'Slow Average Query Time',
        description: `Average query time is ${Math.round(currentAnalysis.avgQueryTime)}ms`,
        suggestion: 'Consider reducing result limit or using more specific queries',
        severity: 'high',
        icon: 'mdi-clock-alert'
      })
    }

    if (currentAnalysis.slowestQuery > 2000) {
      insights.push({
        type: 'optimization',
        title: 'Very Slow Query Detected',
        description: `Slowest query took ${Math.round(currentAnalysis.slowestQuery)}ms`,
        suggestion: 'Review query complexity and collection size',
        severity: 'medium',
        icon: 'mdi-speedometer-slow'
      })
    }

    if (currentAnalysis.scoreDistribution.low > currentAnalysis.scoreDistribution.high) {
      insights.push({
        type: 'info',
        title: 'Low Score Results',
        description: 'Many results have low relevance scores',
        suggestion: 'Try more specific queries or adjust minimum score threshold',
        severity: 'low',
        icon: 'mdi-target-arrow'
      })
    }

    if (currentAnalysis.avgQueryTime < 200 && currentAnalysis.totalSearches > 10) {
      insights.push({
        type: 'info',
        title: 'Excellent Performance',
        description: `Average query time is only ${Math.round(currentAnalysis.avgQueryTime)}ms`,
        suggestion: 'Your search setup is well optimized!',
        severity: 'low',
        icon: 'mdi-rocket'
      })
    }

    return insights
  })

  // Clear all analytics data
  function clearAnalytics() {
    searchMetrics.value = []
    resetAnalysis()
    saveMetrics()
  }

  // Export analytics data
  function exportAnalytics() {
    const data = {
      metrics: searchMetrics.value,
      analysis: currentAnalysis,
      exportedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `search-analytics-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Get query time trend (last N days)
  function getQueryTimeTrend(days = 7) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const recentMetrics = searchMetrics.value
      .filter(m => m.timestamp >= cutoff)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    const trend = []
    const msPerDay = 24 * 60 * 60 * 1000

    for (let i = 0; i < days; i++) {
      const dayStart = new Date(cutoff.getTime() + i * msPerDay)
      const dayEnd = new Date(dayStart.getTime() + msPerDay)

      const dayMetrics = recentMetrics.filter(m =>
        m.timestamp >= dayStart && m.timestamp < dayEnd
      )

      const avgTime = dayMetrics.length > 0
        ? dayMetrics.reduce((sum, m) => sum + m.queryTime, 0) / dayMetrics.length
        : 0

      trend.push({
        date: dayStart.toISOString().split('T')[0],
        avgQueryTime: Math.round(avgTime),
        searchCount: dayMetrics.length
      })
    }

    return trend
  }

  // Get search mode distribution
  const searchModeDistribution = computed(() => {
    const distribution = new Map<string, number>()

    searchMetrics.value.forEach(m => {
      distribution.set(m.searchMode, (distribution.get(m.searchMode) || 0) + 1)
    })

    return Array.from(distribution.entries()).map(([mode, count]) => ({
      mode,
      count,
      percentage: Math.round((count / searchMetrics.value.length) * 100)
    }))
  })

  // Initialize
  loadMetrics()

  return {
    searchMetrics: searchMetrics,
    currentAnalysis,
    recentMetrics,
    performanceInsights,
    searchModeDistribution,
    recordSearch,
    clearAnalytics,
    exportAnalytics,
    getQueryTimeTrend
  }
}