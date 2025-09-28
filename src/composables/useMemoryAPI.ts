import { ref, type Ref } from 'vue'
import { memoryAPI } from '@/utils/memory-api'
import type {
  SystemInfo,
  Collection,
  CollectionDetails,
  Memory,
  SearchQuery,
  SearchResult,
  Metrics,
  APIError,
} from '@/types/memory-api'

export function useMemoryAPI() {
  const loading = ref(false)
  const error: Ref<APIError | null> = ref(null)

  const setLoading = (value: boolean) => {
    loading.value = value
  }

  const setError = (err: APIError | null) => {
    error.value = err
  }

  const clearError = () => {
    error.value = null
  }

  // System Info
  const getSystemInfo = async (): Promise<SystemInfo | null> => {
    setLoading(true)
    clearError()

    try {
      const response = await memoryAPI.getSystemInfo()
      if (response.success && response.data) {
        return response.data
      } else {
        setError(response.error || { error: 'Unknown', message: 'Failed to get system info' })
        return null
      }
    } catch (err) {
      setError({ error: 'Network Error', message: 'Failed to connect to API' })
      return null
    } finally {
      setLoading(false)
    }
  }

  // Collections
  const getCollections = async (): Promise<Collection[] | null> => {
    setLoading(true)
    clearError()

    try {
      const response = await memoryAPI.getCollections()
      if (response.success && response.data) {
        return response.data
      } else {
        setError(response.error || { error: 'Unknown', message: 'Failed to get collections' })
        return null
      }
    } catch (err) {
      setError({ error: 'Network Error', message: 'Failed to connect to API' })
      return null
    } finally {
      setLoading(false)
    }
  }

  const getCollectionDetails = async (): Promise<CollectionDetails[] | null> => {
    setLoading(true)
    clearError()

    try {
      const response = await memoryAPI.getCollectionDetails()
      if (response.success && response.data) {
        return response.data
      } else {
        setError(response.error || { error: 'Unknown', message: 'Failed to get collection details' })
        return null
      }
    } catch (err) {
      setError({ error: 'Network Error', message: 'Failed to connect to API' })
      return null
    } finally {
      setLoading(false)
    }
  }

  // Memories
  const getMemories = async (
    collections?: string[],
    limit: number = 10,
    offset: number = 0
  ): Promise<{ memories: Memory[]; total: number } | null> => {
    setLoading(true)
    clearError()

    try {
      const response = await memoryAPI.getMemories(collections, limit, offset)
      if (response.success && response.data) {
        return response.data
      } else {
        setError(response.error || { error: 'Unknown', message: 'Failed to get memories' })
        return null
      }
    } catch (err) {
      setError({ error: 'Network Error', message: 'Failed to connect to API' })
      return null
    } finally {
      setLoading(false)
    }
  }

  // Search
  const searchMemories = async (query: SearchQuery): Promise<SearchResult | null> => {
    setLoading(true)
    clearError()

    try {
      const response = await memoryAPI.searchMemories(query)
      if (response.success && response.data) {
        return response.data
      } else {
        setError(response.error || { error: 'Unknown', message: 'Search failed' })
        return null
      }
    } catch (err) {
      setError({ error: 'Network Error', message: 'Failed to connect to API' })
      return null
    } finally {
      setLoading(false)
    }
  }

  // Metrics
  const getMetrics = async (): Promise<Metrics | null> => {
    setLoading(true)
    clearError()

    try {
      const response = await memoryAPI.getMetrics()
      if (response.success && response.data) {
        return response.data
      } else {
        setError(response.error || { error: 'Unknown', message: 'Failed to get metrics' })
        return null
      }
    } catch (err) {
      setError({ error: 'Network Error', message: 'Failed to connect to API' })
      return null
    } finally {
      setLoading(false)
    }
  }

  // Health Check
  const healthCheck = async (): Promise<boolean> => {
    try {
      const response = await memoryAPI.healthCheck()
      return response.success
    } catch (err) {
      return false
    }
  }

  return {
    loading,
    error,
    clearError,
    getSystemInfo,
    getCollections,
    getCollectionDetails,
    getMemories,
    searchMemories,
    getMetrics,
    healthCheck,
  }
}