import { describe, expect, it } from 'vitest'
import { normalizeSearchQuery, pageCountFor, rowsOnPage } from './programSearch'

describe('normalizeSearchQuery', () => {
  it('ignores case and extra whitespace', () => {
    expect(normalizeSearchQuery('  Push   Pull LEGS ')).toBe('push pull legs')
  })

  it('treats a blank query as no search', () => {
    expect(normalizeSearchQuery('   ')).toBe('')
  })
})

describe('pageCountFor', () => {
  it('rounds a partial last page up', () => {
    expect(pageCountFor(11, 5)).toBe(3)
    expect(pageCountFor(10, 5)).toBe(2)
    expect(pageCountFor(0, 5)).toBe(0)
  })
})

describe('rowsOnPage', () => {
  it('fills every page but the last', () => {
    expect(rowsOnPage(0, 11, 5)).toBe(5)
    expect(rowsOnPage(2, 11, 5)).toBe(1)
  })

  it('is empty past the last page', () => {
    expect(rowsOnPage(3, 11, 5)).toBe(0)
  })
})
