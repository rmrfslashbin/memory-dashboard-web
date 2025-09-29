<template>
  <v-card class="mb-6">
    <v-card-title>Search Query</v-card-title>

    <v-card-text>
      <!-- Search Input with Suggestions -->
      <div class="mb-4">
        <SearchSuggestions
          v-model="localQuery"
          label="Enter your semantic search query..."
          placeholder="Search for concepts, ideas, or any text..."
          :selected-collections="selectedCollections"
          :search-history="searchHistory"
          @search="handleSuggestedSearch"
          @show-advanced="$emit('showQueryBuilder')"
        />
      </div>

      <!-- Search Options -->
      <v-expansion-panels variant="accordion" class="mb-4">
        <v-expansion-panel
          title="Search Options"
          text=""
        >
          <v-expansion-panel-text>
            <v-row>
              <!-- Result Limit -->
              <v-col cols="12" sm="6" md="3">
                <v-select
                  v-model="localOptions.limit"
                  label="Result Limit"
                  :items="limitOptions"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </v-col>

              <!-- Sort By -->
              <v-col cols="12" sm="6" md="3">
                <v-select
                  v-model="localOptions.sortBy"
                  label="Sort By"
                  :items="sortOptions"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </v-col>

              <!-- Minimum Score -->
              <v-col cols="12" sm="6" md="3">
                <v-text-field
                  v-model.number="localOptions.minScore"
                  label="Minimum Score"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </v-col>

              <!-- Search Mode -->
              <v-col cols="12" sm="6" md="3">
                <v-select
                  v-model="localOptions.searchMode"
                  label="Search Mode"
                  :items="searchModeOptions"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </v-col>
            </v-row>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- Action Buttons -->
      <div class="d-flex flex-wrap gap-2">
        <!-- Primary Actions -->
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!localQuery.trim()"
          @click="$emit('search')"
        >
          <v-icon start>mdi-magnify</v-icon>
          Search
        </v-btn>

        <v-btn
          variant="outlined"
          @click="$emit('clear')"
        >
          <v-icon start>mdi-close</v-icon>
          Clear
        </v-btn>

        <!-- Advanced Actions -->
        <v-btn
          variant="outlined"
          @click="$emit('showQueryBuilder')"
        >
          <v-icon start>mdi-cog</v-icon>
          Query Builder
        </v-btn>

        <v-btn
          variant="outlined"
          @click="$emit('showTemplates')"
        >
          <v-icon start>mdi-clipboard-text</v-icon>
          Templates
        </v-btn>

        <v-btn
          variant="outlined"
          @click="$emit('showSavedSearches')"
        >
          <v-icon start>mdi-content-save</v-icon>
          Saved Searches
        </v-btn>

        <!-- Feature Toggles -->
        <v-divider vertical class="mx-2" />

        <v-btn
          :color="realtimeEnabled ? 'success' : 'grey'"
          :variant="realtimeEnabled ? 'flat' : 'outlined'"
          @click="$emit('toggleRealtime')"
        >
          <v-icon start>mdi-lightning-bolt</v-icon>
          Real-time {{ realtimeEnabled ? 'ON' : 'OFF' }}
        </v-btn>

        <v-btn
          :color="collaborativeMode ? 'info' : 'grey'"
          :variant="collaborativeMode ? 'flat' : 'outlined'"
          @click="$emit('toggleCollaborative')"
        >
          <v-icon start>mdi-account-group</v-icon>
          Collaborative {{ collaborativeMode ? 'ON' : 'OFF' }}
        </v-btn>
      </div>

      <!-- Real-time Indicator -->
      <v-alert
        v-if="realtimeEnabled"
        type="info"
        variant="tonal"
        density="compact"
        class="mt-4"
      >
        <v-icon start>mdi-lightning-bolt</v-icon>
        Real-time search enabled - results will update as you type
      </v-alert>

      <!-- Collaborative Indicator -->
      <v-alert
        v-if="collaborativeMode"
        type="info"
        variant="tonal"
        density="compact"
        class="mt-4"
      >
        <v-icon start>mdi-account-group</v-icon>
        Collaborative mode enabled - your searches will be shared with other users
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SearchSuggestions from './SearchSuggestions.vue'

interface SearchOptions {
  limit: number
  sortBy: string
  minScore: number
  searchMode: string
}

interface Props {
  query: string
  options: SearchOptions
  loading: boolean
  realtimeEnabled: boolean
  collaborativeMode: boolean
  selectedCollections?: Set<string>
  searchHistory?: any[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:query': [value: string]
  'update:options': [value: SearchOptions]
  search: []
  clear: []
  toggleRealtime: []
  toggleCollaborative: []
  showQueryBuilder: []
  showTemplates: []
  showSavedSearches: []
}>()

function handleSuggestedSearch(query: string) {
  emit('update:query', query)
  emit('search')
}

const localQuery = computed({
  get: () => props.query,
  set: (value) => emit('update:query', value)
})

const localOptions = computed({
  get: () => props.options,
  set: (value) => emit('update:options', value)
})

const limitOptions = [
  { title: '5 results', value: 5 },
  { title: '10 results', value: 10 },
  { title: '20 results', value: 20 },
  { title: '50 results', value: 50 },
  { title: '100 results', value: 100 }
]

const sortOptions = [
  { title: 'Relevance Score', value: 'score' },
  { title: 'Created Date', value: 'created_at' },
  { title: 'Updated Date', value: 'updated_at' }
]

const searchModeOptions = [
  { title: 'Semantic Search', value: 'semantic' },
  { title: 'Hybrid (Semantic + Text)', value: 'hybrid' },
  { title: 'Exact Match', value: 'exact' }
]
</script>