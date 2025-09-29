<template>
  <v-dialog v-model="localVisible" max-width="1000px" persistent>
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center bg-primary">
        <span class="text-white">
          <v-icon class="mr-2" color="white">mdi-clipboard-text-multiple</v-icon>
          Search Templates & Saved Searches
        </span>
        <v-btn icon="mdi-close" variant="text" color="white" @click="localVisible = false" />
      </v-card-title>

      <v-card-text class="pa-0">
        <v-tabs v-model="activeTab" bg-color="grey-lighten-4">
          <v-tab value="templates">
            <v-icon start>mdi-clipboard-text</v-icon>
            Templates
            <v-chip size="x-small" class="ml-2">{{ templates.length }}</v-chip>
          </v-tab>
          <v-tab value="saved">
            <v-icon start>mdi-content-save</v-icon>
            Saved Searches
            <v-chip size="x-small" class="ml-2">{{ savedSearches.length }}</v-chip>
          </v-tab>
          <v-tab value="create">
            <v-icon start>mdi-plus</v-icon>
            Create Template
          </v-tab>
        </v-tabs>

        <v-card-text>
          <v-tabs-window v-model="activeTab">
            <!-- Templates Tab -->
            <v-tabs-window-item value="templates">
              <!-- Search and Filter -->
              <div class="mb-4">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="templateSearch"
                      label="Search templates..."
                      prepend-inner-icon="mdi-magnify"
                      variant="outlined"
                      density="compact"
                      hide-details
                      clearable
                    />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-select
                      v-model="selectedCategory"
                      label="Category"
                      :items="templateCategories"
                      variant="outlined"
                      density="compact"
                      hide-details
                      clearable
                    />
                  </v-col>
                  <v-col cols="12" md="3">
                    <v-select
                      v-model="selectedTag"
                      label="Tag"
                      :items="availableTags"
                      variant="outlined"
                      density="compact"
                      hide-details
                      clearable
                    />
                  </v-col>
                </v-row>
              </div>

              <!-- Templates List -->
              <div v-if="filteredTemplates.length === 0" class="text-center py-8">
                <v-icon size="64" color="grey-lighten-1">mdi-clipboard-text-outline</v-icon>
                <h3 class="mt-4 mb-2">No Templates Found</h3>
                <p class="text-medium-emphasis">Try adjusting your search filters</p>
              </div>

              <v-row v-else>
                <v-col
                  v-for="template in filteredTemplates"
                  :key="template.id"
                  cols="12"
                  md="6"
                >
                  <v-card variant="outlined" hover class="h-100">
                    <v-card-title class="d-flex justify-space-between align-start">
                      <div>
                        <div class="text-h6">{{ template.name }}</div>
                        <v-chip
                          size="small"
                          :color="getCategoryColor(template.category)"
                          class="mt-1"
                        >
                          {{ template.category }}
                        </v-chip>
                      </div>

                      <v-menu location="bottom end">
                        <template #activator="{ props }">
                          <v-btn
                            icon="mdi-dots-vertical"
                            variant="text"
                            size="small"
                            v-bind="props"
                          />
                        </template>
                        <v-list>
                          <v-list-item @click="useTemplate(template)">
                            <v-list-item-title>
                              <v-icon start>mdi-play</v-icon>
                              Use Template
                            </v-list-item-title>
                          </v-list-item>
                          <v-list-item @click="editTemplate(template)" :disabled="isDefaultTemplate(template.id)">
                            <v-list-item-title>
                              <v-icon start>mdi-pencil</v-icon>
                              Edit
                            </v-list-item-title>
                          </v-list-item>
                          <v-list-item @click="duplicateTemplate(template)">
                            <v-list-item-title>
                              <v-icon start>mdi-content-copy</v-icon>
                              Duplicate
                            </v-list-item-title>
                          </v-list-item>
                          <v-divider />
                          <v-list-item
                            @click="deleteTemplate(template.id)"
                            :disabled="isDefaultTemplate(template.id)"
                            color="error"
                          >
                            <v-list-item-title>
                              <v-icon start>mdi-delete</v-icon>
                              Delete
                            </v-list-item-title>
                          </v-list-item>
                        </v-list>
                      </v-menu>
                    </v-card-title>

                    <v-card-text>
                      <p class="text-body-2 mb-3">{{ template.description }}</p>

                      <!-- Template Preview -->
                      <div class="mb-3">
                        <div class="text-caption text-medium-emphasis mb-1">Query:</div>
                        <code class="text-caption pa-2 bg-grey-lighten-4 rounded d-block">
                          {{ template.query || 'No query specified' }}
                        </code>
                      </div>

                      <!-- Tags -->
                      <div v-if="template.tags.length > 0" class="mb-2">
                        <v-chip
                          v-for="tag in template.tags"
                          :key="tag"
                          size="x-small"
                          variant="outlined"
                          class="mr-1"
                        >
                          {{ tag }}
                        </v-chip>
                      </div>

                      <!-- Settings Summary -->
                      <v-row dense class="text-caption">
                        <v-col>
                          <strong>Mode:</strong> {{ template.options.searchMode }}
                        </v-col>
                        <v-col>
                          <strong>Limit:</strong> {{ template.options.limit }}
                        </v-col>
                        <v-col v-if="template.options.minScore > 0">
                          <strong>Min Score:</strong> {{ template.options.minScore }}
                        </v-col>
                      </v-row>
                    </v-card-text>

                    <v-card-actions>
                      <v-btn
                        color="primary"
                        variant="flat"
                        @click="useTemplate(template)"
                        block
                      >
                        <v-icon start>mdi-play</v-icon>
                        Use Template
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-col>
              </v-row>
            </v-tabs-window-item>

            <!-- Saved Searches Tab -->
            <v-tabs-window-item value="saved">
              <div v-if="savedSearches.length === 0" class="text-center py-8">
                <v-icon size="64" color="grey-lighten-1">mdi-content-save-outline</v-icon>
                <h3 class="mt-4 mb-2">No Saved Searches</h3>
                <p class="text-medium-emphasis">Save searches from the main interface to see them here</p>
              </div>

              <v-list v-else>
                <v-list-item
                  v-for="search in savedSearches"
                  :key="search.id"
                  @click="runSavedSearch(search)"
                  class="mb-2"
                >
                  <template #prepend>
                    <v-avatar color="secondary">
                      <v-icon>mdi-magnify</v-icon>
                    </v-avatar>
                  </template>

                  <v-list-item-title>{{ search.name }}</v-list-item-title>
                  <v-list-item-subtitle>
                    <div>{{ search.query }}</div>
                    <div class="text-caption">
                      {{ formatDate(search.timestamp) }}
                      <span v-if="search.resultCount !== undefined">
                        • {{ search.resultCount }} results
                      </span>
                      <span v-if="search.collections.length > 0">
                        • {{ search.collections.join(', ') }}
                      </span>
                    </div>
                  </v-list-item-subtitle>

                  <template #append>
                    <div class="d-flex gap-1">
                      <v-btn
                        icon="mdi-content-save-edit"
                        variant="text"
                        size="small"
                        @click.stop="convertToTemplate(search)"
                        title="Convert to Template"
                      />
                      <v-btn
                        icon="mdi-delete"
                        variant="text"
                        size="small"
                        color="error"
                        @click.stop="deleteSavedSearch(search.id)"
                      />
                    </div>
                  </template>
                </v-list-item>
              </v-list>
            </v-tabs-window-item>

            <!-- Create Template Tab -->
            <v-tabs-window-item value="create">
              <v-form @submit.prevent="createTemplate">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="newTemplate.name"
                      label="Template Name"
                      variant="outlined"
                      required
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-select
                      v-model="newTemplate.category"
                      label="Category"
                      :items="templateCategories"
                      variant="outlined"
                    />
                  </v-col>
                </v-row>

                <v-textarea
                  v-model="newTemplate.description"
                  label="Description"
                  variant="outlined"
                  rows="2"
                  required
                />

                <v-text-field
                  v-model="newTemplate.query"
                  label="Default Query (optional)"
                  variant="outlined"
                  placeholder="Leave empty for user to fill in"
                />

                <v-row>
                  <v-col cols="12" md="4">
                    <v-select
                      v-model="newTemplate.options.searchMode"
                      label="Search Mode"
                      :items="searchModeOptions"
                      variant="outlined"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model.number="newTemplate.options.limit"
                      label="Result Limit"
                      type="number"
                      variant="outlined"
                      min="1"
                      max="100"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model.number="newTemplate.options.minScore"
                      label="Minimum Score"
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      variant="outlined"
                    />
                  </v-col>
                </v-row>

                <v-combobox
                  v-model="newTemplate.tags"
                  label="Tags"
                  variant="outlined"
                  multiple
                  chips
                  closable-chips
                  hint="Press Enter to add tags"
                  persistent-hint
                />

                <div class="d-flex gap-2 mt-4">
                  <v-btn
                    type="submit"
                    color="primary"
                    :disabled="!newTemplate.name || !newTemplate.description"
                  >
                    <v-icon start>mdi-content-save</v-icon>
                    Create Template
                  </v-btn>
                  <v-btn variant="outlined" @click="resetNewTemplate">
                    <v-icon start>mdi-refresh</v-icon>
                    Reset
                  </v-btn>
                </div>
              </v-form>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-card-text>
      </v-card-text>

      <v-card-actions>
        <v-btn variant="text" @click="localVisible = false">
          Close
        </v-btn>
        <v-spacer />
        <v-btn
          variant="outlined"
          @click="exportTemplates"
          :disabled="templates.length === 0"
        >
          <v-icon start>mdi-download</v-icon>
          Export Templates
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface SearchTemplate {
  id: string
  name: string
  description: string
  query: string
  collections: string[]
  options: {
    limit: number
    sortBy: string
    minScore: number
    searchMode: string
  }
  category: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

interface SavedSearch {
  id: string
  name: string
  query: string
  collections: string[]
  options: Record<string, any>
  timestamp: Date
  resultCount?: number
}

interface Props {
  modelValue: boolean
  templates: SearchTemplate[]
  savedSearches: SavedSearch[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  useTemplate: [template: SearchTemplate]
  saveTemplate: [template: any]
  deleteTemplate: [id: string]
  runSavedSearch: [search: SavedSearch]
  deleteSavedSearch: [id: string]
}>()

const localVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Tab state
const activeTab = ref('templates')

// Template filtering
const templateSearch = ref('')
const selectedCategory = ref('')
const selectedTag = ref('')

// New template form
const newTemplate = ref({
  name: '',
  description: '',
  query: '',
  category: 'Custom',
  tags: [] as string[],
  options: {
    searchMode: 'semantic',
    limit: 20,
    minScore: 0
  }
})

// Default templates that can't be deleted
const defaultTemplateIds = ['recent_entries', 'high_relevance', 'broad_search', 'exact_match', 'hybrid_search']

const searchModeOptions = [
  { title: 'Semantic Search', value: 'semantic' },
  { title: 'Hybrid (Semantic + Text)', value: 'hybrid' },
  { title: 'Exact Match', value: 'exact' }
]

// Computed properties
const templateCategories = computed(() => {
  const categories = [...new Set(props.templates.map(t => t.category))]
  return categories.sort()
})

const availableTags = computed(() => {
  const tags = [...new Set(props.templates.flatMap(t => t.tags))]
  return tags.sort()
})

const filteredTemplates = computed(() => {
  let filtered = props.templates

  if (templateSearch.value) {
    const search = templateSearch.value.toLowerCase()
    filtered = filtered.filter(template =>
      template.name.toLowerCase().includes(search) ||
      template.description.toLowerCase().includes(search) ||
      template.tags.some(tag => tag.toLowerCase().includes(search))
    )
  }

  if (selectedCategory.value) {
    filtered = filtered.filter(template => template.category === selectedCategory.value)
  }

  if (selectedTag.value) {
    filtered = filtered.filter(template => template.tags.includes(selectedTag.value))
  }

  return filtered
})

// Template actions
function useTemplate(template: SearchTemplate) {
  emit('useTemplate', template)
}

function editTemplate(template: SearchTemplate) {
  // Switch to create tab and populate form
  newTemplate.value = {
    name: template.name,
    description: template.description,
    query: template.query,
    category: template.category,
    tags: [...template.tags],
    options: { ...template.options }
  }
  activeTab.value = 'create'
}

function duplicateTemplate(template: SearchTemplate) {
  newTemplate.value = {
    name: `${template.name} (Copy)`,
    description: template.description,
    query: template.query,
    category: template.category,
    tags: [...template.tags],
    options: { ...template.options }
  }
  activeTab.value = 'create'
}

function deleteTemplate(id: string) {
  if (isDefaultTemplate(id)) {
    return
  }

  if (confirm('Are you sure you want to delete this template?')) {
    emit('deleteTemplate', id)
  }
}

function isDefaultTemplate(id: string): boolean {
  return defaultTemplateIds.includes(id)
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'General': 'blue',
    'Quality': 'green',
    'Discovery': 'orange',
    'Precision': 'purple',
    'Advanced': 'red',
    'Custom': 'grey'
  }
  return colors[category] || 'grey'
}

// Saved search actions
function runSavedSearch(search: SavedSearch) {
  emit('runSavedSearch', search)
  localVisible.value = false
}

function deleteSavedSearch(id: string) {
  if (confirm('Are you sure you want to delete this saved search?')) {
    emit('deleteSavedSearch', id)
  }
}

function convertToTemplate(search: SavedSearch) {
  newTemplate.value = {
    name: `Template: ${search.name}`,
    description: `Template created from saved search: ${search.query}`,
    query: search.query,
    category: 'Custom',
    tags: ['converted', 'saved-search'],
    options: {
      searchMode: search.options.searchMode || 'semantic',
      limit: search.options.limit || 20,
      minScore: search.options.minScore || 0
    }
  }
  activeTab.value = 'create'
}

// Template creation
function createTemplate() {
  if (!newTemplate.value.name || !newTemplate.value.description) {
    return
  }

  emit('saveTemplate', newTemplate.value)
  resetNewTemplate()
  activeTab.value = 'templates'
}

function resetNewTemplate() {
  newTemplate.value = {
    name: '',
    description: '',
    query: '',
    category: 'Custom',
    tags: [],
    options: {
      searchMode: 'semantic',
      limit: 20,
      minScore: 0
    }
  }
}

// Export functionality
function exportTemplates() {
  const data = {
    templates: props.templates.filter(t => !isDefaultTemplate(t.id)),
    savedSearches: props.savedSearches,
    exportedAt: new Date().toISOString()
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `search-templates-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Utilities
function formatDate(date: Date): string {
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
code {
  word-break: break-all;
  white-space: pre-wrap;
}

.v-card {
  transition: transform 0.2s ease-in-out;
}

.v-card:hover {
  transform: translateY(-2px);
}
</style>