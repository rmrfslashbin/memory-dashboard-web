import type {
  SystemInfo,
  Collection,
  CollectionDetails,
  Memory,
  SearchQuery,
  SearchResult,
  Metrics,
  APIResponse,
  APIError,
} from '@/types/memory-api'

export class MemoryAPIClient {
  private baseURL: string
  private timeout: number

  constructor(baseURL: string = 'http://localhost:8080', timeout: number = 10000) {
    this.baseURL = baseURL.replace(/\/$/, '') // Remove trailing slash
    this.timeout = timeout
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: {
            error: `HTTP ${response.status}`,
            message: errorData.message || response.statusText,
            code: response.status,
            details: errorData,
          },
        }
      }

      const data = await response.json()
      return {
        success: true,
        data,
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error) {
        return {
          success: false,
          error: {
            error: error.name,
            message: error.message,
          },
        }
      }

      return {
        success: false,
        error: {
          error: 'Unknown Error',
          message: 'An unknown error occurred',
        },
      }
    }
  }

  // System Info
  async getSystemInfo(): Promise<APIResponse<SystemInfo>> {
    return this.request<SystemInfo>('/api/system/info')
  }

  // Collections
  async getCollections(): Promise<APIResponse<Collection[]>> {
    return this.request<Collection[]>('/api/collections')
  }

  async getCollectionDetails(): Promise<APIResponse<CollectionDetails[]>> {
    return this.request<CollectionDetails[]>('/api/collections/details')
  }

  async getCollectionDetail(name: string): Promise<APIResponse<CollectionDetails>> {
    return this.request<CollectionDetails>(`/api/collections/${encodeURIComponent(name)}`)
  }

  // Memories
  async getMemories(
    collections?: string[],
    limit: number = 10,
    offset: number = 0
  ): Promise<APIResponse<{ memories: Memory[]; total: number }>> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    })

    if (collections?.length) {
      params.append('collections', collections.join(','))
    }

    return this.request<{ memories: Memory[]; total: number }>(
      `/api/memories?${params.toString()}`
    )
  }

  // Semantic Search
  async searchMemories(query: SearchQuery): Promise<APIResponse<SearchResult>> {
    return this.request<SearchResult>('/api/query', {
      method: 'POST',
      body: JSON.stringify(query),
    })
  }

  // Metrics
  async getMetrics(): Promise<APIResponse<Metrics>> {
    return this.request<Metrics>('/api/metrics')
  }

  // Health Check
  async healthCheck(): Promise<APIResponse<{ status: string }>> {
    return this.request<{ status: string }>('/')
  }

  // Set base URL
  setBaseURL(url: string): void {
    this.baseURL = url.replace(/\/$/, '')
  }

  // Get current base URL
  getBaseURL(): string {
    return this.baseURL
  }
}

// Default client instance
export const memoryAPI = new MemoryAPIClient(
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'
)