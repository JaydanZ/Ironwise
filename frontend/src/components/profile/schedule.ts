export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
]

const normalize = (value: string): string => value.trim().toLowerCase()

export const getDayIndex = (day: string): number | null => {
  const normalized = normalize(day)
  if (!normalized) return null
  for (let i = 0; i < 7; i++) {
    const name = normalize(DAY_NAMES[i])
    if (normalized.startsWith(name) || name.startsWith(normalized)) {
      return i
    }
  }
  return null
}
