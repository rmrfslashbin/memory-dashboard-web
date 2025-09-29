import { ref, computed, onUnmounted } from 'vue'
import {
  debounce,
  throttle,
  processInBatches,
  sampleData,
  WorkerPool,
  MemoryMonitor,
  performanceTracker
} from '@/utils/performance'

export interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  dataProcessingTime: number
  frameRate: number
  loadTime: number
}

export interface OptimizationConfig {
  enableVirtualization: boolean
  maxDataPoints: number
  enableWebWorkers: boolean
  enableCaching: boolean
  enableLazyLoading: boolean
  frameRateTarget: number
}

const defaultConfig: OptimizationConfig = {
  enableVirtualization: true,
  maxDataPoints: 10000,
  enableWebWorkers: true,
  enableCaching: true,
  enableLazyLoading: true,
  frameRateTarget: 60
}

export function usePerformanceOptimizer(config: Partial<OptimizationConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config }

  // State
  const isOptimizing = ref(false)
  const currentMetrics = ref<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    dataProcessingTime: 0,
    frameRate: 0,
    loadTime: 0
  })

  // Web Worker Pool
  let workerPool: WorkerPool | null = null
  if (finalConfig.enableWebWorkers && typeof window !== 'undefined') {
    try {
      workerPool = new WorkerPool('/workers/data-processor.js', navigator.hardwareConcurrency || 4)
    } catch (error) {
      console.warn('Could not initialize Web Worker pool:', error)
    }
  }

  // Cache for expensive computations
  const computationCache = new Map<string, { data: any, timestamp: number }>()
  const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  // Frame rate monitoring
  const frameRateMonitor = {
    lastTime: performance.now(),
    frameCount: 0,
    fps: 60
  }

  function updateFrameRate() {
    frameRateMonitor.frameCount++
    const now = performance.now()
    const elapsed = now - frameRateMonitor.lastTime

    if (elapsed >= 1000) {
      frameRateMonitor.fps = Math.round((frameRateMonitor.frameCount * 1000) / elapsed)
      frameRateMonitor.frameCount = 0
      frameRateMonitor.lastTime = now
      currentMetrics.value.frameRate = frameRateMonitor.fps
    }

    requestAnimationFrame(updateFrameRate)
  }

  // Start monitoring
  if (typeof window !== 'undefined') {
    updateFrameRate()

    // Memory monitoring
    MemoryMonitor.getInstance().onMemoryChange((usage) => {
      currentMetrics.value.memoryUsage = usage
    })
  }

  // Optimized data processing
  async function optimizeDataProcessing<T>(
    data: T[],
    operation: 'filter' | 'transform' | 'aggregate' | 'cluster',
    options: any = {}
  ): Promise<T[] | any> {
    const cacheKey = `${operation}_${JSON.stringify({ dataLength: data.length, options })}`

    // Check cache first
    if (finalConfig.enableCaching && computationCache.has(cacheKey)) {
      const cached = computationCache.get(cacheKey)!
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data
      } else {
        computationCache.delete(cacheKey)
      }
    }

    performanceTracker.startMark(`dataProcessing_${operation}`)

    let result: any

    // Use Web Worker for large datasets
    if (workerPool && data.length > 5000) {
      try {
        switch (operation) {
          case 'filter':
            result = await workerPool.execute({
              type: 'FILTER_LARGE_DATASET',
              data: { dataset: data, filters: options.filters || [], options }
            })
            break

          case 'aggregate':
            result = await workerPool.execute({
              type: 'AGGREGATE_METRICS',
              data: { records: data, groupBy: options.groupBy, metrics: options.metrics || [] }
            })
            break

          case 'cluster':
            result = await workerPool.execute({
              type: 'CLUSTER_DATA',
              data: { points: options.embeddings || [], k: options.k || 5 }
            })
            break

          default:
            result = await processInMainThread(data, operation, options)
        }
      } catch (error) {
        console.warn('Web Worker processing failed, falling back to main thread:', error)
        result = await processInMainThread(data, operation, options)
      }
    } else {
      result = await processInMainThread(data, operation, options)
    }

    const processingTime = performanceTracker.endMark(`dataProcessing_${operation}`)
    currentMetrics.value.dataProcessingTime = processingTime

    // Cache result
    if (finalConfig.enableCaching) {
      computationCache.set(cacheKey, { data: result, timestamp: Date.now() })
    }

    return result
  }

  // Main thread processing with batching
  async function processInMainThread<T>(
    data: T[],
    operation: string,
    options: any
  ): Promise<T[] | any> {
    switch (operation) {
      case 'filter':
        return await processInBatches(
          data,
          (batch) => batch.filter(options.filterFn),
          1000
        )

      case 'transform':
        return await processInBatches(
          data,
          (batch) => batch.map(options.transformFn),
          1000
        )

      case 'aggregate':
        return data.reduce(options.reduceFn, options.initialValue || {})

      default:
        return data
    }
  }

  // Optimized search results processing
  const optimizeSearchResults = debounce(async (
    memories: any[],
    options: {
      maxPoints?: number
      enableSampling?: boolean
      enableClustering?: boolean
    } = {}
  ) => {
    const startTime = performance.now()
    isOptimizing.value = true

    try {
      const maxPoints = options.maxPoints || finalConfig.maxDataPoints
      let processedMemories = memories

      // Sample data if too large
      if (options.enableSampling && memories.length > maxPoints) {
        processedMemories = sampleData(memories, maxPoints, 'systematic')
      }

      // Process through Web Worker if available
      if (workerPool && processedMemories.length > 1000) {
        const result = await workerPool.execute({
          type: 'PROCESS_SEARCH_RESULTS',
          data: {
            memories: processedMemories,
            options: {
              maxPoints,
              includeEmbeddings: options.enableClustering
            }
          }
        })
        return result
      }

      // Fallback to main thread processing
      return {
        memories: processedMemories,
        totalCount: memories.length,
        processedCount: processedMemories.length,
        samplingRatio: processedMemories.length / memories.length
      }

    } finally {
      const processingTime = performance.now() - startTime
      currentMetrics.value.dataProcessingTime = processingTime
      isOptimizing.value = false
    }
  }, 300)

  // Optimized 3D rendering utilities
  const optimize3DRendering = throttle((
    scene: any,
    camera: any,
    renderer: any
  ) => {
    if (!scene || !camera || !renderer) return

    performanceTracker.startMark('3dRendering')

    try {
      // Level of Detail (LOD) based on camera distance
      scene.traverse((object: any) => {
        if (object.isMesh && object.userData?.optimizable) {
          const distance = object.position.distanceTo(camera.position)

          if (distance > 100) {
            // Use low-poly geometry for distant objects
            object.material.wireframe = true
            object.geometry = object.userData.lodGeometry?.low || object.geometry
          } else if (distance > 50) {
            // Use medium-poly geometry
            object.material.wireframe = false
            object.geometry = object.userData.lodGeometry?.medium || object.geometry
          } else {
            // Use high-poly geometry for close objects
            object.material.wireframe = false
            object.geometry = object.userData.lodGeometry?.high || object.geometry
          }
        }
      })

      // Frustum culling - only render visible objects
      const frustum = new (window as any).THREE?.Frustum()
      if (frustum) {
        const matrix = camera.projectionMatrix.clone()
        matrix.multiply(camera.matrixWorldInverse)
        frustum.setFromProjectionMatrix(matrix)

        scene.traverse((object: any) => {
          if (object.isMesh) {
            object.visible = frustum.intersectsObject(object)
          }
        })
      }

    } finally {
      const renderTime = performanceTracker.endMark('3dRendering')
      currentMetrics.value.renderTime = renderTime
    }
  }, 16) // ~60fps

  // Memory cleanup utilities
  const cleanupMemory = debounce(() => {
    // Clear old cache entries
    const now = Date.now()
    for (const [key, { timestamp }] of computationCache.entries()) {
      if (now - timestamp > CACHE_TTL) {
        computationCache.delete(key)
      }
    }

    // Force garbage collection if available (Chrome DevTools)
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc()
    }

    // Clear performance tracker old entries
    if (performanceTracker.getAllMetrics) {
      const metrics = performanceTracker.getAllMetrics()
      Object.keys(metrics).forEach(key => {
        const metric = metrics[key]
        if (metric && metric.count > 100) {
          // Keep only recent metrics to prevent memory bloat
          performanceTracker.clearMetrics()
        }
      })
    }
  }, 30000) // Clean every 30 seconds

  // Virtual scrolling helper
  function createVirtualList(
    container: HTMLElement,
    items: any[],
    itemHeight: number,
    renderItem: (item: any, index: number) => HTMLElement
  ) {
    if (!finalConfig.enableVirtualization) {
      // Fallback to regular rendering
      return { updateItems: (newItems: any[]) => {}, destroy: () => {} }
    }

    const visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2
    let scrollTop = 0
    let renderedElements: HTMLElement[] = []

    const render = throttle(() => {
      const startIndex = Math.floor(scrollTop / itemHeight)
      const endIndex = Math.min(startIndex + visibleCount, items.length)

      // Clear previous elements
      container.innerHTML = ''
      renderedElements = []

      // Create spacer for items above viewport
      if (startIndex > 0) {
        const spacer = document.createElement('div')
        spacer.style.height = `${startIndex * itemHeight}px`
        container.appendChild(spacer)
      }

      // Render visible items
      for (let i = startIndex; i < endIndex; i++) {
        const element = renderItem(items[i], i)
        container.appendChild(element)
        renderedElements.push(element)
      }

      // Create spacer for items below viewport
      if (endIndex < items.length) {
        const spacer = document.createElement('div')
        spacer.style.height = `${(items.length - endIndex) * itemHeight}px`
        container.appendChild(spacer)
      }
    }, 16)

    const handleScroll = () => {
      scrollTop = container.scrollTop
      render()
    }

    container.addEventListener('scroll', handleScroll)
    render() // Initial render

    return {
      updateItems: (newItems: any[]) => {
        items = newItems
        render()
      },
      destroy: () => {
        container.removeEventListener('scroll', handleScroll)
      }
    }
  }

  // Performance monitoring
  const getPerformanceReport = () => {
    const report = {
      currentMetrics: { ...currentMetrics.value },
      trackerMetrics: performanceTracker.getAllMetrics(),
      cacheStats: {
        size: computationCache.size,
        hitRate: 0, // Would need to track hits/misses
      },
      config: finalConfig,
      recommendations: []
    }

    // Generate recommendations
    if (report.currentMetrics.frameRate < finalConfig.frameRateTarget) {
      report.recommendations.push('Consider reducing data points or enabling more aggressive optimizations')
    }

    if (report.currentMetrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      report.recommendations.push('Memory usage is high, consider enabling data sampling')
    }

    if (report.currentMetrics.dataProcessingTime > 1000) {
      report.recommendations.push('Data processing is slow, consider enabling Web Workers')
    }

    return report
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (workerPool) {
      workerPool.terminate()
    }
    computationCache.clear()
  })

  return {
    // State
    isOptimizing,
    currentMetrics,

    // Data processing
    optimizeDataProcessing,
    optimizeSearchResults,

    // Rendering
    optimize3DRendering,
    createVirtualList,

    // Utilities
    debounce,
    throttle,
    sampleData,
    cleanupMemory,

    // Monitoring
    getPerformanceReport,
    performanceTracker
  }
}