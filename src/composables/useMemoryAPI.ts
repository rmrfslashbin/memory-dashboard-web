import { ref } from 'vue'
import { memoryAPI } from '@/utils/memory-api'
import { useErrorHandler } from '@/composables/useErrorHandler'
import type { SearchQuery, SearchResult } from '@/types/memory-api'

interface SearchParams {
  query: string
  collections?: string[]
  limit?: number
  sortBy?: string
  minScore?: number
  searchMode?: string
}

export function useMemoryAPI() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { handleError, attemptRecovery } = useErrorHandler()

  async function searchMemories(params: SearchParams) {
    loading.value = true
    error.value = null

    const retryFn = async () => {
      const searchQuery: SearchQuery = {
        query: params.query,
        collections: params.collections || [],
        limit: params.limit || 10,
        sort_by: params.sortBy || 'score',
        min_score: params.minScore || 0,
        search_mode: params.searchMode || 'semantic'
      }

      const response = await memoryAPI.searchMemories(searchQuery)

      if (!response.success) {
        const apiError = new Error(response.error?.message || 'Search failed')
        // Attach additional error info for better error handling
        ;(apiError as any).status = response.error?.code
        ;(apiError as any).details = response.error?.details
        throw apiError
      }

      return response.data
    }

    try {
      return await retryFn()
    } catch (err) {
      const appError = await handleError(err as Error, {
        component: 'useMemoryAPI',
        action: 'searchMemories',
        data: params,
        retry: retryFn
      })

      error.value = appError.userMessage
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getCollections() {
    loading.value = true
    error.value = null

    try {
      const response = await memoryAPI.getCollections()

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load collections')
      }

      return { collections: response.data }

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load collections'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getCollectionDetails() {
    loading.value = true
    error.value = null

    try {
      const response = await memoryAPI.getCollectionDetails()

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load collection details')
      }

      return response.data

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load collection details'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getSystemInfo() {
    loading.value = true
    error.value = null

    try {
      const response = await memoryAPI.getSystemInfo()

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load system info')
      }

      return response.data

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load system info'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function getMetrics() {
    loading.value = true
    error.value = null

    try {
      const response = await memoryAPI.getMetrics()

      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load metrics')
      }

      return response.data

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load metrics'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function exportSearchResults(results: any[], metadata: any): Promise<void> {
    try {
      const exportData = {
        query: metadata.query,
        collections: metadata.collections,
        options: metadata.options,
        timestamp: new Date().toISOString(),
        results: results
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `memory-search-results-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to export results'
      throw err
    }
  }

  return {
    loading,
    error,
    searchMemories,
    getCollections,
    getCollectionDetails,
    getSystemInfo,
    getMetrics,
    exportSearchResults
  }
}