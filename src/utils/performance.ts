/**
 * Performance Optimization Utilities
 *
 * Provides optimized data processing, rendering, and memory management
 * for large datasets and complex visualizations.
 */

export interface PerformanceConfig {
  maxDataPoints: number
  chunkSize: number
  debounceDelay: number
  throttleDelay: number
  memoryThreshold: number
  enableVirtualization: boolean
  enableWebWorkers: boolean
}

const defaultConfig: PerformanceConfig = {
  maxDataPoints: 10000,
  chunkSize: 1000,
  debounceDelay: 300,
  throttleDelay: 16, // ~60fps
  memoryThreshold: 100 * 1024 * 1024, // 100MB
  enableVirtualization: true,
  enableWebWorkers: true
}

// Debounce utility for expensive operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(null, args), delay)
  }
}

// Throttle utility for high-frequency operations
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastExecution = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastExecution >= delay) {
      lastExecution = now
      func.apply(null, args)
    }
  }
}

// Batch processing for large datasets
export async function processInBatches<T, R>(
  data: T[],
  processor: (batch: T[]) => Promise<R[]> | R[],
  batchSize: number = defaultConfig.chunkSize,
  onProgress?: (processed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = []
  const total = data.length

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    const batchResults = await processor(batch)
    results.push(...batchResults)

    if (onProgress) {
      onProgress(Math.min(i + batchSize, total), total)
    }

    // Yield control to prevent blocking
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  return results
}

// Memory usage monitoring
export class MemoryMonitor {
  private static instance: MemoryMonitor
  private observations: PerformanceObserver[] = []
  private memoryCallbacks: ((usage: number) => void)[] = []

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor()
    }
    return MemoryMonitor.instance
  }

  startMonitoring() {
    if ('performance' in window && 'memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        const used = memory.usedJSHeapSize
        this.notifyMemoryCallbacks(used)
      }, 5000)
    }
  }

  onMemoryChange(callback: (usage: number) => void) {
    this.memoryCallbacks.push(callback)
  }

  private notifyMemoryCallbacks(usage: number) {
    this.memoryCallbacks.forEach(callback => callback(usage))
  }

  getCurrentMemoryUsage(): number {
    if ('performance' in window && 'memory' in (performance as any)) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }
}

// Data virtualization for large lists
export class VirtualList {
  private container: HTMLElement
  private items: any[]
  private itemHeight: number
  private visibleCount: number
  private scrollTop: number = 0
  private renderCallback: (items: any[], startIndex: number) => void

  constructor(
    container: HTMLElement,
    items: any[],
    itemHeight: number,
    renderCallback: (items: any[], startIndex: number) => void
  ) {
    this.container = container
    this.items = items
    this.itemHeight = itemHeight
    this.renderCallback = renderCallback
    this.visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2 // Buffer

    this.setupScrollListener()
    this.render()
  }

  private setupScrollListener() {
    const throttledScroll = throttle(() => {
      this.scrollTop = this.container.scrollTop
      this.render()
    }, defaultConfig.throttleDelay)

    this.container.addEventListener('scroll', throttledScroll)
  }

  private render() {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight)
    const endIndex = Math.min(startIndex + this.visibleCount, this.items.length)
    const visibleItems = this.items.slice(startIndex, endIndex)

    this.renderCallback(visibleItems, startIndex)
  }

  updateItems(newItems: any[]) {
    this.items = newItems
    this.render()
  }
}

// 3D rendering optimizations
export class Scene3DOptimizer {
  private scene: any // Three.js scene
  private camera: any
  private renderer: any
  private frustum: any
  private lastCameraPosition = { x: 0, y: 0, z: 0 }
  private lastCameraRotation = { x: 0, y: 0, z: 0 }
  private isDirty = true

  constructor(scene: any, camera: any, renderer: any) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.setupFrustumCulling()
  }

  private setupFrustumCulling() {
    // Implement frustum culling to only render visible objects
    if (typeof window !== 'undefined' && (window as any).THREE) {
      const THREE = (window as any).THREE
      this.frustum = new THREE.Frustum()
    }
  }

  optimizeScene() {
    this.performFrustumCulling()
    this.optimizeLOD()
    this.batchGeometry()
  }

  private performFrustumCulling() {
    if (!this.frustum) return

    const matrix = this.camera.projectionMatrix.clone()
    matrix.multiply(this.camera.matrixWorldInverse)
    this.frustum.setFromProjectionMatrix(matrix)

    this.scene.traverse((object: any) => {
      if (object.isMesh) {
        object.visible = this.frustum.intersectsObject(object)
      }
    })
  }

  private optimizeLOD() {
    // Implement Level of Detail based on distance from camera
    const cameraPosition = this.camera.position

    this.scene.traverse((object: any) => {
      if (object.userData?.isOptimizable) {
        const distance = object.position.distanceTo(cameraPosition)

        if (distance > 100) {
          // Use low-poly version
          object.geometry = object.userData.lodGeometry?.low || object.geometry
        } else if (distance > 50) {
          // Use medium-poly version
          object.geometry = object.userData.lodGeometry?.medium || object.geometry
        } else {
          // Use high-poly version
          object.geometry = object.userData.lodGeometry?.high || object.geometry
        }
      }
    })
  }

  private batchGeometry() {
    // Batch similar geometries for better performance
    const geometryGroups = new Map()

    this.scene.traverse((object: any) => {
      if (object.isMesh && object.userData?.batchable) {
        const key = `${object.geometry.type}_${object.material.uuid}`
        if (!geometryGroups.has(key)) {
          geometryGroups.set(key, [])
        }
        geometryGroups.get(key).push(object)
      }
    })

    // Create batched geometries (simplified implementation)
    geometryGroups.forEach((objects, key) => {
      if (objects.length > 10) {
        // Consider batching these objects
        console.log(`Consider batching ${objects.length} objects of type ${key}`)
      }
    })
  }

  shouldRender(): boolean {
    const pos = this.camera.position
    const rot = this.camera.rotation

    const hasMovedSignificantly =
      Math.abs(pos.x - this.lastCameraPosition.x) > 0.01 ||
      Math.abs(pos.y - this.lastCameraPosition.y) > 0.01 ||
      Math.abs(pos.z - this.lastCameraPosition.z) > 0.01 ||
      Math.abs(rot.x - this.lastCameraRotation.x) > 0.01 ||
      Math.abs(rot.y - this.lastCameraRotation.y) > 0.01 ||
      Math.abs(rot.z - this.lastCameraRotation.z) > 0.01

    if (hasMovedSignificantly) {
      this.lastCameraPosition = { ...pos }
      this.lastCameraRotation = { ...rot }
      this.isDirty = true
      return true
    }

    if (this.isDirty) {
      this.isDirty = false
      return true
    }

    return false
  }
}

