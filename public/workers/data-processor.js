/**
 * Web Worker for Heavy Data Processing
 *
 * Handles computationally expensive operations like:
 * - Large dataset processing
 * - Embedding calculations
 * - Statistical analysis
 * - Data transformations
 */

// Main message handler
self.onmessage = function(event) {
  const { type, data, id } = event.data

  try {
    let result

    switch (type) {
      case 'PROCESS_SEARCH_RESULTS':
        result = processSearchResults(data)
        break

      case 'CALCULATE_EMBEDDINGS_STATS':
        result = calculateEmbeddingsStats(data)
        break

      case 'CLUSTER_DATA':
        result = clusterData(data)
        break

      case 'FILTER_LARGE_DATASET':
        result = filterLargeDataset(data)
        break

      case 'COMPUTE_SIMILARITY_MATRIX':
        result = computeSimilarityMatrix(data)
        break

      case 'AGGREGATE_METRICS':
        result = aggregateMetrics(data)
        break

      default:
        throw new Error(`Unknown operation type: ${type}`)
    }

    // Send result back to main thread
    self.postMessage({
      id,
      success: true,
      result
    })

  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      id,
      success: false,
      error: {
        message: error.message,
        stack: error.stack
      }
    })
  }
}

// Process search results for visualization
function processSearchResults(data) {
  const { memories, options = {} } = data
  const { maxPoints = 10000, includeEmbeddings = false } = options

  // Sample data if too large
  let processedMemories = memories
  if (memories.length > maxPoints) {
    const interval = Math.floor(memories.length / maxPoints)
    processedMemories = memories.filter((_, index) => index % interval === 0)
  }

  // Extract key information
  const processed = processedMemories.map((memory, index) => {
    const baseInfo = {
      id: memory.id,
      content: memory.content,
      collection: memory.collection,
      score: memory.score || 0,
      timestamp: memory.timestamp,
      index
    }

    // Include embeddings if requested
    if (includeEmbeddings && memory.embedding) {
      baseInfo.embedding = memory.embedding
      baseInfo.embeddingDimensions = memory.embedding.length
    }

    // Extract metadata features
    if (memory.metadata) {
      baseInfo.hasAuthor = !!memory.metadata.author
      baseInfo.hasDate = !!memory.metadata.date
      baseInfo.metadataKeys = Object.keys(memory.metadata)
      baseInfo.metadataCount = baseInfo.metadataKeys.length
    }

    return baseInfo
  })

  return {
    memories: processed,
    totalCount: memories.length,
    processedCount: processed.length,
    samplingRatio: processed.length / memories.length,
    statistics: calculateBasicStats(processed)
  }
}

// Calculate embedding statistics
function calculateEmbeddingsStats(embeddings) {
  if (!Array.isArray(embeddings) || embeddings.length === 0) {
    return { error: 'No embeddings provided' }
  }

  const dimensions = embeddings[0].length
  const means = new Array(dimensions).fill(0)
  const mins = new Array(dimensions).fill(Infinity)
  const maxs = new Array(dimensions).fill(-Infinity)

  // Calculate means, mins, maxs
  for (let i = 0; i < embeddings.length; i++) {
    const embedding = embeddings[i]
    for (let j = 0; j < dimensions; j++) {
      const value = embedding[j]
      means[j] += value
      mins[j] = Math.min(mins[j], value)
      maxs[j] = Math.max(maxs[j], value)
    }
  }

  // Finalize means
  for (let j = 0; j < dimensions; j++) {
    means[j] /= embeddings.length
  }

  // Calculate variances
  const variances = new Array(dimensions).fill(0)
  for (let i = 0; i < embeddings.length; i++) {
    const embedding = embeddings[i]
    for (let j = 0; j < dimensions; j++) {
      const diff = embedding[j] - means[j]
      variances[j] += diff * diff
    }
  }

  for (let j = 0; j < dimensions; j++) {
    variances[j] /= embeddings.length
  }

  const stdDeviations = variances.map(v => Math.sqrt(v))

  return {
    count: embeddings.length,
    dimensions,
    means,
    stdDeviations,
    mins,
    maxs,
    variances
  }
}

