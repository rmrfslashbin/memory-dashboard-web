// Memory System API Types

export interface SystemInfo {
  version: string
  uptime: string
  status: string
  build_time?: string
  git_commit?: string
}

export interface Collection {
  name: string
  count: number
  created?: string
  updated?: string
}

export interface CollectionDetails {
  name: string
  count: number
  vectors_count: number
  segments_count: number
  disk_data_size: number
  ram_data_size: number
  config: Record<string, any>
  created?: string
  updated?: string
}

export interface Memory {
  id: string
  collection: string
  content: string
  metadata?: Record<string, any>
  timestamp?: string
  score?: number
}

export interface SearchQuery {
  query: string
  collections?: string[]
  limit?: number
  score_threshold?: number
}

export interface SearchResult {
  memories: Memory[]
  total: number
  query: string
  collections: string[]
  execution_time?: number
}

export interface Metrics {
  system: {
    uptime: string
    memory_usage: number
    cpu_usage?: number
  }
  qdrant: {
    collections_count: number
    vectors_count: number
    segments_count: number
    disk_usage: number
    ram_usage: number
  }
  embeddings: {
    cache_hits: number
    cache_misses: number
    requests_total: number
  }
  performance: {
    avg_query_time: number
    avg_embedding_time: number
    requests_per_second: number
  }
}

export interface APIError {
  error: string
  message: string
  code?: number
  details?: Record<string, any>
}

export interface APIResponse<T = any> {
  data?: T
  error?: APIError
  success: boolean
}