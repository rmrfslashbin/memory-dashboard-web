import { ref } from 'vue'

interface SearchTemplate {
  id: string
  name: string
  description: string
  query: string
  collections: string[]
  options: Record<string, any>
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

const TEMPLATES_STORAGE_KEY = 'memory-search-templates'
const SAVED_SEARCHES_STORAGE_KEY = 'memory-saved-searches'

export function useSearchTemplates() {
  const searchTemplates = ref<SearchTemplate[]>([])
  const savedSearches = ref<SavedSearch[]>([])

  // Default templates
  const defaultTemplates: SearchTemplate[] = [
    {
      id: 'recent_entries',
      name: 'Recent Entries',
      description: 'Find recently created memories',
      query: '',
      collections: [],
      options: {
        limit: 20,
        sortBy: 'created_at',
        minScore: 0,
        searchMode: 'semantic'
      },
      category: 'General',
      tags: ['recent', 'time'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'high_relevance',
      name: 'High Relevance',
      description: 'Search for highly relevant results only',
      query: 'your search here',
      collections: [],
      options: {
        limit: 10,
        sortBy: 'score',
        minScore: 0.8,
        searchMode: 'semantic'
      },
      category: 'Quality',
      tags: ['relevance', 'quality'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'broad_search',
      name: 'Broad Search',
      description: 'Cast a wide net with lower score threshold',
      query: 'your search here',
      collections: [],
      options: {
        limit: 50,
        sortBy: 'score',
        minScore: 0.3,
        searchMode: 'semantic'
      },
      category: 'Discovery',
      tags: ['broad', 'discovery'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'exact_match',
      name: 'Exact Match',
      description: 'Search for exact text matches',
      query: 'your search here',
      collections: [],
      options: {
        limit: 20,
        sortBy: 'score',
        minScore: 0,
        searchMode: 'exact'
      },
      category: 'Precision',
      tags: ['exact', 'precise'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'hybrid_search',
      name: 'Hybrid Search',
      description: 'Combine semantic and text search',
      query: 'your search here',
      collections: [],
      options: {
        limit: 20,
        sortBy: 'score',
        minScore: 0.4,
        searchMode: 'hybrid'
      },
      category: 'Advanced',
      tags: ['hybrid', 'semantic', 'text'],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]

  // Load templates from localStorage
  function loadTemplates() {
    try {
      const stored = localStorage.getItem(TEMPLATES_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const customTemplates = parsed.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        }))
        searchTemplates.value = [...defaultTemplates, ...customTemplates]
      } else {
        searchTemplates.value = [...defaultTemplates]
      }
    } catch (error) {
      console.error('Failed to load search templates:', error)
      searchTemplates.value = [...defaultTemplates]
    }
  }

  // Save custom templates to localStorage
  function saveTemplates() {
    try {
      // Only save custom templates (not defaults)
      const customTemplates = searchTemplates.value.filter(template =>
        !defaultTemplates.some(defaultTemplate => defaultTemplate.id === template.id)
      )
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(customTemplates))
    } catch (error) {
      console.error('Failed to save search templates:', error)
    }
  }

  // Load saved searches from localStorage
  function loadSavedSearches() {
    try {
      const stored = localStorage.getItem(SAVED_SEARCHES_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        savedSearches.value = parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }))
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error)
      savedSearches.value = []
    }
  }

  // Save searches to localStorage
  function saveSavedSearches() {
    try {
      localStorage.setItem(SAVED_SEARCHES_STORAGE_KEY, JSON.stringify(savedSearches.value))
    } catch (error) {
      console.error('Failed to save searches:', error)
    }
  }

  // Add or update template
  function saveTemplate(template: Omit<SearchTemplate, 'id' | 'createdAt' | 'updatedAt'>) {
    const newTemplate: SearchTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    searchTemplates.value.push(newTemplate)
    saveTemplates()
    return newTemplate
  }

  // Update existing template
  function updateTemplate(id: string, updates: Partial<SearchTemplate>) {
    const index = searchTemplates.value.findIndex(template => template.id === id)
    if (index !== -1) {
      searchTemplates.value[index] = {
        ...searchTemplates.value[index],
        ...updates,
        updatedAt: new Date()
      }
      saveTemplates()
    }
  }

  // Delete template
  function deleteTemplate(id: string) {
    // Don't delete default templates
    if (defaultTemplates.some(template => template.id === id)) {
      return false
    }

    searchTemplates.value = searchTemplates.value.filter(template => template.id !== id)
    saveTemplates()
    return true
  }

  // Save search
  function saveSearch(search: Omit<SavedSearch, 'id'>) {
    const savedSearch: SavedSearch = {
      ...search,
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Remove existing search with same name
    savedSearches.value = savedSearches.value.filter(existing => existing.name !== search.name)

    savedSearches.value.unshift(savedSearch)
    saveSavedSearches()
    return savedSearch
  }

  // Delete saved search
  function deleteSavedSearch(id: string) {
    savedSearches.value = savedSearches.value.filter(search => search.id !== id)
    saveSavedSearches()
  }

  // Get templates by category
  function getTemplatesByCategory(category: string) {
    return searchTemplates.value.filter(template => template.category === category)
  }

  // Get templates by tags
  function getTemplatesByTag(tag: string) {
    return searchTemplates.value.filter(template => template.tags.includes(tag))
  }

  // Initialize
  loadTemplates()
  loadSavedSearches()

  return {
    searchTemplates,
    savedSearches,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    saveSearch,
    deleteSavedSearch,
    getTemplatesByCategory,
    getTemplatesByTag
  }
}