// Simple k-means clustering
function clusterData(data) {
  const { points, k = 5, maxIterations = 100 } = data

  if (!points || points.length === 0) {
    return { error: 'No points provided for clustering' }
  }

  const dimensions = points[0].length

  // Initialize centroids randomly
  let centroids = []
  for (let i = 0; i < k; i++) {
    const centroid = []
    for (let j = 0; j < dimensions; j++) {
      const min = Math.min(...points.map(p => p[j]))
      const max = Math.max(...points.map(p => p[j]))
      centroid.push(min + Math.random() * (max - min))
    }
    centroids.push(centroid)
  }

  let assignments = new Array(points.length).fill(0)
  let changed = true
  let iteration = 0

  while (changed && iteration < maxIterations) {
    changed = false

    // Assign points to nearest centroid
    for (let i = 0; i < points.length; i++) {
      let minDistance = Infinity
      let newAssignment = 0

      for (let j = 0; j < k; j++) {
        const distance = euclideanDistance(points[i], centroids[j])
        if (distance < minDistance) {
          minDistance = distance
          newAssignment = j
        }
      }

      if (assignments[i] !== newAssignment) {
        assignments[i] = newAssignment
        changed = true
      }
    }

    // Update centroids
    for (let j = 0; j < k; j++) {
      const clusterPoints = points.filter((_, i) => assignments[i] === j)
      if (clusterPoints.length > 0) {
        for (let dim = 0; dim < dimensions; dim++) {
          centroids[j][dim] = clusterPoints.reduce((sum, p) => sum + p[dim], 0) / clusterPoints.length
        }
      }
    }

    iteration++
  }

  // Calculate cluster statistics
  const clusters = []
  for (let i = 0; i < k; i++) {
    const clusterPoints = points.filter((_, idx) => assignments[idx] === i)
    clusters.push({
      id: i,
      centroid: centroids[i],
      size: clusterPoints.length,
      points: clusterPoints.map((point, idx) => ({ point, originalIndex: points.indexOf(point) }))
    })
  }

  return {
    clusters,
    assignments,
    centroids,
    iterations: iteration,
    converged: iteration < maxIterations
  }
}

// Filter large dataset based on criteria
function filterLargeDataset(data) {
  const { dataset, filters, options = {} } = data
  const { batchSize = 1000, reportProgress = false } = options

  let filtered = []
  let processed = 0

  for (let i = 0; i < dataset.length; i += batchSize) {
    const batch = dataset.slice(i, i + batchSize)

    const filteredBatch = batch.filter(item => {
      return filters.every(filter => {
        const { field, operator, value } = filter

        const fieldValue = getNestedValue(item, field)

        switch (operator) {
          case 'eq': return fieldValue === value
          case 'neq': return fieldValue !== value
          case 'gt': return fieldValue > value
          case 'gte': return fieldValue >= value
          case 'lt': return fieldValue < value
          case 'lte': return fieldValue <= value
          case 'contains': return String(fieldValue).toLowerCase().includes(String(value).toLowerCase())
          case 'startsWith': return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase())
          case 'endsWith': return String(fieldValue).toLowerCase().endsWith(String(value).toLowerCase())
          case 'in': return Array.isArray(value) && value.includes(fieldValue)
          case 'notIn': return Array.isArray(value) && !value.includes(fieldValue)
          default: return true
        }
      })
    })

    filtered.push(...filteredBatch)
    processed += batch.length

    // Report progress if requested
    if (reportProgress && i % (batchSize * 10) === 0) {
      self.postMessage({
        type: 'PROGRESS',
        processed,
        total: dataset.length,
        percentage: Math.round((processed / dataset.length) * 100)
      })
    }
  }

  return {
    filtered,
    originalCount: dataset.length,
    filteredCount: filtered.length,
    reductionRatio: 1 - (filtered.length / dataset.length)
  }
}

