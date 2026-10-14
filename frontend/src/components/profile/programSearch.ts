import { WorkoutProgram } from '@/types/programCreation'

export const PROGRAMS_PER_PAGE = 5

export interface SearchableProgram {
  program: WorkoutProgram
  searchKey: string
}

export const normalizeSearchText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

export const buildSearchIndex = (
  programs: WorkoutProgram[]
): SearchableProgram[] =>
  programs.map((program) => ({
    program,
    searchKey: normalizeSearchText(program.program_name)
  }))

export const searchPrograms = (
  index: SearchableProgram[],
  query: string
): WorkoutProgram[] => {
  const terms = normalizeSearchText(query).split(' ').filter(Boolean)
  if (terms.length === 0) return index.map(({ program }) => program)

  return index
    .filter(({ searchKey }) => terms.every((term) => searchKey.includes(term)))
    .map(({ program }) => program)
}

export const paginate = <T>(items: T[], pageSize: number): T[][] => {
  const pages: T[][] = []
  for (let start = 0; start < items.length; start += pageSize) {
    pages.push(items.slice(start, start + pageSize))
  }
  return pages
}
