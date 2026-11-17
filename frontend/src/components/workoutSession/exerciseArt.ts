import catalogue from '@/data/exerciseCatalogue.json'

const TOKEN_SYNONYMS = new Map([
  ['db', 'dumbbell'],
  ['bb', 'barbell'],
  ['flye', 'fly'],
  ['pushup', 'push up'],
  ['pullup', 'pull up'],
  ['chinup', 'chin up']
])

const singular = (token: string) => {
  if (/(ss|ch|sh|x)es$/.test(token)) return token.slice(0, -2)
  if (/[^aeiou]ies$/.test(token)) return token.slice(0, -3) + 'y'
  if (token.length > 2 && token.endsWith('s') && !/(ss|us)$/.test(token)) {
    return token.slice(0, -1)
  }
  return token
}

export const normaliseExerciseName = (name: string) =>
  name
    .toLowerCase()
    .replace(/'/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((token) => {
      const word = singular(token)
      return TOKEN_SYNONYMS.get(word) ?? word
    })
    .join(' ')

// Reviewed by hand: closest-name matching picks wrong drawings for names like these
export const REVIEWED_NAMES = [
  ['Barbell Bench Press', 'bench-press'],
  ['Dumbbell Lateral Raise', 'lateral-raise'],
  ['Bent-Over Barbell Row', 'barbell-row'],
  ['Barbell Bent-Over Rows', 'barbell-row'],
  ['Dumbbell Curl', 'bicep-curl'],
  ['Dumbbell Bicep Curl', 'bicep-curl'],
  ['Leg Curl', 'lying-leg-curl'],
  ['Hamstring Curl', 'lying-leg-curl'],
  ['Machine Preacher Curl', 'preacher-curl'],
  ['Single Arm Close Grip Row', 'single-arm-cable-row'],
  ['Tricep Pressdown', 'triceps-pushdown'],
  ['Cable Tricep Pushdown', 'triceps-pushdown'],
  ['Triceps Rope Pushdown', 'rope-triceps-pushdown'],
  ['Abductors', 'hip-abduction'],
  ['Adductors', 'hip-adduction'],
  ['Cable Face Pull', 'face-pull'],
  ['Calf Raises (Standing)', 'standing-calf-raise'],
  ['Machine Calf Raise', 'calf-raise'],
  ['DB RDL', 'dumbbell-romanian-deadlift'],
  ['Dumbbell Flat Bench Press', 'dumbbell-bench-press'],
  ['Dumbbell Hammer Curl', 'hammer-curl'],
  ['Dumbbell Walking Lunge', 'walking-lunge'],
  ['Incline Barbell Press', 'incline-bench-press'],
  ['Overhead Barbell Press', 'overhead-press'],
  ['Seated Dumbbell Shoulder Press', 'dumbbell-shoulder-press'],
  ['Seated Row', 'seated-cable-row'],
  ['Shrugs', 'barbell-shrug']
] as const

const artIds = new Map<string, string>()
for (const { id, name, aliases } of catalogue) {
  for (const label of [name, ...aliases]) {
    const key = normaliseExerciseName(label)
    if (!artIds.has(key)) artIds.set(key, id)
  }
}
for (const [name, id] of REVIEWED_NAMES) {
  artIds.set(normaliseExerciseName(name), id)
}

export const exerciseArtUrl = (name: string) => {
  const artBaseUrl = import.meta.env.VITE_EXERCISE_ART_URL?.replace(/\/+$/, '')
  const id = artIds.get(normaliseExerciseName(name))
  return artBaseUrl && id ? `${artBaseUrl}/${id}.svg` : null
}
