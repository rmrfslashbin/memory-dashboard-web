import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSearchHistory } from '../useSearchHistory'

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

describe('useSearchHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  it('should initialize with empty history', () => {
    const { queryHistory, recentSearches } = useSearchHistory()

    expect(queryHistory.value).toEqual([])
    expect(recentSearches.value).toEqual([])
  })

  it('should add items to history', () => {
    const { addToHistory, queryHistory } = useSearchHistory()

    const searchItem = {
      query: 'test query',
      collections: ['collection1'],
      options: { limit: 10 },
      timestamp: new Date(),
      resultCount: 5
    }

    addToHistory(searchItem)

    expect(queryHistory.value).toHaveLength(1)
    expect(queryHistory.value[0]).toMatchObject({
      query: 'test query',
      collections: ['collection1'],
      resultCount: 5
    })
    expect(queryHistory.value[0].id).toBeDefined()
  })

  it('should remove duplicate queries', () => {
    const { addToHistory, queryHistory } = useSearchHistory()

    const searchItem1 = {
      query: 'test query',
      collections: ['collection1'],
      options: { limit: 10 },
      timestamp: new Date(),
      resultCount: 5
    }

    const searchItem2 = {
      query: 'test query',
      collections: ['collection1'],
      options: { limit: 20 },
      timestamp: new Date(),
      resultCount: 8
    }

    addToHistory(searchItem1)
    addToHistory(searchItem2)

    expect(queryHistory.value).toHaveLength(1)
    expect(queryHistory.value[0].resultCount).toBe(8) // Should keep the latest
  })

  it('should limit history to max items', () => {
    const { addToHistory, queryHistory } = useSearchHistory()

    // Add more than MAX_HISTORY_ITEMS (50)
    for (let i = 0; i < 55; i++) {
      addToHistory({
        query: `test query ${i}`,
        collections: ['collection1'],
        options: { limit: 10 },
        timestamp: new Date(),
        resultCount: i
      })
    }

    expect(queryHistory.value).toHaveLength(50)
    expect(queryHistory.value[0].query).toBe('test query 54') // Most recent should be first
  })

  it('should clear all history', () => {
    const { addToHistory, clearHistory, queryHistory } = useSearchHistory()

    addToHistory({
      query: 'test query',
      collections: ['collection1'],
      options: { limit: 10 },
      timestamp: new Date(),
      resultCount: 5
    })

    expect(queryHistory.value).toHaveLength(1)

    clearHistory()

    expect(queryHistory.value).toHaveLength(0)
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('memory-search-history', '[]')
  })

  it('should remove specific history item', () => {
    const { addToHistory, removeHistoryItem, queryHistory } = useSearchHistory()

    addToHistory({
      query: 'test query 1',
      collections: ['collection1'],
      options: { limit: 10 },
      timestamp: new Date(),
      resultCount: 5
    })

    addToHistory({
      query: 'test query 2',
      collections: ['collection1'],
      options: { limit: 10 },
      timestamp: new Date(),
      resultCount: 3
    })

    expect(queryHistory.value).toHaveLength(2)

    const itemToRemove = queryHistory.value[0]
    removeHistoryItem(itemToRemove.id)

    expect(queryHistory.value).toHaveLength(1)
    expect(queryHistory.value[0].query).toBe('test query 1')
  })

  it('should return recent searches (last 10)', () => {
    const { addToHistory, recentSearches } = useSearchHistory()

    // Add 15 items
    for (let i = 0; i < 15; i++) {
      addToHistory({
        query: `test query ${i}`,
        collections: ['collection1'],
        options: { limit: 10 },
        timestamp: new Date(),
        resultCount: i
      })
    }

    expect(recentSearches.value).toHaveLength(10)
    expect(recentSearches.value[0].query).toBe('test query 14') // Most recent
  })

  it('should generate unique query options', () => {
    const { addToHistory, queryOptions } = useSearchHistory()

    addToHistory({
      query: 'query 1',
      collections: ['collection1'],
      options: { limit: 10 },
      timestamp: new Date(),
      resultCount: 5
    })

    addToHistory({
      query: 'query 2',
      collections: ['collection1'],
      options: { limit: 10 },
      timestamp: new Date(),
      resultCount: 3
    })

    addToHistory({
      query: 'query 1', // Duplicate
      collections: ['collection2'],
      options: { limit: 10 },
      timestamp: new Date(),
      resultCount: 8
    })

    expect(queryOptions.value).toContain('query 1')
    expect(queryOptions.value).toContain('query 2')
    expect(queryOptions.value).toHaveLength(2) // Should be unique
  })

  it('should return popular collections', () => {
    const { addToHistory, popularCollections } = useSearchHistory()

    // Add searches with different collections
    addToHistory({
      query: 'query 1',
      collections: ['collection1', 'collection2'],
      options: { limit: 10 },
      timestamp: new Date(),
      resultCount: 5
    })

    addToHistory({
      query: 'query 2',
      collections: ['collection1'],
      options: { limit: 10 },
      timestamp: new Date(),
      resultCount: 3
    })

    addToHistory({
      query: 'query 3',
      collections: ['collection3'],
      options: { limit: 10 },
      timestamp: new Date(),
      resultCount: 8
    })

    const popular = popularCollections.value
    expect(popular).toContain('collection1') // Most used (2 times)
    expect(popular[0]).toBe('collection1') // Should be first
  })

  it('should generate smart suggestions', () => {
    const { addToHistory, getSmartSuggestions } = useSearchHistory()

    addToHistory({
      query: 'how to cook pasta',
      collections: ['recipes'],
      options: { limit: 10 },
      timestamp: new Date(),
      resultCount: 5
    })

    addToHistory({
      query: 'pasta recipe italian',
      collections: ['recipes'],
      options: { limit: 10 },
      timestamp: new Date(),
      resultCount: 8
    })

    const suggestions = getSmartSuggestions('pasta')
    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.some(s => s.includes('pasta'))).toBe(true)
  })

  it('should return empty suggestions for short queries', () => {
    const { getSmartSuggestions } = useSearchHistory()

    expect(getSmartSuggestions('a')).toEqual([])
    expect(getSmartSuggestions('')).toEqual([])
  })

  it('should get trending queries from last 7 days', () => {
    const { addToHistory, getTrendingQueries } = useSearchHistory()

    const now = new Date()
    const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)

    // Recent query (should be included)
    addToHistory({
      query: 'recent query',
      collections: ['collection1'],
      options: { limit: 10 },
      timestamp: sixDaysAgo,
      resultCount: 5
    })

    // Old query (should be excluded)
    addToHistory({
      query: 'old query',
      collections: ['collection1'],
      options: { limit: 10 },
      timestamp: eightDaysAgo,
      resultCount: 3
    })

    const trending = getTrendingQueries()
    expect(trending.some(t => t.query === 'recent query')).toBe(true)
    expect(trending.some(t => t.query === 'old query')).toBe(false)
  })

  it('should get suggested collections based on query', () => {
    const { addToHistory, getSuggestedCollections } = useSearchHistory()

    addToHistory({
      query: 'cooking pasta',
      collections: ['recipes', 'italian'],
      options: { limit: 10 },
      timestamp: new Date(),
      resultCount: 5
    })

    addToHistory({
      query: 'pasta sauce',
      collections: ['recipes'],
      options: { limit: 10 },
      timestamp: new Date(),
      resultCount: 3
    })

    const suggestions = getSuggestedCollections('pasta')
    expect(suggestions).toContain('recipes') // Most relevant
    expect(suggestions[0]).toBe('recipes') // Should be first
  })

  it('should save and load from localStorage', () => {
    const historyData = JSON.stringify([{
      id: 'test_123',
      query: 'saved query',
      collections: ['collection1'],
      options: { limit: 10 },
      timestamp: new Date().toISOString(),
      resultCount: 5
    }])

    mockLocalStorage.getItem.mockReturnValue(historyData)

    const { queryHistory } = useSearchHistory()

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('memory-search-history')
    expect(queryHistory.value).toHaveLength(1)
    expect(queryHistory.value[0].query).toBe('saved query')
  })

  it('should handle localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error')
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { queryHistory } = useSearchHistory()

    expect(queryHistory.value).toEqual([])
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load search history:', expect.any(Error))

    consoleSpy.mockRestore()
  })
})