<template>
  <div class="embedding-visualization">
    <!-- Controls Panel -->
    <v-card class="controls-panel mb-4" variant="outlined">
      <v-card-text>
        <v-row>
          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="visualizationMode"
              label="Visualization Mode"
              :items="visualizationModes"
              variant="outlined"
              density="compact"
              @update:model-value="updateVisualization"
            />
          </v-col>

          <v-col cols="12" sm="6" md="3">
            <v-select
              v-model="colorMode"
              label="Color by"
              :items="colorModes"
              variant="outlined"
              density="compact"
              @update:model-value="updateVisualization"
            />
          </v-col>

          <v-col cols="12" sm="6" md="2">
            <v-text-field
              v-model.number="pointSize"
              label="Point Size"
              type="number"
              min="0.1"
              max="5"
              step="0.1"
              variant="outlined"
              density="compact"
              @update:model-value="updatePointSizes"
            />
          </v-col>

          <v-col cols="12" sm="6" md="2">
            <v-switch
              v-model="showLabels"
              label="Show Labels"
              color="primary"
              density="compact"
              @update:model-value="toggleLabels"
            />
          </v-col>

          <v-col cols="12" sm="6" md="2">
            <v-switch
              v-model="enableClustering"
              label="Clustering"
              color="primary"
              density="compact"
              @update:model-value="updateClustering"
            />
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="6">
            <div class="text-caption mb-1">Similarity Threshold</div>
            <v-slider
              v-model="similarityThreshold"
              min="0"
              max="1"
              step="0.01"
              hide-details
              @update:model-value="updateConnections"
            >
              <template #append>
                <div class="text-caption">{{ similarityThreshold.toFixed(2) }}</div>
              </template>
            </v-slider>
          </v-col>

          <v-col cols="12" md="6">
            <div class="text-caption mb-1">Connection Opacity</div>
            <v-slider
              v-model="connectionOpacity"
              min="0"
              max="1"
              step="0.01"
              hide-details
              @update:model-value="updateConnectionOpacity"
            >
              <template #append>
                <div class="text-caption">{{ connectionOpacity.toFixed(2) }}</div>
              </template>
            </v-slider>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Main Visualization Container -->
    <v-card class="visualization-container">
      <v-card-title class="d-flex justify-space-between align-center">
        <div>
          <v-icon class="mr-2">mdi-cube-outline</v-icon>
          Embedding Space Visualization
          <v-chip size="small" class="ml-2">{{ results.length }} points</v-chip>
        </div>

        <div class="d-flex gap-2">
          <v-btn
            size="small"
            variant="outlined"
            @click="resetCamera"
          >
            <v-icon start>mdi-camera-reset</v-icon>
            Reset View
          </v-btn>

          <v-btn
            size="small"
            variant="outlined"
            @click="takeScreenshot"
          >
            <v-icon start>mdi-camera</v-icon>
            Screenshot
          </v-btn>

          <v-btn
            size="small"
            variant="outlined"
            @click="exportData"
          >
            <v-icon start>mdi-download</v-icon>
            Export
          </v-btn>
        </div>
      </v-card-title>

      <v-card-text class="pa-0">
        <!-- Loading State -->
        <div v-if="loading" class="text-center py-8">
          <v-progress-circular indeterminate color="primary" size="48" />
          <p class="mt-4">Generating visualization...</p>
        </div>

        <!-- Three.js Container -->
        <div
          ref="threeContainer"
          class="three-container"
          @mousemove="onMouseMove"
          @click="onMouseClick"
        />

        <!-- Info Panel -->
        <div v-if="selectedPoint" class="info-panel">
          <v-card variant="elevated" class="pa-3">
            <v-card-title class="text-subtitle-1 pb-2">
              {{ selectedPoint.content.substring(0, 50) }}...
            </v-card-title>
            <v-card-text class="pa-0">
              <div class="text-body-2 mb-2">
                <strong>Score:</strong> {{ selectedPoint.score?.toFixed(3) || 'N/A' }}
              </div>
              <div class="text-body-2 mb-2">
                <strong>Collection:</strong> {{ selectedPoint.collection || 'Unknown' }}
              </div>
              <div class="text-body-2 mb-2">
                <strong>Type:</strong> {{ selectedPoint.type || 'Memory' }}
              </div>
              <div v-if="selectedPoint.metadata" class="text-caption">
                <strong>Created:</strong> {{ formatDate(selectedPoint.metadata.created_at) }}
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Stats Panel -->
        <div class="stats-panel">
          <v-card variant="tonal" color="info" class="pa-2">
            <div class="text-caption">
              <div><strong>Total Points:</strong> {{ results.length }}</div>
              <div><strong>Visible Connections:</strong> {{ visibleConnections }}</div>
              <div><strong>Clusters:</strong> {{ clusterCount }}</div>
              <div><strong>Avg Similarity:</strong> {{ averageSimilarity.toFixed(3) }}</div>
            </div>
          </v-card>
        </div>
      </v-card-text>
    </v-card>

    <!-- Legend -->
    <v-card class="legend-panel mt-4" variant="outlined" v-if="colorMode !== 'uniform'">
      <v-card-title class="text-subtitle-2">Legend</v-card-title>
      <v-card-text>
        <div class="d-flex flex-wrap gap-2">
          <v-chip
            v-for="(color, key) in legendColors"
            :key="key"
            size="small"
            :style="{ backgroundColor: color, color: getTextColor(color) }"
          >
            {{ key }}
          </v-chip>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as THREE from 'three'