// Compute similarity matrix for embeddings
function computeSimilarityMatrix(data) {
  const { embeddings, metric = 'cosine' } = data

  if (!embeddings || embeddings.length === 0) {
    return { error: 'No embeddings provided' }
  }

  const n = embeddings.length
  const matrix = new Array(n).fill(null).map(() => new Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let similarity

      if (i === j) {
        similarity = 1.0
      } else {
        switch (metric) {
          case 'cosine':
            similarity = cosineSimilarity(embeddings[i], embeddings[j])
            break
          case 'euclidean':
            similarity = 1 / (1 + euclideanDistance(embeddings[i], embeddings[j]))
            break
          case 'manhattan':
            similarity = 1 / (1 + manhattanDistance(embeddings[i], embeddings[j]))
            break
          default:
            similarity = cosineSimilarity(embeddings[i], embeddings[j])
        }
      }

      matrix[i][j] = similarity
      matrix[j][i] = similarity // Symmetric matrix
    }
  }

  return {
    matrix,
    size: n,
    metric,
    statistics: {
      mean: matrix.flat().reduce((sum, val) => sum + val, 0) / (n * n),
      min: Math.min(...matrix.flat()),
      max: Math.max(...matrix.flat())
    }
  }
}

// Aggregate metrics from large dataset
function aggregateMetrics(data) {
  const { records, groupBy, metrics } = data

  if (!records || records.length === 0) {
    return { error: 'No records provided' }
  }

  const groups = {}

  // Group records
  records.forEach(record => {
    const groupKey = groupBy ? getNestedValue(record, groupBy) : 'all'

    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(record)
  })

  // Calculate metrics for each group
  const results = {}

  Object.entries(groups).forEach(([groupKey, groupRecords]) => {
    const groupMetrics = {}

    metrics.forEach(metric => {
      const { field, operation } = metric
      const values = groupRecords.map(record => getNestedValue(record, field)).filter(val => val != null)

      switch (operation) {
        case 'count':
          groupMetrics[`${field}_count`] = values.length
          break
        case 'sum':
          groupMetrics[`${field}_sum`] = values.reduce((sum, val) => sum + Number(val), 0)
          break
        case 'avg':
          groupMetrics[`${field}_avg`] = values.length > 0 ?
            values.reduce((sum, val) => sum + Number(val), 0) / values.length : 0
          break
        case 'min':
          groupMetrics[`${field}_min`] = values.length > 0 ? Math.min(...values.map(Number)) : null
          break
        case 'max':
          groupMetrics[`${field}_max`] = values.length > 0 ? Math.max(...values.map(Number)) : null
          break
        case 'unique':
          groupMetrics[`${field}_unique`] = new Set(values).size
          break
      }
    })

    results[groupKey] = {
      count: groupRecords.length,
      metrics: groupMetrics
    }
  })

  return {
    groups: results,
    totalRecords: records.length,
    groupCount: Object.keys(results).length
  }
}

// Utility functions
function euclideanDistance(a, b) {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}

function manhattanDistance(a, b) {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += Math.abs(a[i] - b[i])
  }
  return sum
}

function cosineSimilarity(a, b) {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

function calculateBasicStats(data) {
  if (!data || data.length === 0) return null

  const scores = data.map(item => item.score || 0).filter(score => !isNaN(score))
  const contentLengths = data.map(item => (item.content || '').length)

  return {
    count: data.length,
    scores: {
      min: Math.min(...scores),
      max: Math.max(...scores),
      avg: scores.reduce((sum, score) => sum + score, 0) / scores.length,
      median: scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)]
    },
    contentLength: {
      min: Math.min(...contentLengths),
      max: Math.max(...contentLengths),
      avg: contentLengths.reduce((sum, len) => sum + len, 0) / contentLengths.length
    },
    collections: [...new Set(data.map(item => item.collection))],
    timeRange: {
      earliest: Math.min(...data.map(item => new Date(item.timestamp || 0).getTime())),
      latest: Math.max(...data.map(item => new Date(item.timestamp || 0).getTime()))
    }
  }
}