import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryAPIClient } from '@/utils/memory-api'
import { useMemoryAPI } from '@/composables/useMemoryAPI'

// Global fetch mock
global.fetch = vi.fn()

describe('Memory API Integration Tests', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.mocked(fetch)
    mockFetch.mockClear()
  })

  describe('Basic API Connectivity', () => {
    it('should successfully connect to health endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'healthy' })
      } as Response)

      const client = new MemoryAPIClient('http://localhost:8080')
      const result = await client.healthCheck()

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('healthy')
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
    })

    it('should handle connection errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'))

      const client = new MemoryAPIClient('http://localhost:8080')
      const result = await client.healthCheck()

      expect(result.success).toBe(false)
      expect(result.error?.error).toBe('Error')
      expect(result.error?.message).toBe('Connection refused')
    })

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Database connection failed' })
      } as Response)

      const client = new MemoryAPIClient('http://localhost:8080')
      const result = await client.getSystemInfo()

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(500)
      expect(result.error?.message).toBe('Database connection failed')
    })
  })

  describe('Search API Integration', () => {
    it('should perform semantic search successfully', async () => {
      const mockSearchResult = {
        memories: [
          {
            id: '1',
            collection: 'documents',
            content: 'AI research paper content',
            metadata: { author: 'Dr. Smith', year: 2024 },
            score: 0.89,
            timestamp: '2024-01-01T10:00:00Z'
          }
        ],
        total: 1,
        query: 'artificial intelligence',
        collections: ['documents'],
        execution_time: 125
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockSearchResult
      } as Response)

      const client = new MemoryAPIClient('http://localhost:8080')
      const result = await client.searchMemories({
        query: 'artificial intelligence',
        collections: ['documents'],
        limit: 10,
        score_threshold: 0.7
      })

      expect(result.success).toBe(true)
      expect(result.data?.memories).toHaveLength(1)
      expect(result.data?.memories[0].score).toBe(0.89)
      expect(result.data?.execution_time).toBe(125)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/query',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            query: 'artificial intelligence',
            collections: ['documents'],
            limit: 10,
            score_threshold: 0.7
          })
        })
      )
    })

    it('should handle empty search results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          memories: [],
          total: 0,
          query: 'nonexistent query',
          collections: ['documents'],
          execution_time: 45
        })
      } as Response)

      const client = new MemoryAPIClient('http://localhost:8080')
      const result = await client.searchMemories({
        query: 'nonexistent query',
        collections: ['documents']
      })

      expect(result.success).toBe(true)
      expect(result.data?.memories).toHaveLength(0)
      expect(result.data?.total).toBe(0)
    })

    it('should handle search timeout errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 408,
        statusText: 'Request Timeout',
        json: async () => ({ message: 'Search request timed out' })
      } as Response)

      const client = new MemoryAPIClient('http://localhost:8080')
      const result = await client.searchMemories({
        query: 'test query',
        collections: ['documents']
      })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe(408)
      expect(result.error?.message).toBe('Search request timed out')
    })
  })

  describe('Collections API Integration', () => {
    it('should fetch collections list successfully', async () => {
      const mockCollections = [
        { name: 'documents', count: 150, created: '2024-01-01T10:00:00Z' },
        { name: 'notes', count: 75, created: '2024-01-02T11:00:00Z' },
        { name: 'research', count: 200, created: '2024-01-03T12:00:00Z' }
      ]

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockCollections
      } as Response)

      const client = new MemoryAPIClient('http://localhost:8080')
      const result = await client.getCollections()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(3)
      expect(result.data?.[0].name).toBe('documents')
      expect(result.data?.[1].count).toBe(75)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/collections',
        expect.any(Object)
      )
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
          config: { distance: 'Cosine', size: 1536 }
        }
      ]

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockCollectionDetails
      } as Response)

      const client = new MemoryAPIClient('http://localhost:8080')
      const result = await client.getCollectionDetails()

      expect(result.success).toBe(true)
      expect(result.data?.[0].vectors_count).toBe(150)
      expect(result.data?.[0].config?.distance).toBe('Cosine')
    })
  })

  describe('Metrics API Integration', () => {
    it('should fetch system metrics successfully', async () => {
      const mockMetrics = {
        system: {
          uptime: '2h 15m 30s',
          memory_usage: 512,
          cpu_usage: 25.5
        },
        qdrant: {
          collections_count: 3,
          vectors_count: 10000,
          segments_count: 5,
          disk_usage: 2048,
          ram_usage: 512
        },
        embeddings: {
          cache_hits: 850,
          cache_misses: 150,
          requests_total: 1000
        },
        performance: {
          avg_query_time: 125.5,
          avg_embedding_time: 45.2,
          requests_per_second: 12.3
        }
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockMetrics
      } as Response)

      const client = new MemoryAPIClient('http://localhost:8080')
      const result = await client.getMetrics()

      expect(result.success).toBe(true)
      expect(result.data?.system.uptime).toBe('2h 15m 30s')
      expect(result.data?.qdrant.collections_count).toBe(3)
      expect(result.data?.performance.avg_query_time).toBe(125.5)
    })
  })

  describe('Composable Integration', () => {
    it('should integrate with useMemoryAPI composable', async () => {
      const mockSearchResult = {
        memories: [
          {
            id: '1',
            collection: 'test',
            content: 'Test content',
            score: 0.8
          }
        ],
        total: 1,
        query: 'test',
        collections: ['test']
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockSearchResult
      } as Response)

      const { searchMemories, loading, error } = useMemoryAPI()

      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()

      const result = await searchMemories({
        query: 'test',
        collections: ['test'],
        limit: 10
      })

      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
      expect(result?.memories).toHaveLength(1)
      expect(result?.memories[0].content).toBe('Test content')
    })

    it('should handle composable error states', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' })
      } as Response)

      const { searchMemories, loading, error } = useMemoryAPI()

      await expect(searchMemories({
        query: 'test'
      })).rejects.toThrow('Internal server error')

      expect(loading.value).toBe(false)
      expect(error.value).toBe('Internal server error')
    })
  })

  describe('URL Configuration', () => {
    it('should handle different base URLs correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok' })
      } as Response)

      const client = new MemoryAPIClient('https://api.example.com:9000')
      await client.healthCheck()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com:9000/',
        expect.any(Object)
      )
    })

    it('should handle trailing slashes in URLs', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok' })
      } as Response)

      const client = new MemoryAPIClient('http://localhost:8080/')
      await client.healthCheck()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/',
        expect.any(Object)
      )
    })

    it('should encode URL parameters correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ name: 'test & demo', count: 10 })
      } as Response)

      const client = new MemoryAPIClient('http://localhost:8080')
      await client.getCollectionDetail('test & demo')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/collections/test%20%26%20demo',
        expect.any(Object)
      )
    })
  })

  describe('Request Timeout Handling', () => {
    it('should handle fetch timeouts', async () => {
      // Create a client with very short timeout
      const client = new MemoryAPIClient('http://localhost:8080', 10)

      mockFetch.mockImplementation(() =>
        new Promise((resolve) => setTimeout(resolve, 100))
      )

      const result = await client.getSystemInfo()

      expect(result.success).toBe(false)
      expect(result.error?.error).toBe('TypeError')
    })
  })

  describe('Error Recovery', () => {
    it('should allow retry after failures', async () => {
      const client = new MemoryAPIClient('http://localhost:8080')

      // First request fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({ message: 'Service temporarily unavailable' })
      } as Response)

      const firstResult = await client.getSystemInfo()
      expect(firstResult.success).toBe(false)

      // Second request succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ version: '2025.07.0', status: 'running' })
      } as Response)

      const secondResult = await client.getSystemInfo()
      expect(secondResult.success).toBe(true)
      expect(secondResult.data?.version).toBe('2025.07.0')
    })
  })
})