import * as d3 from 'd3'

interface SearchResult {
  id: string
  content: string
  score?: number
  collection?: string
  type?: string
  metadata?: any
  embedding?: number[]
}

interface Props {
  results: SearchResult[]
  query: string
  loading?: boolean
}

const props = defineProps<Props>()

// Visualization state
const threeContainer = ref<HTMLElement | null>(null)
const selectedPoint = ref<SearchResult | null>(null)

// Three.js objects
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let points: THREE.Points
let connections: THREE.LineSegments
let animationId: number

// Control state
const visualizationMode = ref('3d')
const colorMode = ref('score')
const pointSize = ref(2.0)
const showLabels = ref(false)
const enableClustering = ref(true)
const similarityThreshold = ref(0.7)
const connectionOpacity = ref(0.3)

// Statistics
const visibleConnections = ref(0)
const clusterCount = ref(0)
const averageSimilarity = ref(0)
const legendColors = ref<Record<string, string>>({})

// Configuration
const visualizationModes = [
  { title: '3D Space', value: '3d' },
  { title: '2D Projection', value: '2d' },
  { title: 'Cluster View', value: 'cluster' }
]

const colorModes = [
  { title: 'By Score', value: 'score' },
  { title: 'By Collection', value: 'collection' },
  { title: 'By Type', value: 'type' },
  { title: 'Uniform', value: 'uniform' }
]

// Initialization
onMounted(async () => {
  await nextTick()
  initThreeJS()
  if (props.results.length > 0) {
    generateVisualization()
  }
})

onUnmounted(() => {
  cleanup()
})

// Watch for result changes
watch(() => props.results, (newResults) => {
  if (newResults.length > 0) {
    generateVisualization()
  }
}, { deep: true })

function initThreeJS() {
  if (!threeContainer.value) return

  // Scene setup
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf5f5f5)

  // Camera setup
  camera = new THREE.PerspectiveCamera(
    75,
    threeContainer.value.clientWidth / threeContainer.value.clientHeight,
    0.1,
    1000
  )
  camera.position.set(0, 0, 50)

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setSize(threeContainer.value.clientWidth, threeContainer.value.clientHeight)
  renderer.setPixelRatio(window.devicePixelRatio)
  threeContainer.value.appendChild(renderer.domElement)

  // Controls (basic rotation with mouse)
  setupInteractivity()

  // Start render loop
  animate()
}

function generateVisualization() {
  if (!scene) return

  // Clear existing objects
  if (points) scene.remove(points)
  if (connections) scene.remove(connections)

  // Generate or simulate embeddings
  const embeddings = generateEmbeddings(props.results)

  // Reduce dimensionality for visualization
  const projectedPoints = visualizationMode.value === '2d'
    ? projectTo2D(embeddings)
    : projectTo3D(embeddings)

  // Create point cloud
  createPointCloud(projectedPoints)

  // Create connections based on similarity
  createConnections(projectedPoints, embeddings)

  // Update clustering
  if (enableClustering.value) {
    updateClustering()
  }

  // Update statistics
  updateStatistics()
}

function generateEmbeddings(results: SearchResult[]): number[][] {
  // In a real implementation, this would use actual embeddings from the API
  // For demo purposes, we'll generate simulated embeddings based on content similarity

  return results.map((result, index) => {
    if (result.embedding) {
      return result.embedding
    }

    // Generate simulated embedding based on content characteristics
    const contentLength = result.content.length
    const scoreInfluence = (result.score || 0.5) * 10
    const collectionHash = hashString(result.collection || '') * 0.1

    // Create a higher-dimensional embedding (simulating BERT-like embeddings)
    const embedding = []
    for (let i = 0; i < 384; i++) {
      const base = Math.sin(i * 0.1 + index * 0.05) * scoreInfluence
      const noise = (Math.random() - 0.5) * 2
      const contentInfluence = Math.cos(contentLength * 0.01 + i * 0.02)
      embedding.push(base + noise + contentInfluence + collectionHash)
    }

    return embedding
  })
}