// Web Worker utilities for heavy computations
export class WorkerPool {
  private workers: Worker[] = []
  private queue: Array<{
    data: any,
    resolve: (value: any) => void,
    reject: (error: any) => void
  }> = []
  private workerScript: string

  constructor(workerScript: string, poolSize: number = navigator.hardwareConcurrency || 4) {
    this.workerScript = workerScript
    this.initializeWorkers(poolSize)
  }

  private initializeWorkers(poolSize: number) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(this.workerScript)
      worker.onmessage = (event) => {
        const job = this.queue.shift()
        if (job) {
          job.resolve(event.data)
          this.processQueue()
        }
      }
      worker.onerror = (error) => {
        const job = this.queue.shift()
        if (job) {
          job.reject(error)
          this.processQueue()
        }
      }
      this.workers.push(worker)
    }
  }

  execute<T>(data: any): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ data, resolve, reject })
      this.processQueue()
    })
  }

  private processQueue() {
    if (this.queue.length === 0) return

    const availableWorker = this.workers.find(worker => !worker.onmessage)
    if (availableWorker) {
      const job = this.queue[0]
      availableWorker.postMessage(job.data)
    }
  }

  terminate() {
    this.workers.forEach(worker => worker.terminate())
    this.workers = []
  }
}

// Data sampling for large datasets
export function sampleData<T>(
  data: T[],
  maxSamples: number,
  strategy: 'random' | 'systematic' | 'stratified' = 'systematic'
): T[] {
  if (data.length <= maxSamples) {
    return data
  }

  switch (strategy) {
    case 'random':
      return randomSample(data, maxSamples)
    case 'systematic':
      return systematicSample(data, maxSamples)
    case 'stratified':
      return stratifiedSample(data, maxSamples)
    default:
      return systematicSample(data, maxSamples)
  }
}

function randomSample<T>(data: T[], count: number): T[] {
  const shuffled = [...data].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

function systematicSample<T>(data: T[], count: number): T[] {
  const interval = Math.floor(data.length / count)
  const sampled: T[] = []

  for (let i = 0; i < data.length; i += interval) {
    sampled.push(data[i])
    if (sampled.length >= count) break
  }

  return sampled
}

function stratifiedSample<T>(data: T[], count: number): T[] {
  // Simplified stratified sampling - assumes data has a 'category' property
  const groups = new Map<string, T[]>()

  data.forEach(item => {
    const category = (item as any).category || 'default'
    if (!groups.has(category)) {
      groups.set(category, [])
    }
    groups.get(category)!.push(item)
  })

  const samplesPerGroup = Math.floor(count / groups.size)
  const sampled: T[] = []

  groups.forEach(groupData => {
    const groupSample = systematicSample(groupData, samplesPerGroup)
    sampled.push(...groupSample)
  })

  return sampled.slice(0, count)
}

// Performance metrics collection
export class PerformanceTracker {
  private marks: Map<string, number> = new Map()
  private metrics: Map<string, number[]> = new Map()

  startMark(name: string) {
    this.marks.set(name, performance.now())
  }

  endMark(name: string): number {
    const startTime = this.marks.get(name)
    if (!startTime) {
      console.warn(`No start mark found for: ${name}`)
      return 0
    }

    const duration = performance.now() - startTime
    this.marks.delete(name)

    // Store metric
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    this.metrics.get(name)!.push(duration)

    return duration
  }

  getMetric(name: string): { avg: number, min: number, max: number, count: number } | null {
    const values = this.metrics.get(name)
    if (!values || values.length === 0) return null

    return {
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    }
  }

  getAllMetrics(): Record<string, ReturnType<PerformanceTracker['getMetric']>> {
    const result: Record<string, ReturnType<PerformanceTracker['getMetric']>> = {}
    this.metrics.forEach((_, name) => {
      result[name] = this.getMetric(name)
    })
    return result
  }

  clearMetrics() {
    this.metrics.clear()
    this.marks.clear()
  }
}

// Global performance tracker instance
export const performanceTracker = new PerformanceTracker()

// Initialize memory monitoring
if (typeof window !== 'undefined') {
  MemoryMonitor.getInstance().startMonitoring()
}

export { defaultConfig as performanceConfig }