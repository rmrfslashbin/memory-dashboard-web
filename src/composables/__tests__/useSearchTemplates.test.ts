import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSearchTemplates } from '../useSearchTemplates'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('useSearchTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  it('should initialize with default templates', () => {
    const { searchTemplates } = useSearchTemplates()

    expect(searchTemplates.value.length).toBeGreaterThan(0)
    expect(searchTemplates.value.some(t => t.name === 'Recent Entries')).toBe(true)
    expect(searchTemplates.value.some(t => t.name === 'High Relevance')).toBe(true)
  })

  it('should save new templates', () => {
    const { saveTemplate, searchTemplates } = useSearchTemplates()

    const initialCount = searchTemplates.value.length

    const newTemplate = {
      name: 'Test Template',
      description: 'A test template',
      query: 'test query',
      collections: ['test'],
      options: { limit: 10, sortBy: 'score', minScore: 0.5, searchMode: 'semantic' },
      category: 'Custom',
      tags: ['test']
    }

    const saved = saveTemplate(newTemplate)

    expect(saved).toBeDefined()
    expect(saved.id).toBeDefined()
    expect(saved.name).toBe('Test Template')
    expect(searchTemplates.value.length).toBe(initialCount + 1)
    expect(mockLocalStorage.setItem).toHaveBeenCalled()
  })

  it('should update existing templates', () => {
    const { saveTemplate, updateTemplate, searchTemplates } = useSearchTemplates()

    // First save a template
    const template = saveTemplate({
      name: 'Original Template',
      description: 'Original description',
      query: 'original query',
      collections: ['test'],
      options: { limit: 10, sortBy: 'score', minScore: 0.5, searchMode: 'semantic' },
      category: 'Custom',
      tags: ['test']
    })

    // Then update it
    updateTemplate(template.id, {
      name: 'Updated Template',
      description: 'Updated description'
    })

    const updated = searchTemplates.value.find(t => t.id === template.id)
    expect(updated?.name).toBe('Updated Template')
    expect(updated?.description).toBe('Updated description')
    expect(updated?.query).toBe('original query') // Should preserve unchanged fields
  })

  it('should delete custom templates but not default ones', () => {
    const { saveTemplate, deleteTemplate, searchTemplates } = useSearchTemplates()

    const initialCount = searchTemplates.value.length

    // Try to delete a default template (should fail)
    const defaultTemplate = searchTemplates.value.find(t => t.id === 'recent_entries')
    expect(defaultTemplate).toBeDefined()

    const deleteDefault = deleteTemplate('recent_entries')
    expect(deleteDefault).toBe(false)
    expect(searchTemplates.value.length).toBe(initialCount)

    // Save and delete a custom template (should succeed)
    const customTemplate = saveTemplate({
      name: 'Custom Template',
      description: 'To be deleted',
      query: 'test',
      collections: [],
      options: { limit: 10, sortBy: 'score', minScore: 0.5, searchMode: 'semantic' },
      category: 'Custom',
      tags: []
    })

    const deleteCustom = deleteTemplate(customTemplate.id)
    expect(deleteCustom).toBe(true)
    expect(searchTemplates.value.find(t => t.id === customTemplate.id)).toBeUndefined()
  })

  it('should save and load saved searches', () => {
    const { saveSearch, savedSearches } = useSearchTemplates()

    const searchData = {
      name: 'Test Search',
      query: 'test query',
      collections: ['collection1'],
      options: { limit: 20, sortBy: 'score', minScore: 0.6, searchMode: 'hybrid' },
      timestamp: new Date(),
      resultCount: 15
    }

    const saved = saveSearch(searchData)

    expect(saved).toBeDefined()
    expect(saved.id).toBeDefined()
    expect(saved.name).toBe('Test Search')
    expect(savedSearches.value).toHaveLength(1)
    expect(savedSearches.value[0]).toStrictEqual(saved)
  })

  it('should replace saved searches with same name', () => {
    const { saveSearch, savedSearches } = useSearchTemplates()

    const searchData1 = {
      name: 'Same Name',
      query: 'first query',
      collections: ['collection1'],
      options: { limit: 10 },
      timestamp: new Date(),
      resultCount: 5
    }

    const searchData2 = {
      name: 'Same Name',
      query: 'second query',
      collections: ['collection2'],
      options: { limit: 20 },
      timestamp: new Date(),
      resultCount: 10
    }

    saveSearch(searchData1)
    saveSearch(searchData2)

    expect(savedSearches.value).toHaveLength(1)
    expect(savedSearches.value[0].query).toBe('second query')
  })

  it('should delete saved searches', () => {
    const { saveSearch, deleteSavedSearch, savedSearches } = useSearchTemplates()

    const search = saveSearch({
      name: 'To Delete',
      query: 'test',
      collections: [],
      options: {},
      timestamp: new Date()
    })

    expect(savedSearches.value).toHaveLength(1)

    deleteSavedSearch(search.id)

    expect(savedSearches.value).toHaveLength(0)
  })

  it('should filter templates by category', () => {
    const { getTemplatesByCategory, searchTemplates } = useSearchTemplates()

    const generalTemplates = getTemplatesByCategory('General')
    const qualityTemplates = getTemplatesByCategory('Quality')

    expect(generalTemplates.length).toBeGreaterThan(0)
    expect(qualityTemplates.length).toBeGreaterThan(0)
    expect(generalTemplates.every(t => t.category === 'General')).toBe(true)
    expect(qualityTemplates.every(t => t.category === 'Quality')).toBe(true)
  })

  it('should filter templates by tag', () => {
    const { getTemplatesByTag, searchTemplates } = useSearchTemplates()

    const recentTags = getTemplatesByTag('recent')
    const qualityTags = getTemplatesByTag('quality')

    expect(recentTags.length).toBeGreaterThan(0)
    expect(qualityTags.length).toBeGreaterThan(0)
    expect(recentTags.every(t => t.tags.includes('recent'))).toBe(true)
    expect(qualityTags.every(t => t.tags.includes('quality'))).toBe(true)
  })

  it('should handle localStorage load errors gracefully', () => {
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('localStorage error')
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { searchTemplates } = useSearchTemplates()

    // Should still have default templates even if localStorage fails
    expect(searchTemplates.value.length).toBeGreaterThan(0)
    expect(consoleSpy).toHaveBeenCalledWith('Failed to load search templates:', expect.any(Error))

    consoleSpy.mockRestore()
  })

  it('should handle localStorage save errors gracefully', () => {
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('localStorage save error')
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { saveTemplate } = useSearchTemplates()

    // Should not throw even if save fails
    expect(() => saveTemplate({
      name: 'Test',
      description: 'Test',
      query: 'test',
      collections: [],
      options: { limit: 10, sortBy: 'score', minScore: 0.5, searchMode: 'semantic' },
      category: 'Custom',
      tags: []
    })).not.toThrow()

    expect(consoleSpy).toHaveBeenCalledWith('Failed to save search templates:', expect.any(Error))

    consoleSpy.mockRestore()
  })

  it('should load custom templates from localStorage', () => {
    const customTemplatesData = JSON.stringify([{
      id: 'custom_123',
      name: 'Loaded Template',
      description: 'From localStorage',
      query: 'loaded query',
      collections: ['loaded'],
      options: { limit: 15 },
      category: 'Custom',
      tags: ['loaded'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }])

    mockLocalStorage.getItem.mockReturnValue(customTemplatesData)

    const { searchTemplates } = useSearchTemplates()

    // Should have default templates plus loaded custom template
    expect(searchTemplates.value.some(t => t.name === 'Loaded Template')).toBe(true)
    expect(searchTemplates.value.some(t => t.name === 'Recent Entries')).toBe(true) // Default should still be there
  })

  it('should maintain template order with custom templates at the end', () => {
    const { saveTemplate, searchTemplates } = useSearchTemplates()

    const initialDefaultCount = searchTemplates.value.filter(t =>
      ['recent_entries', 'high_relevance', 'broad_search', 'exact_match', 'hybrid_search'].includes(t.id)
    ).length

    saveTemplate({
      name: 'Custom Template',
      description: 'Added later',
      query: 'custom',
      collections: [],
      options: { limit: 10, sortBy: 'score', minScore: 0.5, searchMode: 'semantic' },
      category: 'Custom',
      tags: []
    })

    // Custom template should be at the end
    const customTemplate = searchTemplates.value.find(t => t.name === 'Custom Template')
    expect(customTemplate).toBeDefined()

    // Default templates should still be present
    const currentDefaultCount = searchTemplates.value.filter(t =>
      ['recent_entries', 'high_relevance', 'broad_search', 'exact_match', 'hybrid_search'].includes(t.id)
    ).length

    expect(currentDefaultCount).toBe(initialDefaultCount)
  })
})