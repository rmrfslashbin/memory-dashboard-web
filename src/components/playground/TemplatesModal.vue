<template>
  <v-dialog v-model="localVisible" max-width="600px">
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <span>Search Templates</span>
        <v-btn icon="mdi-close" variant="text" @click="localVisible = false" />
      </v-card-title>

      <v-card-text>
        <div v-if="templates.length === 0" class="text-center py-8">
          <v-icon size="64" color="grey-lighten-1">mdi-clipboard-text</v-icon>
          <h3 class="mt-4 mb-2">No Templates</h3>
          <p class="text-medium-emphasis">No search templates available</p>
        </div>

        <v-list v-else>
          <v-list-item
            v-for="template in templates"
            :key="template.id"
            @click="useTemplate(template)"
          >
            <v-list-item-title>{{ template.name }}</v-list-item-title>
            <v-list-item-subtitle>{{ template.description }}</v-list-item-subtitle>

            <template v-slot:append>
              <v-btn
                icon="mdi-play"
                variant="text"
                size="small"
                @click.stop="useTemplate(template)"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>

      <v-card-actions>
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

interface Template {
  id: string
  name: string
  description: string
  query: string
  collections: string[]
  options: Record<string, any>
}

interface Props {
  modelValue: boolean
  templates: Template[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  useTemplate: [template: Template]
  saveTemplate: [template: any]
  deleteTemplate: [id: string]
}>()

const localVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

function useTemplate(template: Template) {
  emit('useTemplate', template)
  localVisible.value = false
}
</script>