function projectTo2D(embeddings: number[][]): THREE.Vector3[] {
  // Use PCA or t-SNE-like projection to 2D
  // Simplified version using first two principal components
  const points: THREE.Vector3[] = []

  embeddings.forEach((embedding, index) => {
    // Simplified projection - in real implementation would use proper dimensionality reduction
    const x = embedding.slice(0, 100).reduce((a, b) => a + b, 0) / 100 * 20
    const y = embedding.slice(100, 200).reduce((a, b) => a + b, 0) / 100 * 20
    const z = 0 // 2D mode

    points.push(new THREE.Vector3(x, y, z))
  })

  return points
}

function projectTo3D(embeddings: number[][]): THREE.Vector3[] {
  // Project to 3D space
  const points: THREE.Vector3[] = []

  embeddings.forEach((embedding, index) => {
    const x = embedding.slice(0, 100).reduce((a, b) => a + b, 0) / 100 * 30
    const y = embedding.slice(100, 200).reduce((a, b) => a + b, 0) / 100 * 30
    const z = embedding.slice(200, 300).reduce((a, b) => a + b, 0) / 100 * 30

    points.push(new THREE.Vector3(x, y, z))
  })

  return points
}

function createPointCloud(positions: THREE.Vector3[]) {
  const geometry = new THREE.BufferGeometry()
  const colors = []
  const sizes = []

  // Set positions
  const positionArray = new Float32Array(positions.length * 3)
  positions.forEach((pos, i) => {
    positionArray[i * 3] = pos.x
    positionArray[i * 3 + 1] = pos.y
    positionArray[i * 3 + 2] = pos.z
  })
  geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3))

  // Set colors based on selected mode
  props.results.forEach((result, i) => {
    const color = getPointColor(result, i)
    colors.push(color.r, color.g, color.b)
    sizes.push(pointSize.value)
  })

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

  // Create material
  const material = new THREE.ShaderMaterial({
    uniforms: {
      pointSize: { value: pointSize.value }
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;

      void main() {
        vColor = color;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;

      void main() {
        float r = distance(gl_PointCoord, vec2(0.5));
        if (r > 0.5) discard;

        gl_FragColor = vec4(vColor, 1.0 - r);
      }
    `,
    transparent: true
  })

  points = new THREE.Points(geometry, material)
  scene.add(points)
}

function createConnections(positions: THREE.Vector3[], embeddings: number[][]) {
  const connectionGeometry = new THREE.BufferGeometry()
  const connectionPositions = []
  const connectionColors = []
  let connectionCount = 0

  // Calculate connections based on similarity
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const similarity = calculateCosineSimilarity(embeddings[i], embeddings[j])

      if (similarity > similarityThreshold.value) {
        // Add connection line
        connectionPositions.push(
          positions[i].x, positions[i].y, positions[i].z,
          positions[j].x, positions[j].y, positions[j].z
        )

        // Color based on similarity strength
        const opacity = (similarity - similarityThreshold.value) / (1 - similarityThreshold.value)
        connectionColors.push(
          0.5, 0.5, 1.0, opacity * connectionOpacity.value,
          0.5, 0.5, 1.0, opacity * connectionOpacity.value
        )

        connectionCount++
      }
    }
  }

  if (connectionPositions.length > 0) {
    connectionGeometry.setAttribute('position', new THREE.Float32BufferAttribute(connectionPositions, 3))
    connectionGeometry.setAttribute('color', new THREE.Float32BufferAttribute(connectionColors, 4))

    const connectionMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: connectionOpacity.value
    })

    connections = new THREE.LineSegments(connectionGeometry, connectionMaterial)
    scene.add(connections)
  }

  visibleConnections.value = connectionCount
}

function getPointColor(result: SearchResult, index: number): THREE.Color {
  const color = new THREE.Color()

  switch (colorMode.value) {
    case 'score':
      const score = result.score || 0.5
      color.setHSL(score * 0.3, 0.8, 0.6) // Green to red gradient
      break

    case 'collection':
      const collectionColors = d3.schemeCategory10
      const collectionIndex = hashString(result.collection || '') % collectionColors.length
      color.set(collectionColors[collectionIndex])
      legendColors.value[result.collection || 'Unknown'] = collectionColors[collectionIndex]
      break

    case 'type':
      const typeColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']
      const typeIndex = hashString(result.type || 'memory') % typeColors.length
      color.set(typeColors[typeIndex])
      legendColors.value[result.type || 'Memory'] = typeColors[typeIndex]
      break

    case 'uniform':
    default:
      color.set('#4ecdc4')
      break
  }

  return color
}

function calculateCosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) return 0

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Utility functions
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

function getTextColor(backgroundColor: string): string {
  // Simple contrast calculation
  const color = new THREE.Color(backgroundColor)
  const brightness = (color.r * 299 + color.g * 587 + color.b * 114) / 1000
  return brightness > 0.5 ? '#000000' : '#ffffff'
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}

// Event handlers
function setupInteractivity() {
  if (!threeContainer.value) return

  let mouseDown = false
  let mouseX = 0
  let mouseY = 0

  threeContainer.value.addEventListener('mousedown', (event) => {
    mouseDown = true
    mouseX = event.clientX
    mouseY = event.clientY
  })

  threeContainer.value.addEventListener('mouseup', () => {
    mouseDown = false
  })

  threeContainer.value.addEventListener('mousemove', (event) => {
    if (!mouseDown) return

    const deltaX = event.clientX - mouseX
    const deltaY = event.clientY - mouseY

    // Rotate camera around scene center
    const spherical = new THREE.Spherical()
    spherical.setFromVector3(camera.position)
    spherical.theta -= deltaX * 0.01
    spherical.phi += deltaY * 0.01
    spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi))

    camera.position.setFromSpherical(spherical)
    camera.lookAt(0, 0, 0)

    mouseX = event.clientX
    mouseY = event.clientY
  })

  // Zoom with mouse wheel
  threeContainer.value.addEventListener('wheel', (event) => {
    const scale = event.deltaY > 0 ? 1.1 : 0.9
    camera.position.multiplyScalar(scale)
    camera.position.clampLength(10, 200)
    event.preventDefault()
  })
}

function onMouseMove(event: MouseEvent) {
  // Handle mouse hover for point selection
  // Implementation would use raycasting to detect hovered points
}

function onMouseClick(event: MouseEvent) {
  // Handle point selection
  // Implementation would use raycasting to select clicked points
}

// Control handlers
function updateVisualization() {
  generateVisualization()
}

function updatePointSizes() {
  if (points && points.material) {
    const material = points.material as THREE.ShaderMaterial
    material.uniforms.pointSize.value = pointSize.value
  }
}

function toggleLabels() {
  // Implementation for showing/hiding text labels
}

function updateClustering() {
  if (enableClustering.value) {
    // Implement clustering algorithm (k-means or similar)
    clusterCount.value = Math.ceil(props.results.length / 10)
  } else {
    clusterCount.value = 0
  }
}

function updateConnections() {
  if (props.results.length > 0) {
    generateVisualization()
  }
}

function updateConnectionOpacity() {
  if (connections && connections.material) {
    const material = connections.material as THREE.LineBasicMaterial
    material.opacity = connectionOpacity.value
  }
}

function updateStatistics() {
  // Calculate average similarity
  const similarities: number[] = []
  if (props.results.length > 1) {
    const embeddings = generateEmbeddings(props.results)
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        similarities.push(calculateCosineSimilarity(embeddings[i], embeddings[j]))
      }
    }
    averageSimilarity.value = similarities.reduce((a, b) => a + b, 0) / similarities.length
  }
}

// Action handlers
function resetCamera() {
  if (camera) {
    camera.position.set(0, 0, 50)
    camera.lookAt(0, 0, 0)
  }
}

function takeScreenshot() {
  if (renderer) {
    const link = document.createElement('a')
    link.download = `embedding-visualization-${Date.now()}.png`
    link.href = renderer.domElement.toDataURL()
    link.click()
  }
}

function exportData() {
  const data = {
    results: props.results,
    query: props.query,
    settings: {
      visualizationMode: visualizationMode.value,
      colorMode: colorMode.value,
      similarityThreshold: similarityThreshold.value
    },
    statistics: {
      visibleConnections: visibleConnections.value,
      clusterCount: clusterCount.value,
      averageSimilarity: averageSimilarity.value
    },
    exportedAt: new Date().toISOString()
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `embedding-data-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function animate() {
  animationId = requestAnimationFrame(animate)
  if (renderer && scene && camera) {
    renderer.render(scene, camera)
  }
}

function cleanup() {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  if (renderer) {
    renderer.dispose()
  }
}
</script>

<style scoped>
.embedding-visualization {
  position: relative;
}

.three-container {
  width: 100%;
  height: 600px;
  position: relative;
  overflow: hidden;
}

.info-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  max-width: 300px;
  z-index: 10;
}

.stats-panel {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 10;
}

.controls-panel {
  z-index: 5;
}

.legend-panel {
  z-index: 5;
}
</style>