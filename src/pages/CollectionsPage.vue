<template>
  <v-card>
    <v-card-title class="d-flex justify-space-between align-center">
      <div>
        <v-icon class="mr-2">mdi-folder-multiple</v-icon>
        Collections
      </div>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        :loading="loading"
        @click="loadCollections"
      />
    </v-card-title>

    <v-card-text>
      <div v-if="loading" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
        <p class="mt-2">Loading collections...</p>
      </div>

      <div v-else-if="error" class="text-center py-8">
        <v-icon size="48" color="error">mdi-alert-circle</v-icon>
        <p class="mt-2 text-error">{{ error }}</p>
        <v-btn color="primary" @click="loadCollections" class="mt-4">
          Try Again
        </v-btn>
      </div>

      <div v-else-if="collections.length === 0" class="text-center py-8">
        <v-icon size="48" color="grey-lighten-1">mdi-database-off</v-icon>
        <p class="mt-2 text-medium-emphasis">No collections found</p>
      </div>

      <v-row v-else>
        <v-col
          v-for="collection in collections"
          :key="collection.name"
          cols="12"
          sm="6"
          md="4"
        >
          <v-card
            class="collection-card"
            :to="`/collections/${collection.name}`"
            hover
          >
            <v-card-title class="text-h6">
              <v-icon class="mr-2">mdi-folder</v-icon>
              {{ collection.name }}
            </v-card-title>
            <v-card-text>
              <p v-if="collection.description" class="text-body-2 mb-2">
                {{ collection.description }}
              </p>
              <div class="d-flex gap-2 flex-wrap">
                <v-chip size="small" variant="flat" color="primary">
                  <v-icon start size="small">mdi-database</v-icon>
                  {{ formatMemoryCount(collection.memory_count) }}
                </v-chip>
                <v-chip
                  v-if="collection.status"
                  size="small"
                  variant="flat"
                  :color="getStatusColor(collection.status)"
                >
                  <v-icon start size="small">mdi-circle</v-icon>
                  {{ collection.status }}
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { memoryAPI } from '@/utils/memory-api'

const collections = ref<any[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

async function loadCollections() {
  loading.value = true
  error.value = null

  try {
    const response = await memoryAPI.getCollectionDetails()

    if (response.success) {
      // API returns { collections: [...] }
      collections.value = response.data?.collections || response.data || []
    } else {
      error.value = response.error?.message || 'Failed to load collections'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load collections'
  } finally {
    loading.value = false
  }
}

function formatMemoryCount(count: number | string | undefined): string {
  if (count === undefined || count === null) return '0 memories'
  if (typeof count === 'string') return count
  if (count === 1) return '1 memory'
  return `${count} memories`
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
    case 'ready':
      return 'success'
    case 'indexing':
      return 'warning'
    case 'error':
      return 'error'
    default:
      return 'grey'
  }
}

onMounted(() => {
  loadCollections()
})
</script>

<style scoped>
.collection-card {
  height: 100%;
  transition: transform 0.2s;
}

.collection-card:hover {
  transform: translateY(-4px);
}
</style>