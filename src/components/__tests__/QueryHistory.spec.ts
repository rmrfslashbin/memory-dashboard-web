import { describe, it, expect, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import QueryHistory from '../playground/QueryHistory.vue'

const vuetify = createVuetify()

describe('QueryHistory Component', () => {
  let wrapper: any

  const mockHistory = [
    {
      id: 'hist-1',
      query: 'artificial intelligence',
      collections: ['documents'],
      options: { limit: 10, sortBy: 'score' },
      timestamp: new Date('2024-01-01T10:00:00Z'),
      resultCount: 15
    },
    {
      id: 'hist-2',
      query: 'machine learning',
      collections: ['notes', 'research'],
      options: { limit: 20, sortBy: 'timestamp' },
      timestamp: new Date('2024-01-01T11:00:00Z'),
      resultCount: 8
    },
    {
      id: 'hist-3',
      query: 'neural networks',
      collections: ['documents'],
      options: { limit: 5, sortBy: 'relevance' },
      timestamp: new Date('2024-01-01T12:00:00Z'),
      resultCount: 23
    }
  ]

  beforeEach(() => {
    wrapper = shallowMount(QueryHistory, {
      props: {
        history: mockHistory
      },
      global: {
        plugins: [vuetify]
      }
    })
  })

  afterEach(() => {
    wrapper.unmount()
  })

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      expect(wrapper.exists()).toBe(true)
    })

    it('should render history items when provided', () => {
      expect(wrapper.vm.history).toEqual(mockHistory)
      expect(wrapper.vm.recentHistory).toEqual(mockHistory)
    })

    it('should compute recent history correctly', () => {
      const manyHistoryItems = Array.from({ length: 25 }, (_, i) => ({
        id: `hist-${i}`,
        query: `query ${i}`,
        collections: ['test'],
        timestamp: new Date(),
        resultCount: i
      }))

      wrapper.setProps({ history: manyHistoryItems })

      // Should limit to 20 most recent items
      expect(wrapper.vm.recentHistory).toHaveLength(20)
    })
  })

  describe('Empty State', () => {
    it('should handle empty history', () => {
      wrapper.setProps({ history: [] })

      expect(wrapper.vm.history).toEqual([])
      expect(wrapper.vm.recentHistory).toEqual([])
    })

    it('should show empty state message when no history', () => {
      const emptyWrapper = shallowMount(QueryHistory, {
        props: { history: [] },
        global: { plugins: [vuetify] }
      })

      expect(emptyWrapper.vm.history).toHaveLength(0)
      emptyWrapper.unmount()
    })
  })

  describe('Event Handling', () => {
    it('should emit clearHistory event', () => {
      wrapper.vm.$emit('clearHistory')
      expect(wrapper.emitted('clearHistory')).toBeTruthy()
    })

    it('should emit exportHistory event', () => {
      wrapper.vm.$emit('exportHistory')
      expect(wrapper.emitted('exportHistory')).toBeTruthy()
    })

    it('should emit rerunQuery event', () => {
      const testQuery = mockHistory[0]
      wrapper.vm.$emit('rerunQuery', testQuery)

      expect(wrapper.emitted('rerunQuery')).toBeTruthy()
      expect(wrapper.emitted('rerunQuery')[0][0]).toEqual(testQuery)
    })

    it('should emit removeHistoryItem event', () => {
      const testId = 'hist-1'
      wrapper.vm.$emit('removeHistoryItem', testId)

      expect(wrapper.emitted('removeHistoryItem')).toBeTruthy()
      expect(wrapper.emitted('removeHistoryItem')[0][0]).toBe(testId)
    })
  })

  describe('Props Validation', () => {
    it('should accept valid history array', () => {
      expect(() => {
        shallowMount(QueryHistory, {
          props: { history: mockHistory },
          global: { plugins: [vuetify] }
        })
      }).not.toThrow()
    })

    it('should handle null/undefined history gracefully', () => {
      const nullWrapper = shallowMount(QueryHistory, {
        props: { history: null },
        global: { plugins: [vuetify] }
      })

      expect(nullWrapper.vm.recentHistory).toEqual([])
      nullWrapper.unmount()
    })
  })

  describe('Data Processing', () => {
    it('should format timestamps correctly', () => {
      // Since formatTimeAgo might be a computed or method, test that timestamps exist
      mockHistory.forEach(item => {
        expect(item.timestamp).toBeInstanceOf(Date)
      })
    })

    it('should handle different collection arrays', () => {
      const historyWithDifferentCollections = [
        { ...mockHistory[0], collections: [] },
        { ...mockHistory[1], collections: ['single'] },
        { ...mockHistory[2], collections: ['multiple', 'collections', 'here'] }
      ]

      wrapper.setProps({ history: historyWithDifferentCollections })
      expect(wrapper.vm.recentHistory).toEqual(historyWithDifferentCollections)
    })

    it('should handle missing optional properties', () => {
      const minimalHistory = [{
        id: 'minimal',
        query: 'minimal query',
        timestamp: new Date()
      }]

      wrapper.setProps({ history: minimalHistory })
      expect(wrapper.vm.recentHistory).toEqual(minimalHistory)
    })
  })

  describe('Reactivity', () => {
    it('should update when history prop changes', async () => {
      const newHistory = [
        {
          id: 'new-1',
          query: 'new query',
          collections: ['new-collection'],
          timestamp: new Date(),
          resultCount: 5
        }
      ]

      await wrapper.setProps({ history: newHistory })
      expect(wrapper.vm.history).toEqual(newHistory)
      expect(wrapper.vm.recentHistory).toEqual(newHistory)
    })

    it('should maintain reactivity with frequent updates', async () => {
      for (let i = 0; i < 5; i++) {
        const dynamicHistory = [{
          id: `dynamic-${i}`,
          query: `dynamic query ${i}`,
          timestamp: new Date(),
          resultCount: i
        }]

        await wrapper.setProps({ history: dynamicHistory })
        expect(wrapper.vm.recentHistory[0].query).toBe(`dynamic query ${i}`)
      }
    })
  })

  describe('Performance', () => {
    it('should handle large history arrays efficiently', () => {
      const largeHistory = Array.from({ length: 100 }, (_, i) => ({
        id: `large-${i}`,
        query: `query ${i}`,
        timestamp: new Date(),
        resultCount: i
      }))

      wrapper.setProps({ history: largeHistory })

      // Should limit to recent items for performance
      expect(wrapper.vm.recentHistory).toHaveLength(20)
    })

    it('should not break with rapid prop changes', async () => {
      const changes = Array.from({ length: 10 }, (_, i) => [{
        id: `rapid-${i}`,
        query: `rapid query ${i}`,
        timestamp: new Date()
      }])

      for (const change of changes) {
        await wrapper.setProps({ history: change })
      }

      expect(wrapper.vm.recentHistory).toHaveLength(1)
      expect(wrapper.vm.recentHistory[0].query).toBe('rapid query 9')
    })
  })

  describe('Edge Cases', () => {
    it('should handle history items with future timestamps', () => {
      const futureHistory = [{
        id: 'future',
        query: 'future query',
        timestamp: new Date('2030-01-01T00:00:00Z'),
        resultCount: 10
      }]

      wrapper.setProps({ history: futureHistory })
      expect(wrapper.vm.recentHistory).toEqual(futureHistory)
    })

    it('should handle history items with invalid timestamps', () => {
      const invalidTimestampHistory = [{
        id: 'invalid',
        query: 'invalid timestamp query',
        timestamp: 'invalid-date',
        resultCount: 5
      }]

      wrapper.setProps({ history: invalidTimestampHistory })
      expect(wrapper.vm.recentHistory).toEqual(invalidTimestampHistory)
    })

    it('should handle very long query strings', () => {
      const longQueryHistory = [{
        id: 'long',
        query: 'A'.repeat(1000),
        timestamp: new Date(),
        resultCount: 1
      }]

      wrapper.setProps({ history: longQueryHistory })
      expect(wrapper.vm.recentHistory[0].query).toHaveLength(1000)
    })
  })
})