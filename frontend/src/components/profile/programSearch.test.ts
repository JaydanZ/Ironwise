import { describe, expect, it } from 'vitest'
import { WorkoutProgram } from '@/types/programCreation'
import {
  buildSearchIndex,
  normalizeSearchText,
  paginate,
  searchPrograms
} from './programSearch'

const program = (id: string, program_name: string) =>
  ({ id, program_name }) as WorkoutProgram
const ids = (programs: WorkoutProgram[]) => programs.map(({ id }) => id)

describe('normalizeSearchText', () => {
  it('ignores case, accents and extra whitespace', () => {
    expect(normalizeSearchText('  Push   Pull LÉGS ')).toBe('push pull legs')
  })
})

describe('searchPrograms', () => {
  const index = buildSearchIndex([
    program('a', 'Push Pull Legs'),
    program('b', 'Upper / Lower Split'),
    program('c', 'Full Body Strength'),
    program('d', 'Legs & Glutes')
  ])

  it('returns every program in order for an empty or blank query', () => {
    expect(ids(searchPrograms(index, ''))).toEqual(['a', 'b', 'c', 'd'])
    expect(ids(searchPrograms(index, '   '))).toEqual(['a', 'b', 'c', 'd'])
  })

  it('matches partial words regardless of case', () => {
    expect(ids(searchPrograms(index, 'LEG'))).toEqual(['a', 'd'])
  })

  it('requires every word to match, in any order', () => {
    expect(ids(searchPrograms(index, 'legs push'))).toEqual(['a'])
    expect(ids(searchPrograms(index, 'legs upper'))).toEqual([])
  })

  it('matches names with accents', () => {
    const accented = buildSearchIndex([program('e', 'Força Total')])
    expect(ids(searchPrograms(accented, 'forca'))).toEqual(['e'])
  })
})

describe('paginate', () => {
  it('splits items into pages of the given size', () => {
    expect(paginate([1, 2, 3, 4, 5, 6, 7], 5)).toEqual([
      [1, 2, 3, 4, 5],
      [6, 7]
    ])
  })

  it('returns no pages for no items', () => {
    expect(paginate([], 5)).toEqual([])
  })
})
