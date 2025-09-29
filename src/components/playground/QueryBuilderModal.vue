<template>
  <v-dialog v-model="localVisible" max-width="1200px" persistent>
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center bg-primary">
        <span class="text-white">
          <v-icon class="mr-2" color="white">mdi-cog-outline</v-icon>
          Visual Query Builder
        </span>
        <v-btn icon="mdi-close" variant="text" color="white" @click="localVisible = false" />
      </v-card-title>

      <v-card-text class="pa-0">
        <v-row no-gutters style="height: 600px;">
          <!-- Left Panel: Available Filters -->
          <v-col cols="3" class="border-e">
            <div class="pa-3">
              <h4 class="text-subtitle-1 mb-3">Available Filters</h4>

              <v-expansion-panels variant="accordion" multiple>
                <!-- Text Filters -->
                <v-expansion-panel>
                  <v-expansion-panel-title>
                    <v-icon class="mr-2" size="small">mdi-format-text</v-icon>
                    Text Filters
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <div
                      v-for="filter in textFilters"
                      :key="filter.id"
                      :draggable="true"
                      @dragstart="startDrag($event, filter)"
                      class="filter-item pa-2 mb-2"
                    >
                      <v-icon size="small" class="mr-1">{{ filter.icon }}</v-icon>
                      {{ filter.label }}
                    </div>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <!-- Metadata Filters -->
                <v-expansion-panel>
                  <v-expansion-panel-title>
                    <v-icon class="mr-2" size="small">mdi-tag</v-icon>
                    Metadata Filters
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <div
                      v-for="filter in metadataFilters"
                      :key="filter.id"
                      :draggable="true"
                      @dragstart="startDrag($event, filter)"
                      class="filter-item pa-2 mb-2"
                    >
                      <v-icon size="small" class="mr-1">{{ filter.icon }}</v-icon>
                      {{ filter.label }}
                    </div>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <!-- Date Filters -->
                <v-expansion-panel>
                  <v-expansion-panel-title>
                    <v-icon class="mr-2" size="small">mdi-calendar</v-icon>
                    Date Filters
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <div
                      v-for="filter in dateFilters"
                      :key="filter.id"
                      :draggable="true"
                      @dragstart="startDrag($event, filter)"
                      class="filter-item pa-2 mb-2"
                    >
                      <v-icon size="small" class="mr-1">{{ filter.icon }}</v-icon>
                      {{ filter.label }}
                    </div>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <!-- Logical Operators -->
                <v-expansion-panel>
                  <v-expansion-panel-title>
                    <v-icon class="mr-2" size="small">mdi-logic-buffer</v-icon>
                    Logical Operators
                  </v-expansion-panel-title>
                  <v-expansion-panel-text>
                    <div
                      v-for="operator in logicalOperators"
                      :key="operator.id"
                      :draggable="true"
                      @dragstart="startDrag($event, operator)"
                      class="filter-item pa-2 mb-2"
                    >
                      <v-icon size="small" class="mr-1">{{ operator.icon }}</v-icon>
                      {{ operator.label }}
                    </div>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </div>
          </v-col>

          <!-- Center Panel: Query Canvas -->
          <v-col cols="6" class="bg-grey-lighten-5">
            <div class="pa-3 h-100 d-flex flex-column">
              <h4 class="text-subtitle-1 mb-3">Query Canvas</h4>

              <div
                class="query-canvas flex-grow-1 pa-4"
                @drop="handleDrop"
                @dragover.prevent
                @dragenter.prevent
              >
                <div v-if="queryBlocks.length === 0" class="text-center py-8">
                  <v-icon size="64" color="grey-lighten-1">mdi-drag</v-icon>
                  <p class="mt-3 text-medium-emphasis">
                    Drag filters here to build your query
                  </p>
                </div>

                <v-row v-else>
                  <v-col
                    v-for="(block, index) in queryBlocks"
                    :key="block.id"
                    cols="12"
                  >
                    <v-card
                      :class="['query-block', block.type]"
                      variant="outlined"
                    >
                      <v-card-text class="d-flex align-center">
                        <v-icon class="mr-2">{{ block.icon }}</v-icon>

                        <div class="flex-grow-1">
                          <div class="text-caption text-medium-emphasis">
                            {{ block.label }}
                          </div>

                          <!-- Input fields based on filter type -->
                          <div class="mt-1">
                            <v-text-field
                              v-if="block.inputType === 'text'"
                              v-model="block.value"
                              :placeholder="block.placeholder"
                              density="compact"
                              variant="outlined"
                              hide-details
                            />

                            <v-select
                              v-else-if="block.inputType === 'select'"
                              v-model="block.value"
                              :items="block.options"
                              density="compact"
                              variant="outlined"
                              hide-details
                            />

                            <v-row v-else-if="block.inputType === 'date-range'" no-gutters>
                              <v-col cols="6" class="pr-1">
                                <v-text-field
                                  v-model="block.startDate"
                                  type="date"
                                  label="From"
                                  density="compact"
                                  variant="outlined"
                                  hide-details
                                />
                              </v-col>
                              <v-col cols="6" class="pl-1">
                                <v-text-field
                                  v-model="block.endDate"
                                  type="date"
                                  label="To"
                                  density="compact"
                                  variant="outlined"
                                  hide-details
                                />
                              </v-col>
                            </v-row>

                            <v-slider
                              v-else-if="block.inputType === 'slider'"
                              v-model="block.value"
                              :min="block.min"
                              :max="block.max"
                              :step="block.step"
                              density="compact"
                              hide-details
                              thumb-label
                            />
                          </div>
                        </div>

                        <v-btn
                          icon="mdi-close"
                          size="small"
                          variant="text"
                          @click="removeBlock(index)"
                        />
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </div>

              <!-- Query Actions -->
              <div class="mt-3 d-flex gap-2">
                <v-btn
                  variant="outlined"
                  size="small"
                  @click="clearQuery"
                  :disabled="queryBlocks.length === 0"
                >
                  <v-icon start>mdi-delete</v-icon>
                  Clear All
                </v-btn>

                <v-btn
                  variant="outlined"
                  size="small"
                  @click="saveAsTemplate"
                  :disabled="queryBlocks.length === 0"
                >
                  <v-icon start>mdi-content-save</v-icon>
                  Save as Template
                </v-btn>
              </div>
            </div>
          </v-col>

          <!-- Right Panel: Query Preview -->
          <v-col cols="3" class="border-s">
            <div class="pa-3">
              <h4 class="text-subtitle-1 mb-3">Query Preview</h4>

              <v-card variant="outlined" class="mb-3">
                <v-card-text>
                  <div class="text-caption text-medium-emphasis mb-1">
                    Natural Language
                  </div>
                  <div class="text-body-2">
                    {{ naturalLanguageQuery || 'No query built yet' }}
                  </div>
                </v-card-text>
              </v-card>

              <v-card variant="outlined" class="mb-3">
                <v-card-text>
                  <div class="text-caption text-medium-emphasis mb-1">
                    JSON Query
                  </div>
                  <pre class="text-caption">{{ jsonQuery }}</pre>
                </v-card-text>
              </v-card>

              <!-- Quick Templates -->
              <h4 class="text-subtitle-2 mb-2 mt-4">Quick Templates</h4>
              <v-list density="compact">
                <v-list-item
                  v-for="template in quickTemplates"
                  :key="template.id"
                  @click="applyTemplate(template)"
                >
                  <v-list-item-title class="text-caption">
                    {{ template.name }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </div>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions>
        <v-btn variant="text" @click="localVisible = false">
          Cancel
        </v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          variant="flat"
          @click="applyQuery"
          :disabled="queryBlocks.length === 0"
        >
          <v-icon start>mdi-check</v-icon>
          Apply Query
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'

interface Props {
  modelValue: boolean
}

interface FilterBlock {
  id: string
  type: string
  label: string
  icon: string
  inputType: 'text' | 'select' | 'date-range' | 'slider' | 'none'
  value?: any
  options?: any[]
  placeholder?: string
  min?: number
  max?: number
  step?: number
  startDate?: string
  endDate?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  applyQuery: [query: any]
}>()

const localVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Filter definitions
const textFilters = [
  { id: 'contains', label: 'Contains Text', icon: 'mdi-text-search', inputType: 'text', placeholder: 'Enter text...' },
  { id: 'exact', label: 'Exact Match', icon: 'mdi-equal', inputType: 'text', placeholder: 'Exact text...' },
  { id: 'regex', label: 'Regular Expression', icon: 'mdi-regex', inputType: 'text', placeholder: 'Pattern...' },
]

const metadataFilters = [
  { id: 'type', label: 'Memory Type', icon: 'mdi-tag', inputType: 'select', options: ['note', 'email', 'document', 'chat'] },
  { id: 'collection', label: 'Collection', icon: 'mdi-folder', inputType: 'select', options: [] },
  { id: 'score', label: 'Minimum Score', icon: 'mdi-target', inputType: 'slider', min: 0, max: 1, step: 0.1 },
]

const dateFilters = [
  { id: 'created_after', label: 'Created After', icon: 'mdi-calendar-plus', inputType: 'date-range' },
  { id: 'updated_before', label: 'Updated Before', icon: 'mdi-calendar-minus', inputType: 'date-range' },
  { id: 'date_range', label: 'Date Range', icon: 'mdi-calendar-range', inputType: 'date-range' },
]

const logicalOperators = [
  { id: 'and', label: 'AND Group', icon: 'mdi-set-all', inputType: 'none' },
  { id: 'or', label: 'OR Group', icon: 'mdi-set-center', inputType: 'none' },
  { id: 'not', label: 'NOT Group', icon: 'mdi-set-none', inputType: 'none' },
]

// Query building state
const queryBlocks = ref<FilterBlock[]>([])
const draggedItem = ref<FilterBlock | null>(null)

// Quick templates
const quickTemplates = [
  { id: 'recent', name: 'Recent Items' },
  { id: 'high_score', name: 'High Relevance' },
  { id: 'this_week', name: 'This Week' },
  { id: 'important', name: 'Important Only' },
]

// Drag and drop handlers
function startDrag(event: DragEvent, filter: any) {
  draggedItem.value = filter
  event.dataTransfer!.effectAllowed = 'copy'
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  if (draggedItem.value) {
    const newBlock: FilterBlock = {
      ...draggedItem.value,
      id: `${draggedItem.value.id}_${Date.now()}`,
      value: draggedItem.value.inputType === 'slider' ? 0.5 : ''
    }
    queryBlocks.value.push(newBlock)
    draggedItem.value = null
  }
}

function removeBlock(index: number) {
  queryBlocks.value.splice(index, 1)
}

function clearQuery() {
  queryBlocks.value = []
}

function saveAsTemplate() {
  // Save current query as template
  console.log('Saving as template:', queryBlocks.value)
}

function applyTemplate(template: any) {
  // Apply a quick template
  queryBlocks.value = []

  switch (template.id) {
    case 'recent':
      queryBlocks.value.push({
        id: 'created_after_' + Date.now(),
        type: 'date',
        label: 'Created After',
        icon: 'mdi-calendar-plus',
        inputType: 'date-range',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
      break
    case 'high_score':
      queryBlocks.value.push({
        id: 'score_' + Date.now(),
        type: 'metadata',
        label: 'Minimum Score',
        icon: 'mdi-target',
        inputType: 'slider',
        value: 0.8,
        min: 0,
        max: 1,
        step: 0.1
      })
      break
  }
}

function applyQuery() {
  const query = buildQuery()
  emit('applyQuery', query)
  localVisible.value = false
}

function buildQuery() {
  const filters: any = {}

  queryBlocks.value.forEach(block => {
    switch (block.id.split('_')[0]) {
      case 'contains':
        filters.content = { $contains: block.value }
        break
      case 'type':
        filters.type = block.value
        break
      case 'score':
        filters.min_score = block.value
        break
      case 'created':
        if (block.startDate) {
          filters.created_at = { $gte: block.startDate }
        }
        break
    }
  })

  return filters
}

// Computed properties
const naturalLanguageQuery = computed(() => {
  if (queryBlocks.value.length === 0) return ''

  return queryBlocks.value.map(block => {
    switch (block.id.split('_')[0]) {
      case 'contains':
        return `containing "${block.value}"`
      case 'type':
        return `of type "${block.value}"`
      case 'score':
        return `with score >= ${block.value}`
      case 'created':
        return `created after ${block.startDate}`
      default:
        return ''
    }
  }).filter(Boolean).join(' AND ')
})

const jsonQuery = computed(() => {
  return JSON.stringify(buildQuery(), null, 2)
})
</script>

<style scoped>
.filter-item {
  background: #f5f5f5;
  border-radius: 4px;
  cursor: grab;
  transition: all 0.2s;
}

.filter-item:hover {
  background: #e0e0e0;
  transform: translateX(2px);
}

.filter-item:active {
  cursor: grabbing;
}

.query-canvas {
  background: white;
  border: 2px dashed #e0e0e0;
  border-radius: 8px;
  min-height: 400px;
  overflow-y: auto;
}

.query-canvas:hover {
  border-color: #ccc;
}

.query-block {
  transition: all 0.2s;
}

.query-block:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

pre {
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}
</style>