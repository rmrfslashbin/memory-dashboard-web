<template>
  <v-dialog v-model="localVisible" max-width="600px">
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Saved Searches</span>
        <v-btn icon="mdi-close" variant="text" @click="localVisible = false" />
      </v-card-title>

      <v-card-text>
        <div v-if="searches.length === 0" class="text-center py-8">
          <v-icon size="64" color="grey-lighten-1">mdi-content-save</v-icon>
          <h3 class="mt-4 mb-2">No Saved Searches</h3>
          <p class="text-medium-emphasis">Save searches to quickly access them later</p>
        </div>

        <v-list v-else>
          <v-list-item
            v-for="search in searches"
            :key="search.id"
          >
            <v-list-item-title>{{ search.name }}</v-list-item-title>
            <v-list-item-subtitle>
              "{{ search.query }}" • {{ formatDate(search.timestamp) }}
            </v-list-item-subtitle>

            <template v-slot:append>
              <div class="d-flex gap-1">
                <v-btn
                  icon="mdi-play"
                  variant="text"
                  size="small"
                  @click="$emit('runSearch', search)"
                />
                <v-btn
                  icon="mdi-delete"
                  variant="text"
                  size="small"
                  @click="$emit('deleteSearch', search.id)"
                />
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-card-actions>
        <v-btn
          color="primary"
          variant="outlined"
          @click="$emit('saveCurrentSearch')"
        >
          Save Current Search
        </v-btn>
        <v-spacer />
        <v-btn color="primary" @click="localVisible = false">
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface SavedSearch {
  id: string
  name: string
  query: string
  collections: string[]
  options: Record<string, any>
  timestamp: Date
}

interface Props {
  modelValue: boolean
  searches: SavedSearch[]
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

function formatDate(date: Date): string {
  return date.toLocaleDateString()
}
</script>