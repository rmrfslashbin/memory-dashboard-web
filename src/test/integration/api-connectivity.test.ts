import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MemoryAPIClient } from '@/utils/memory-api'
import type { SearchQuery } from '@/types/memory-api'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('API Connectivity Integration Tests', () => {
  let apiClient: MemoryAPIClient
  const mockBaseURL = 'http://localhost:8080'

  beforeEach(() => {
    apiClient = new MemoryAPIClient(mockBaseURL, 5000)
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Network Connectivity', () => {
    it('should handle successful API connection', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          version: '2025.07.0',
          uptime: '1h 30m',
          status: 'running'
        })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await apiClient.getSystemInfo()

      expect(result.success).toBe(true)
      expect(result.data?.version).toBe('2025.07.0')
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/system/info',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          signal: expect.any(AbortSignal)
        })
      )
    })

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AbortError')), 100)
        )
      )

      const shortTimeoutClient = new MemoryAPIClient(mockBaseURL, 50)
      const result = await shortTimeoutClient.getSystemInfo()

      expect(result.success).toBe(false)
      expect(result.error?.error).toBe('Error')
      expect(result.error?.message).toBe('AbortError')
    })

    it('should handle connection refused errors', async () => {
      mockFetch.mockRejectedValue(new Error('fetch failed'))

      const result = await apiClient.getSystemInfo()

      expect(result.success).toBe(false)
      expect(result.error?.error).toBe('Error')
      expect(result.error?.message).toBe('fetch failed')
    })

    it('should handle DNS resolution failures', async () => {
      const invalidClient = new MemoryAPIClient('http://nonexistent-domain.local')
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

      const result = await invalidClient.getSystemInfo()

      expect(result.success).toBe(false)
      expect(result.error?.error).toBe('TypeError')
      expect(result.error?.message).toBe('Failed to fetch')
    })
  })

  describe('HTTP Status Code Handling', () => {
    it('should handle 404 Not Found', async () => {
      const mockResponse = {
        status: 404,
        ok: false,
        statusText: 'Not Found',
        json: vi.fn().mockResolvedValue({
          message: 'Endpoint not found'
        })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await apiClient.getSystemInfo()

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(404)
      expect(result.error?.error).toBe('HTTP 404')
      expect(result.error?.message).toBe('Endpoint not found')
    })

    it('should handle 500 Internal Server Error', async () => {
      const mockResponse = {
        status: 500,
        ok: false,
        statusText: 'Internal Server Error',
        json: vi.fn().mockResolvedValue({
          message: 'Database connection failed'
        })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await apiClient.getSystemInfo()

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(500)
      expect(result.error?.error).toBe('HTTP 500')
      expect(result.error?.message).toBe('Database connection failed')
    })

    it('should handle 401 Unauthorized', async () => {
      const mockResponse = {
        status: 401,
        ok: false,
        statusText: 'Unauthorized',
        json: vi.fn().mockResolvedValue({
          message: 'Invalid authentication credentials'
        })
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await apiClient.searchMemories({
        query: 'test',
        collections: ['test_collection']
      })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(401)
      expect(result.error?.message).toBe('Invalid authentication credentials')
    })

    it('should handle malformed JSON responses', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Unexpected token'))
      }
      mockFetch.mockResolvedValue(mockResponse)

      const result = await apiClient.getSystemInfo()

      expect(result.success).toBe(false)
      expect(result.error?.error).toBe('Error')
      expect(result.error?.message).toBe('Unexpected token')
    })
  })

  describe('CORS Handling', () => {
    it('should include proper headers for CORS requests', async () => {
      const mockResponse = {
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue([])
      }
      mockFetch.mockResolvedValue(mockResponse)

      await apiClient.getCollections()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/collections',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('should handle CORS preflight failures', async () => {
      mockFetch.mockRejectedValue(new TypeError('CORS request blocked'))

      const result = await apiClient.getCollections()

      expect(result.success).toBe(false)
      expect(result.error?.error).toBe('TypeError')
      expect(result.error?.message).toBe('CORS request blocked')
    })
  })

  describe('API Endpoint Integration', () => {
    it('should successfully fetch system information', async () => {
      const expectedSystemInfo = {
        version: '2025.07.0',
        uptime: '2h 15m',
        status: 'running',
        build_time: '2025-07-01T12:00:00Z',
        git_commit: 'abc123'
      }

      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue(expectedSystemInfo)
      })

      const result = await apiClient.getSystemInfo()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(expectedSystemInfo)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/system/info',
        expect.any(Object)
      )
    })

    it('should successfully fetch collections list', async () => {
      const expectedCollections = [
        { name: 'documents', count: 150, created: '2025-01-01T10:00:00Z' },
        { name: 'notes', count: 75, created: '2025-01-02T11:00:00Z' }
      ]

      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue(expectedCollections)
      })

      const result = await apiClient.getCollections()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(expectedCollections)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/collections',
        expect.any(Object)
      )
    })

    it('should successfully perform semantic search', async () => {
      const searchQuery: SearchQuery = {
        query: 'artificial intelligence',
        collections: ['documents'],
        limit: 10,
        score_threshold: 0.7
      }

      const expectedResults = {
        memories: [
          {
            id: '1',
            collection: 'documents',
            content: 'Article about AI advances',
            metadata: { type: 'article' },
            score: 0.85
          }
        ],
        total: 1,
        query: 'artificial intelligence',
        collections: ['documents'],
        execution_time: 150
      }

      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue(expectedResults)
      })

      const result = await apiClient.searchMemories(searchQuery)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(expectedResults)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/query',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(searchQuery),
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('should successfully fetch metrics', async () => {
      const expectedMetrics = {
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

      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue(expectedMetrics)
      })

      const result = await apiClient.getMetrics()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(expectedMetrics)
    })

    it('should handle health check endpoint', async () => {
      const expectedHealth = { status: 'healthy' }

      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue(expectedHealth)
      })

      const result = await apiClient.healthCheck()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(expectedHealth)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/',
        expect.any(Object)
      )
    })
  })

  describe('Base URL Configuration', () => {
    it('should handle base URLs with trailing slashes', () => {
      const clientWithSlash = new MemoryAPIClient('http://localhost:8080/')
      expect(clientWithSlash.getBaseURL()).toBe('http://localhost:8080')
    })

    it('should handle base URLs without trailing slashes', () => {
      const clientWithoutSlash = new MemoryAPIClient('http://localhost:8080')
      expect(clientWithoutSlash.getBaseURL()).toBe('http://localhost:8080')
    })

    it('should allow runtime base URL changes', () => {
      apiClient.setBaseURL('http://production.api.com/')
      expect(apiClient.getBaseURL()).toBe('http://production.api.com')
    })

    it('should use environment variable for default base URL', async () => {
      // This test verifies the default instance uses env var
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({ status: 'ok' })
      })

      // Import the default client to test env var usage
      const { memoryAPI } = await import('@/utils/memory-api')
      await memoryAPI.healthCheck()

      // Should use the default localhost:8080 or env var
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/^https?:\/\/[^/]+\/$/),
        expect.any(Object)
      )
    })
  })

  describe('Request Timeout Handling', () => {
    it('should handle aborted requests', async () => {
      const shortTimeoutClient = new MemoryAPIClient(mockBaseURL, 50)

      mockFetch.mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'))

      const result = await shortTimeoutClient.getSystemInfo()

      expect(result.success).toBe(false)
      expect(result.error?.error).toBe('AbortError')
      expect(result.error?.message).toBe('The operation was aborted.')
    })

    it('should complete requests within timeout', async () => {
      const longTimeoutClient = new MemoryAPIClient(mockBaseURL, 1000)

      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({ version: '2025.07.0' })
      })

      const result = await longTimeoutClient.getSystemInfo()

      expect(result.success).toBe(true)
      expect(result.data?.version).toBe('2025.07.0')
    })
  })

  describe('URL Encoding', () => {
    it('should properly encode collection names with special characters', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          name: 'test & demo',
          count: 10,
          vectors_count: 10,
          segments_count: 1,
          disk_data_size: 1024,
          ram_data_size: 512,
          config: {}
        })
      })

      await apiClient.getCollectionDetail('test & demo')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/collections/test%20%26%20demo',
        expect.any(Object)
      )
    })

    it('should handle query parameters correctly', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: vi.fn().mockResolvedValue({
          memories: [],
          total: 0
        })
      })

      await apiClient.getMemories(['collection1', 'collection2'], 25, 50)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/memories?limit=25&offset=50&collections=collection1%2Ccollection2',
        expect.any(Object)
      )
    })
  })
})