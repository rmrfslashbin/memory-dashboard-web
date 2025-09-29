<template>
  <v-card class="mb-6">
    <v-card-title class="d-flex justify-space-between align-center">
      <span>Collections</span>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        size="small"
        :loading="loading"
        @click="$emit('refresh')"
      />
    </v-card-title>

    <v-card-text>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Select collections to search within, or leave unselected to search across all collections.
      </p>

      <div v-if="loading" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
        <p class="mt-2">Loading collections...</p>
      </div>

      <div v-else-if="collections.length === 0" class="text-center py-8">
        <v-icon size="48" color="grey-lighten-1">mdi-database-off</v-icon>
        <p class="mt-2 text-medium-emphasis">No collections found</p>
      </div>

      <div v-else>
        <!-- Selection Actions -->
        <div class="mb-4">
          <v-btn
            variant="outlined"
            size="small"
            @click="selectAll"
            class="mr-2"
          >
            Select All
          </v-btn>
          <v-btn
            variant="outlined"
            size="small"
            @click="selectNone"
          >
            Clear Selection
          </v-btn>
          <v-chip
            v-if="selectedCollections.size > 0"
            color="primary"
            variant="flat"
            size="small"
            class="ml-2"
          >
            {{ selectedCollections.size }} selected
          </v-chip>
        </div>

        <!-- Collections Grid -->
        <v-row>
          <v-col
            v-for="collection in collections"
            :key="collection.name"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <v-card
              :class="[
                'collection-card',
                { 'selected': selectedCollections.has(collection.name) }
              ]"
              variant="outlined"
              @click="toggleCollection(collection.name)"
              style="cursor: pointer;"
            >
              <v-card-text class="pa-3">
                <div class="d-flex justify-space-between align-start mb-2">
                  <div class="flex-grow-1">
                    <h4 class="text-subtitle-2 font-weight-bold">
                      {{ collection.name }}
                    </h4>
                  </div>
                  <v-checkbox
                    :model-value="selectedCollections.has(collection.name)"
                    density="compact"
                    hide-details
                    color="primary"
                    @click.stop
                    @change="toggleCollection(collection.name)"
                  />
                </div>

                <!-- Collection Stats -->
                <div class="d-flex flex-wrap gap-1 mb-2">
                  <v-chip
                    size="x-small"
                    variant="flat"
                    color="blue-grey-lighten-4"
                  >
                    <v-icon start size="x-small">mdi-database</v-icon>
                    {{ formatCount(collection.vectorCount) }}
                  </v-chip>

                  <v-chip
                    v-if="collection.indexedVectorCount"
                    size="x-small"
                    variant="flat"
                    color="green-lighten-4"
                  >
                    <v-icon start size="x-small">mdi-check-circle</v-icon>
                    {{ formatCount(collection.indexedVectorCount) }}
                  </v-chip>
                </div>

                <!-- Collection Description -->
                <p v-if="collection.description" class="text-caption text-medium-emphasis">
                  {{ collection.description }}
                </p>

                <!-- Collection Status -->
                <div class="mt-2">
                  <v-chip
                    :color="getStatusColor(collection.status)"
                    size="x-small"
                    variant="flat"
                  >
                    {{ collection.status }}
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Collection {
  name: string
  vectorCount: number
  indexedVectorCount?: number
  status: string
  description?: string
}

interface Props {
  collections: Collection[]
  selectedCollections: Set<string>
  loading: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:selectedCollections': [value: Set<string>]
  refresh: []
}>()

function toggleCollection(collectionName: string) {
  const newSelection = new Set(props.selectedCollections)

  if (newSelection.has(collectionName)) {
    newSelection.delete(collectionName)
  } else {
    newSelection.add(collectionName)
  }

  emit('update:selectedCollections', newSelection)
}

function selectAll() {
  const allCollections = new Set(props.collections.map(c => c.name))
  emit('update:selectedCollections', allCollections)
}

function selectNone() {
  emit('update:selectedCollections', new Set())
}

function formatCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'green':
    case 'ready':
      return 'success'
    case 'yellow':
    case 'indexing':
      return 'warning'
    case 'red':
    case 'error':
      return 'error'
    default:
      return 'grey'
  }
}
</script>

<style scoped>
.collection-card {
  transition: all 0.2s ease;
}

.collection-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.collection-card.selected {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.05);
}
</style>