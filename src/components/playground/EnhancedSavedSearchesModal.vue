<template>
  <v-dialog v-model="localVisible" max-width="800px" persistent>
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center bg-secondary">
        <span class="text-white">
          <v-icon class="mr-2" color="white">mdi-content-save-all</v-icon>
          Saved Searches & Quick Actions
        </span>
        <v-btn icon="mdi-close" variant="text" color="white" @click="localVisible = false" />
      </v-card-title>

      <v-card-text class="pa-0">
        <v-tabs v-model="activeTab" bg-color="grey-lighten-4">
          <v-tab value="saved">
            <v-icon start>mdi-content-save</v-icon>
            Saved Searches
            <v-chip size="x-small" class="ml-2">{{ savedSearches.length }}</v-chip>
          </v-tab>
          <v-tab value="quick">
            <v-icon start>mdi-flash</v-icon>
            Quick Actions
          </v-tab>
        </v-tabs>

        <v-card-text>
          <v-tabs-window v-model="activeTab">
            <!-- Saved Searches Tab -->
            <v-tabs-window-item value="saved">
              <!-- Search Bar -->
              <div class="mb-4">
                <v-text-field
                  v-model="searchFilter"
                  label="Search saved searches..."
                  prepend-inner-icon="mdi-magnify"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </div>

              <!-- Saved Searches List -->
              <div v-if="filteredSearches.length === 0" class="text-center py-8">
                <v-icon size="64" color="grey-lighten-1">mdi-content-save-outline</v-icon>
                <h3 class="mt-4 mb-2">
                  {{ savedSearches.length === 0 ? 'No Saved Searches' : 'No Matches Found' }}
                </h3>
                <p class="text-medium-emphasis">
                  {{ savedSearches.length === 0
                    ? 'Save searches from the main interface to see them here'
                    : 'Try a different search term' }}
                </p>
              </div>

              <v-row v-else>
                <v-col
                  v-for="search in filteredSearches"
                  :key="search.id"
                  cols="12"
                >
                  <v-card variant="outlined" hover>
                    <v-card-title class="d-flex justify-space-between align-start">
                      <div class="flex-grow-1">
                        <div class="text-h6">{{ search.name }}</div>
                        <div class="text-body-2 text-medium-emphasis mt-1">
                          {{ search.query }}
                        </div>
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
                          <v-list-item @click="runSearch(search)">
                            <v-list-item-title>
                              <v-icon start>mdi-play</v-icon>
                              Run Search
                            </v-list-item-title>
                          </v-list-item>
                          <v-list-item @click="editSearch(search)">
                            <v-list-item-title>
                              <v-icon start>mdi-pencil</v-icon>
                              Edit Name
                            </v-list-item-title>
                          </v-list-item>
                          <v-list-item @click="convertToTemplate(search)">
                            <v-list-item-title>
                              <v-icon start>mdi-clipboard-text</v-icon>
                              Convert to Template
                            </v-list-item-title>
                          </v-list-item>
                          <v-list-item @click="duplicateSearch(search)">
                            <v-list-item-title>
                              <v-icon start>mdi-content-copy</v-icon>
                              Duplicate
                            </v-list-item-title>
                          </v-list-item>
                          <v-divider />
                          <v-list-item @click="deleteSearch(search.id)" color="error">
                            <v-list-item-title>
                              <v-icon start>mdi-delete</v-icon>
                              Delete
                            </v-list-item-title>
                          </v-list-item>
                        </v-list>
                      </v-menu>
                    </v-card-title>

                    <v-card-text>
                      <!-- Search Details -->
                      <v-row dense class="mb-3">
                        <v-col cols="12" sm="6">
                          <div class="text-caption text-medium-emphasis">Search Mode:</div>
                          <v-chip size="small" :color="getModeColor(search.options.searchMode)">
                            {{ search.options.searchMode || 'semantic' }}
                          </v-chip>
                        </v-col>
                        <v-col cols="12" sm="6">
                          <div class="text-caption text-medium-emphasis">Result Limit:</div>
                          <div class="text-body-2">{{ search.options.limit || 20 }} results</div>
                        </v-col>
                      </v-row>

                      <!-- Collections -->
                      <div v-if="search.collections.length > 0" class="mb-3">
                        <div class="text-caption text-medium-emphasis mb-1">Collections:</div>
                        <div class="d-flex flex-wrap gap-1">
                          <v-chip
                            v-for="collection in search.collections"
                            :key="collection"
                            size="small"
                            variant="outlined"
                          >
                            {{ collection }}
                          </v-chip>
                        </div>
                      </div>

                      <!-- Metadata -->
                      <div class="d-flex justify-space-between text-caption text-medium-emphasis">
                        <span>{{ formatDate(search.timestamp) }}</span>
                        <span v-if="search.resultCount !== undefined">
                          {{ search.resultCount }} results found
                        </span>
                      </div>
                    </v-card-text>

                    <v-card-actions>
                      <v-btn
                        color="primary"
                        variant="flat"
                        @click="runSearch(search)"
                        block
                      >
                        <v-icon start>mdi-play</v-icon>
                        Run Search
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-col>
              </v-row>
            </v-tabs-window-item>

            <!-- Quick Actions Tab -->
            <v-tabs-window-item value="quick">
              <div class="mb-4">
                <h4 class="text-h6 mb-3">Save Current Search</h4>
                <v-card variant="outlined">
                  <v-card-text>
                    <v-text-field
                      v-model="quickSaveName"
                      label="Search Name"
                      variant="outlined"
                      density="comfortable"
                      prepend-inner-icon="mdi-tag"
                      placeholder="Enter a descriptive name..."
                    />
                    <div class="text-body-2 text-medium-emphasis mb-3">
                      This will save your current search query, selected collections, and options.
                    </div>
                    <v-btn
                      color="primary"
                      @click="quickSaveCurrentSearch"
                      :disabled="!quickSaveName.trim()"
                      block
                    >
                      <v-icon start>mdi-content-save</v-icon>
                      Save Current Search
                    </v-btn>
                  </v-card-text>
                </v-card>
              </div>

              <div class="mb-4">
                <h4 class="text-h6 mb-3">Bulk Actions</h4>
                <v-row>
                  <v-col cols="12" sm="6">
                    <v-btn
                      variant="outlined"
                      @click="exportSavedSearches"
                      :disabled="savedSearches.length === 0"
                      block
                    >
                      <v-icon start>mdi-download</v-icon>
                      Export All
                    </v-btn>
                  </v-col>
                  <v-col cols="12" sm="6">
                    <v-btn
                      variant="outlined"
                      color="warning"
                      @click="clearAllSavedSearches"
                      :disabled="savedSearches.length === 0"
                      block
                    >
                      <v-icon start>mdi-delete-sweep</v-icon>
                      Clear All
                    </v-btn>
                  </v-col>
                </v-row>
              </div>

              <div>
                <h4 class="text-h6 mb-3">Recent Activity</h4>
                <div v-if="recentSearches.length === 0" class="text-center py-4">
                  <v-icon size="48" color="grey-lighten-1">mdi-history</v-icon>
                  <p class="mt-2 text-medium-emphasis">No recent activity</p>
                </div>

                <v-list v-else density="compact">
                  <v-list-item
                    v-for="search in recentSearches"
                    :key="search.id"
                    @click="runSearch(search)"
                  >
                    <template #prepend>
                      <v-icon size="small">mdi-history</v-icon>
                    </template>

                    <v-list-item-title>{{ search.name }}</v-list-item-title>
                    <v-list-item-subtitle>{{ formatRelativeTime(search.timestamp) }}</v-list-item-subtitle>

                    <template #append>
                      <v-btn
                        icon="mdi-content-save-plus"
                        variant="text"
                        size="small"
                        @click.stop="quickSaveFromRecent(search)"
                        title="Save as new search"
                      />
                    </template>
                  </v-list-item>
                </v-list>
              </div>
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
          color="primary"
          variant="outlined"
          @click="$emit('saveCurrentSearch')"
        >
          <v-icon start>mdi-plus</v-icon>
          Save Current Search
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

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
  savedSearches: SavedSearch[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  runSearch: [search: SavedSearch]
  saveCurrentSearch: []
  deleteSearch: [id: string]
}>()

const localVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Tab state
const activeTab = ref('saved')

// Search filtering
const searchFilter = ref('')

// Quick save
const quickSaveName = ref('')

// Computed properties
const filteredSearches = computed(() => {
  if (!searchFilter.value) return props.savedSearches

  const filter = searchFilter.value.toLowerCase()
  return props.savedSearches.filter(search =>
    search.name.toLowerCase().includes(filter) ||
    search.query.toLowerCase().includes(filter) ||
    search.collections.some(c => c.toLowerCase().includes(filter))
  )
})

const recentSearches = computed(() =>
  props.savedSearches
    .slice()
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 5)
)

// Search actions
function runSearch(search: SavedSearch) {
  emit('runSearch', search)
}

function editSearch(search: SavedSearch) {
  const newName = prompt('Enter new name:', search.name)
  if (newName && newName !== search.name) {
    // Update the search name (would need to be implemented in the store)
    // For now, we'll just emit a save with the new name
    const updatedSearch = { ...search, name: newName, timestamp: new Date() }
    // This would need to be handled by the parent component
    console.log('Update search name:', updatedSearch)
  }
}

function deleteSearch(id: string) {
  if (confirm('Are you sure you want to delete this saved search?')) {
    emit('deleteSearch', id)
  }
}

function convertToTemplate(search: SavedSearch) {
  // This would need to be handled by parent to open templates modal
  console.log('Convert to template:', search)
}

function duplicateSearch(search: SavedSearch) {
  const newName = `${search.name} (Copy)`
  const duplicatedSearch = {
    ...search,
    name: newName,
    timestamp: new Date()
  }
  // This would need to be handled by the parent component
  console.log('Duplicate search:', duplicatedSearch)
}

function quickSaveCurrentSearch() {
  if (quickSaveName.value.trim()) {
    emit('saveCurrentSearch')
    quickSaveName.value = ''
    activeTab.value = 'saved'
  }
}

function quickSaveFromRecent(search: SavedSearch) {
  const newName = prompt('Enter name for saved search:', `${search.name} (Saved)`)
  if (newName) {
    // This would create a new saved search
    console.log('Save from recent:', { ...search, name: newName })
  }
}

// Bulk actions
function exportSavedSearches() {
  const data = {
    savedSearches: props.savedSearches,
    exportedAt: new Date().toISOString()
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `saved-searches-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function clearAllSavedSearches() {
  if (confirm('Are you sure you want to delete ALL saved searches? This cannot be undone.')) {
    props.savedSearches.forEach(search => emit('deleteSearch', search.id))
  }
}

// Utilities
function getModeColor(mode: string): string {
  const colors = {
    'semantic': 'blue',
    'hybrid': 'purple',
    'exact': 'green'
  }
  return colors[mode as keyof typeof colors] || 'grey'
}

function formatDate(date: Date): string {
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  return `${Math.floor(diffInSeconds / 86400)}d ago`
}
</script>

<style scoped>
.v-card {
  transition: transform 0.2s ease-in-out;
}

.v-card:hover {
  transform: translateY(-1px);
}
</style>