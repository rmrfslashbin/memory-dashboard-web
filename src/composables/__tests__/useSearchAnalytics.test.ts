import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSearchAnalytics } from '../useSearchAnalytics'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('useSearchAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  it('should initialize with empty metrics', () => {
    const { searchMetrics, currentAnalysis } = useSearchAnalytics()

    expect(searchMetrics.value).toEqual([])
    expect(currentAnalysis.avgQueryTime).toBe(0)
    expect(currentAnalysis.totalSearches).toBe(0)
  })

  it('should record search metrics', () => {
    const { recordSearch, searchMetrics, currentAnalysis } = useSearchAnalytics()

    const metrics = {
      queryTime: 150,
      resultCount: 10,
      searchMode: 'semantic',
      collections: ['collection1'],
      minScore: 0.5,
      avgScore: 0.8,
      maxScore: 0.95,
      query: 'test query'
    }

    recordSearch(metrics)

    expect(searchMetrics.value).toHaveLength(1)
    expect(searchMetrics.value[0]).toMatchObject(metrics)
    expect(searchMetrics.value[0].timestamp).toBeInstanceOf(Date)
    expect(currentAnalysis.totalSearches).toBe(1)
    expect(currentAnalysis.avgQueryTime).toBe(150)
  })

  it('should calculate performance statistics correctly', () => {
    const { recordSearch, currentAnalysis } = useSearchAnalytics()

    // Record multiple searches with different timings
    recordSearch({
      queryTime: 100,
      resultCount: 5,
      searchMode: 'semantic',
      collections: ['collection1'],
      minScore: 0.5,
      avgScore: 0.7,
      maxScore: 0.9,
      query: 'query 1'
    })

    recordSearch({
      queryTime: 200,
      resultCount: 8,
      searchMode: 'hybrid',
      collections: ['collection2'],
      minScore: 0.6,
      avgScore: 0.8,
      maxScore: 0.95,
      query: 'query 2'
    })

    recordSearch({
      queryTime: 300,
      resultCount: 12,
      searchMode: 'semantic',
      collections: ['collection1'],
      minScore: 0.4,
      avgScore: 0.9,
      maxScore: 1.0,
      query: 'query 3'
    })

    expect(currentAnalysis.totalSearches).toBe(3)
    expect(currentAnalysis.avgQueryTime).toBe(200) // (100 + 200 + 300) / 3
    expect(currentAnalysis.fastestQuery).toBe(100)
    expect(currentAnalysis.slowestQuery).toBe(300)
    expect(currentAnalysis.mostUsedMode).toBe('semantic') // Used 2 times vs hybrid 1 time
  })

  it('should track popular collections', () => {
    const { recordSearch, currentAnalysis } = useSearchAnalytics()

    recordSearch({
      queryTime: 100,
      resultCount: 5,
      searchMode: 'semantic',
      collections: ['collection1', 'collection2'],
      minScore: 0.5,
      avgScore: 0.7,
      maxScore: 0.9,
      query: 'query 1'
    })

    recordSearch({
      queryTime: 150,
      resultCount: 8,
      searchMode: 'semantic',
      collections: ['collection1'],
      minScore: 0.5,
      avgScore: 0.8,
      maxScore: 0.95,
      query: 'query 2'
    })

    recordSearch({
      queryTime: 200,
      resultCount: 12,
      searchMode: 'semantic',
      collections: ['collection3'],
      minScore: 0.5,
      avgScore: 0.9,
      maxScore: 1.0,
      query: 'query 3'
    })

    expect(currentAnalysis.popularCollections).toContain('collection1')
    expect(currentAnalysis.popularCollections[0]).toBe('collection1') // Most used
    expect(currentAnalysis.popularCollections).toHaveLength(3)
  })

  it('should calculate score and time distributions', () => {
    const { recordSearch, currentAnalysis } = useSearchAnalytics()

    // High score result
    recordSearch({
      queryTime: 50, // Fast
      resultCount: 5,
      searchMode: 'semantic',
      collections: ['collection1'],
      minScore: 0.5,
      avgScore: 0.9, // High score
      maxScore: 0.95,
      query: 'query 1'
    })

    // Medium score result
    recordSearch({
      queryTime: 300, // Medium speed
      resultCount: 8,
      searchMode: 'semantic',
      collections: ['collection1'],
      minScore: 0.5,
      avgScore: 0.6, // Medium score
      maxScore: 0.8,
      query: 'query 2'
    })

    // Low score result
    recordSearch({
      queryTime: 800, // Slow
      resultCount: 12,
      searchMode: 'semantic',
      collections: ['collection1'],
      minScore: 0.5,
      avgScore: 0.3, // Low score
      maxScore: 0.5,
      query: 'query 3'
    })

    expect(currentAnalysis.scoreDistribution.high).toBe(1) // >= 0.8
    expect(currentAnalysis.scoreDistribution.medium).toBe(1) // 0.5-0.79
    expect(currentAnalysis.scoreDistribution.low).toBe(1) // < 0.5

    expect(currentAnalysis.timeDistribution.fast).toBe(1) // < 100ms
    expect(currentAnalysis.timeDistribution.medium).toBe(1) // 100-500ms
    expect(currentAnalysis.timeDistribution.slow).toBe(1) // > 500ms
  })

  it('should generate performance insights', () => {
    const { recordSearch, performanceInsights } = useSearchAnalytics()

    // Add a slow query to trigger warning
    recordSearch({
      queryTime: 1500, // Very slow
      resultCount: 5,
      searchMode: 'semantic',
      collections: ['collection1'],
      minScore: 0.5,
      avgScore: 0.7,
      maxScore: 0.9,
      query: 'slow query'
    })

    const insights = performanceInsights.value
    expect(insights.length).toBeGreaterThan(0)
    expect(insights.some(insight => insight.type === 'warning')).toBe(true)
  })

  it('should provide optimization suggestions for fast queries', () => {
    const { recordSearch, performanceInsights } = useSearchAnalytics()

    // Add multiple fast queries
    for (let i = 0; i < 15; i++) {
      recordSearch({
        queryTime: 50, // Fast
        resultCount: 5,
        searchMode: 'semantic',
        collections: ['collection1'],
        minScore: 0.5,
        avgScore: 0.8,
        maxScore: 0.9,
        query: `fast query ${i}`
      })
    }

    const insights = performanceInsights.value
    expect(insights.some(insight =>
      insight.type === 'info' && insight.title === 'Excellent Performance'
    )).toBe(true)
  })

  it('should detect low score results', () => {
    const { recordSearch, performanceInsights } = useSearchAnalytics()

    // Add queries with mostly low scores
    for (let i = 0; i < 10; i++) {
      recordSearch({
        queryTime: 100,
        resultCount: 5,
        searchMode: 'semantic',
        collections: ['collection1'],
        minScore: 0.5,
        avgScore: 0.3, // Low score
        maxScore: 0.4,
        query: `low score query ${i}`
      })
    }

    const insights = performanceInsights.value
    expect(insights.some(insight =>
      insight.title === 'Low Score Results'
    )).toBe(true)
  })

  it('should return recent metrics', () => {
    const { recordSearch, recentMetrics } = useSearchAnalytics()

    // Add 25 metrics
    for (let i = 0; i < 25; i++) {
      recordSearch({
        queryTime: 100 + i,
        resultCount: 5,
        searchMode: 'semantic',
        collections: ['collection1'],
        minScore: 0.5,
        avgScore: 0.7,
        maxScore: 0.9,
        query: `query ${i}`
      })
    }

    expect(recentMetrics.value).toHaveLength(20) // Should limit to 20
    expect(recentMetrics.value[0].query).toBe('query 24') // Most recent first
  })

  it('should clear analytics data', () => {
    const { recordSearch, clearAnalytics, searchMetrics, currentAnalysis } = useSearchAnalytics()

    recordSearch({
      queryTime: 100,
      resultCount: 5,
      searchMode: 'semantic',
      collections: ['collection1'],
      minScore: 0.5,
      avgScore: 0.7,
      maxScore: 0.9,
      query: 'test query'
    })

    expect(searchMetrics.value).toHaveLength(1)
    expect(currentAnalysis.totalSearches).toBe(1)

    clearAnalytics()

    expect(searchMetrics.value).toHaveLength(0)
    expect(currentAnalysis.totalSearches).toBe(0)
  })

  it('should export analytics data', () => {
    const { recordSearch, exportAnalytics } = useSearchAnalytics()

    recordSearch({
      queryTime: 100,
      resultCount: 5,
      searchMode: 'semantic',
      collections: ['collection1'],
      minScore: 0.5,
      avgScore: 0.7,
      maxScore: 0.9,
      query: 'test query'
    })

    // Mock document.createElement and URL.createObjectURL
    const mockA = { click: vi.fn(), href: '', download: '' }
    vi.spyOn(document, 'createElement').mockReturnValue(mockA as any)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('mock-url')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

    exportAnalytics()

    expect(mockA.click).toHaveBeenCalled()
    expect(mockA.download).toMatch(/search-analytics-\d{4}-\d{2}-\d{2}\.json/)
  })

  it('should get query time trend', () => {
    const { recordSearch, getQueryTimeTrend, searchMetrics } = useSearchAnalytics()

    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

    recordSearch({
      queryTime: 100,
      resultCount: 5,
      searchMode: 'semantic',
      collections: ['collection1'],
      minScore: 0.5,
      avgScore: 0.7,
      maxScore: 0.9,
      query: 'query 1'
    })

    recordSearch({
      queryTime: 200,
      resultCount: 8,
      searchMode: 'semantic',
      collections: ['collection1'],
      minScore: 0.5,
      avgScore: 0.8,
      maxScore: 0.95,
      query: 'query 2'
    })

    // Manually set timestamps for testing
    if (searchMetrics.value[0]) searchMetrics.value[0].timestamp = yesterday
    if (searchMetrics.value[1]) searchMetrics.value[1].timestamp = twoDaysAgo

    const trend = getQueryTimeTrend(3)
    expect(trend).toHaveLength(3) // 3 days
    expect(trend.every(day => day.date && typeof day.avgQueryTime === 'number')).toBe(true)
  })

  it('should limit stored metrics to maximum', () => {
    const { recordSearch, searchMetrics } = useSearchAnalytics()

    // Add more than MAX_METRICS_ITEMS (500)
    for (let i = 0; i < 505; i++) {
      recordSearch({
        queryTime: 100,
        resultCount: 5,
        searchMode: 'semantic',
        collections: ['collection1'],
        minScore: 0.5,
        avgScore: 0.7,
        maxScore: 0.9,
        query: `query ${i}`
      })
    }

    expect(searchMetrics.value).toHaveLength(500) // Should be limited
    expect(searchMetrics.value[0].query).toBe('query 504') // Most recent should be first
  })

  it('should handle localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error')
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { searchMetrics } = useSearchAnalytics()

    expect(searchMetrics.value).toEqual([])
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load search analytics:', expect.any(Error))

    consoleSpy.mockRestore()
  })
})