import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useMemoryAPI } from '@/composables/useMemoryAPI'
import * as memoryApiModule from '@/utils/memory-api'

// Mock the entire memory-api module
vi.mock('@/utils/memory-api', () => ({
  memoryAPI: {
    searchMemories: vi.fn(),
    getCollections: vi.fn(),
    getCollectionDetails: vi.fn(),
    getSystemInfo: vi.fn(),
    getMetrics: vi.fn()
  }
}))

describe('useMemoryAPI Integration Tests', () => {
  const mockMemoryAPI = memoryApiModule.memoryAPI

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Search Integration', () => {
    it('should perform successful memory search with loading states', async () => {
      const mockSearchResult = {
        memories: [
          {
            id: '1',
            collection: 'documents',
            content: 'Test memory content',
            metadata: { type: 'test' },
            score: 0.85
          }
        ],
        total: 1,
        query: 'test query',
        collections: ['documents'],
        execution_time: 125
      }

      vi.mocked(mockMemoryAPI.searchMemories).mockResolvedValue({
        success: true,
        data: mockSearchResult
      })

      const { searchMemories, loading, error } = useMemoryAPI()

      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()

      const searchParams = {
        query: 'test query',
        collections: ['documents'],
        limit: 10,
        sortBy: 'score',
        minScore: 0.5,
        searchMode: 'semantic'
      }

      const searchPromise = searchMemories(searchParams)
      expect(loading.value).toBe(true)

      const result = await searchPromise

      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(result).toEqual(mockSearchResult)

      expect(mockMemoryAPI.searchMemories).toHaveBeenCalledWith({
        query: 'test query',
        collections: ['documents'],
        limit: 10,
        sort_by: 'score',
        min_score: 0.5,
        search_mode: 'semantic'
      })
    })

    it('should handle search errors and update error state', async () => {
      vi.mocked(mockMemoryAPI.searchMemories).mockResolvedValue({
        success: false,
        error: {
          error: 'SearchError',
          message: 'Failed to connect to Qdrant',
          code: 500
        }
      })

      const { searchMemories, loading, error } = useMemoryAPI()

      await expect(searchMemories({
        query: 'test query',
        collections: ['documents']
      })).rejects.toThrow('Failed to connect to Qdrant')

      expect(loading.value).toBe(false)
      expect(error.value).toBe('Failed to connect to Qdrant')
    })

    it('should handle network errors during search', async () => {
      vi.mocked(mockMemoryAPI.searchMemories).mockRejectedValue(
        new Error('Network timeout')
      )

      const { searchMemories, loading, error } = useMemoryAPI()

      await expect(searchMemories({
        query: 'test query'
      })).rejects.toThrow('Network timeout')

      expect(loading.value).toBe(false)
      expect(error.value).toBe('Network timeout')
    })

    it('should use default search parameters when not provided', async () => {
      vi.mocked(mockMemoryAPI.searchMemories).mockResolvedValue({
        success: true,
        data: {
          memories: [],
          total: 0,
          query: 'test',
          collections: [],
          execution_time: 50
        }
      })

      const { searchMemories } = useMemoryAPI()

      await searchMemories({ query: 'test' })

      expect(mockMemoryAPI.searchMemories).toHaveBeenCalledWith({
        query: 'test',
        collections: [],
        limit: 10,
        sort_by: 'score',
        min_score: 0,
        search_mode: 'semantic'
      })
    })
  })

  describe('Collections Integration', () => {
    it('should fetch collections successfully', async () => {
      const mockCollections = [
        { name: 'documents', count: 150, created: '2025-01-01T10:00:00Z' },
        { name: 'notes', count: 75, created: '2025-01-02T11:00:00Z' }
      ]

      vi.mocked(mockMemoryAPI.getCollections).mockResolvedValue({
        success: true,
        data: mockCollections
      })

      const { getCollections, loading, error } = useMemoryAPI()

      const result = await getCollections()

      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(result.collections).toEqual(mockCollections)
    })

    it('should handle collections fetch errors', async () => {
      vi.mocked(mockMemoryAPI.getCollections).mockResolvedValue({
        success: false,
        error: {
          error: 'DatabaseError',
          message: 'Connection to Qdrant failed'
        }
      })

      const { getCollections, loading, error } = useMemoryAPI()

      await expect(getCollections()).rejects.toThrow('Connection to Qdrant failed')

      expect(loading.value).toBe(false)
      expect(error.value).toBe('Connection to Qdrant failed')
    })

    it('should fetch collection details successfully', async () => {
      const mockCollectionDetails = [
        {
          name: 'documents',
          count: 150,
          vectors_count: 150,
          segments_count: 1,
          disk_data_size: 1024000,
          ram_data_size: 512000,
          config: { distance: 'Cosine' }
        }
      ]

      vi.mocked(mockMemoryAPI.getCollectionDetails).mockResolvedValue({
        success: true,
        data: mockCollectionDetails
      })

      const { getCollectionDetails, loading, error } = useMemoryAPI()

      const result = await getCollectionDetails()

      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(result).toEqual(mockCollectionDetails)
    })
  })

  describe('System Information Integration', () => {
    it('should fetch system info successfully', async () => {
      const mockSystemInfo = {
        version: '2025.07.0',
        uptime: '2h 15m',
        status: 'running',
        build_time: '2025-07-01T12:00:00Z',
        git_commit: 'abc123'
      }

      vi.mocked(mockMemoryAPI.getSystemInfo).mockResolvedValue({
        success: true,
        data: mockSystemInfo
      })

      const { getSystemInfo, loading, error } = useMemoryAPI()

      const result = await getSystemInfo()

      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(result).toEqual(mockSystemInfo)
    })

    it('should handle system info fetch errors', async () => {
      vi.mocked(mockMemoryAPI.getSystemInfo).mockRejectedValue(
        new Error('Service unavailable')
      )

      const { getSystemInfo, error } = useMemoryAPI()

      await expect(getSystemInfo()).rejects.toThrow('Service unavailable')
      expect(error.value).toBe('Service unavailable')
    })
  })

  describe('Metrics Integration', () => {
    it('should fetch metrics successfully', async () => {
      const mockMetrics = {
        system: {
          uptime: '2h 30m',
          memory_usage: 512,
          cpu_usage: 25
        },
        qdrant: {
          collections_count: 5,
          vectors_count: 10000,
          segments_count: 20,
          disk_usage: 1024,
          ram_usage: 256
        },
        embeddings: {
          cache_hits: 850,
          cache_misses: 150,
          requests_total: 1000
        },
        performance: {
          avg_query_time: 125,
          avg_embedding_time: 75,
          requests_per_second: 10.5
        }
      }

      vi.mocked(mockMemoryAPI.getMetrics).mockResolvedValue({
        success: true,
        data: mockMetrics
      })

      const { getMetrics, loading, error } = useMemoryAPI()

      const result = await getMetrics()

      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(result).toEqual(mockMetrics)
    })

    it('should handle metrics fetch timeouts', async () => {
      vi.mocked(mockMemoryAPI.getMetrics).mockResolvedValue({
        success: false,
        error: {
          error: 'TimeoutError',
          message: 'Request timeout after 10 seconds'
        }
      })

      const { getMetrics, error } = useMemoryAPI()

      await expect(getMetrics()).rejects.toThrow('Request timeout after 10 seconds')
      expect(error.value).toBe('Request timeout after 10 seconds')
    })
  })

  describe('Export Functionality Integration', () => {
    it('should export search results successfully', async () => {
      // Mock DOM APIs
      const mockBlob = vi.fn()
      global.Blob = mockBlob as any

      const mockCreateObjectURL = vi.fn().mockReturnValue('mock-url')
      const mockRevokeObjectURL = vi.fn()
      global.URL = {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL
      } as any

      const mockA = {
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn()
      }
      const mockAppendChild = vi.fn()
      const mockRemoveChild = vi.fn()
      vi.spyOn(document, 'createElement').mockReturnValue(mockA as any)
      vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild)
      vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild)

      const { exportSearchResults, error } = useMemoryAPI()

      const mockResults = [
        {
          id: '1',
          content: 'Test result',
          score: 0.85
        }
      ]

      const mockMetadata = {
        query: 'test query',
        collections: ['documents'],
        options: { limit: 10 }
      }

      await exportSearchResults(mockResults, mockMetadata)

      expect(error.value).toBeNull()
      expect(mockBlob).toHaveBeenCalledWith(
        [expect.stringContaining('"query": "test query"')],
        { type: 'application/json' }
      )
      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockA.click).toHaveBeenCalled()
      expect(mockA.download).toMatch(/memory-search-results-\d{4}-\d{2}-\d{2}\.json/)
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-url')
    })

    it('should handle export errors gracefully', async () => {
      // Mock Blob to throw an error
      global.Blob = vi.fn().mockImplementation(() => {
        throw new Error('Blob creation failed')
      }) as any

      const { exportSearchResults, error } = useMemoryAPI()

      await expect(exportSearchResults([], {})).rejects.toThrow('Blob creation failed')
      expect(error.value).toBe('Blob creation failed')
    })
  })

  describe('Loading State Management', () => {
    it('should manage loading state correctly for single request', async () => {
      vi.mocked(mockMemoryAPI.getSystemInfo).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true, data: {} }), 50))
      )

      const { getSystemInfo, loading } = useMemoryAPI()

      expect(loading.value).toBe(false)

      const systemPromise = getSystemInfo()
      expect(loading.value).toBe(true)

      await systemPromise
      expect(loading.value).toBe(false)
    })

    it('should reset error state on new successful requests', async () => {
      const { searchMemories, error } = useMemoryAPI()

      // First request fails
      vi.mocked(mockMemoryAPI.searchMemories).mockResolvedValueOnce({
        success: false,
        error: { error: 'Error', message: 'First error' }
      })

      await expect(searchMemories({ query: 'test' })).rejects.toThrow()
      expect(error.value).toBe('First error')

      // Second request succeeds
      vi.mocked(mockMemoryAPI.searchMemories).mockResolvedValueOnce({
        success: true,
        data: { memories: [], total: 0, query: 'test', collections: [] }
      })

      await searchMemories({ query: 'test' })
      expect(error.value).toBeNull() // Error should be cleared
    })
  })

  describe('Error Recovery Integration', () => {
    it('should allow retry after network failures', async () => {
      const { searchMemories, error } = useMemoryAPI()

      // First attempt fails
      vi.mocked(mockMemoryAPI.searchMemories).mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(searchMemories({ query: 'test' })).rejects.toThrow('Network error')
      expect(error.value).toBe('Network error')

      // Second attempt succeeds
      vi.mocked(mockMemoryAPI.searchMemories).mockResolvedValueOnce({
        success: true,
        data: { memories: [], total: 0, query: 'test', collections: [] }
      })

      const result = await searchMemories({ query: 'test' })
      expect(error.value).toBeNull()
      expect(result).toBeDefined()
    })
  })
})