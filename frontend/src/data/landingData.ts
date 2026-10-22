import { Workout } from '@/types/programCreation'

export const SAMPLE_PROFILE = [
  { question: 'Fitness goal', answer: 'Gain muscle' },
  { question: 'Experience', answer: '2 - 3 years' },
  { question: 'Days per week', answer: '4 days' },
  { question: 'About you', answer: '27 years, 175 lbs, male' }
]

export const SAMPLE_WEEK: Workout[] = [
  {
    day: 'Monday',
    focus: 'Upper body',
    exercises: [
      {
        name: 'Barbell Bench Press',
        sets: 4,
        reps: 6,
        exercise_tip:
          'Pin your shoulder blades back and keep your feet planted so the bar path stays over your mid chest.'
      },
      {
        name: 'Bent-Over Row',
        sets: 4,
        reps: 8,
        exercise_tip:
          'Hinge until your torso is near 45 degrees and pull the bar to your lower ribs, not your chest.'
      },
      {
        name: 'Seated Dumbbell Press',
        sets: 3,
        reps: 10,
        exercise_tip:
          'Stop just short of locking out to keep tension on the shoulders between reps.'
      },
      {
        name: 'Lat Pulldown',
        sets: 3,
        reps: 10,
        exercise_tip:
          'Lead with your elbows and pause briefly with the bar at your collarbone.'
      },
      {
        name: 'Triceps Pushdown',
        sets: 3,
        reps: 12,
        exercise_tip:
          'Keep your elbows glued to your sides so the triceps do all the work.'
      }
    ]
  },
  {
    day: 'Tuesday',
    focus: 'Lower body',
    exercises: [
      {
        name: 'Back Squat',
        sets: 4,
        reps: 6,
        exercise_tip:
          'Brace before you descend and push your knees out in line with your toes.'
      },
      {
        name: 'Romanian Deadlift',
        sets: 3,
        reps: 8,
        exercise_tip:
          'Push your hips back with soft knees until you feel a stretch in the hamstrings.'
      },
      {
        name: 'Walking Lunge',
        sets: 3,
        reps: 10,
        exercise_tip:
          'Take a long enough step that your front shin stays close to vertical.'
      },
      {
        name: 'Lying Leg Curl',
        sets: 3,
        reps: 12,
        exercise_tip: 'Lower the weight over three seconds on every rep.'
      },
      {
        name: 'Standing Calf Raise',
        sets: 4,
        reps: 12,
        exercise_tip: 'Hold the top position for a full second before lowering.'
      }
    ]
  },
  {
    day: 'Thursday',
    focus: 'Upper body',
    exercises: [
      {
        name: 'Incline Dumbbell Press',
        sets: 4,
        reps: 8,
        exercise_tip:
          'Set the bench to around 30 degrees to bias the upper chest without loading the shoulders.'
      },
      {
        name: 'Pull-Up',
        sets: 4,
        reps: 6,
        exercise_tip:
          'Start each rep from a dead hang and drive your elbows toward your hips.'
      },
      {
        name: 'Cable Lateral Raise',
        sets: 3,
        reps: 15,
        exercise_tip:
          'Raise to shoulder height only and keep a slight bend in the elbow.'
      },
      {
        name: 'Chest-Supported Row',
        sets: 3,
        reps: 10,
        exercise_tip:
          'Keep your chest on the pad so momentum cannot help the lift.'
      },
      {
        name: 'Dumbbell Curl',
        sets: 3,
        reps: 12,
        exercise_tip:
          'Supinate your wrist as you curl for a stronger contraction.'
      }
    ]
  },
  {
    day: 'Friday',
    focus: 'Lower body',
    exercises: [
      {
        name: 'Deadlift',
        sets: 3,
        reps: 5,
        exercise_tip:
          'Pull the slack out of the bar before it leaves the floor and keep it against your legs.'
      },
      {
        name: 'Leg Press',
        sets: 3,
        reps: 10,
        exercise_tip:
          'Lower until your hips are about to tuck, then press through your whole foot.'
      },
      {
        name: 'Bulgarian Split Squat',
        sets: 3,
        reps: 8,
        exercise_tip:
          'Keep most of your weight on the front foot; the back leg is only for balance.'
      },
      {
        name: 'Hip Thrust',
        sets: 3,
        reps: 10,
        exercise_tip:
          'Tuck your chin and finish each rep by squeezing the glutes, not arching the back.'
      },
      {
        name: 'Hanging Knee Raise',
        sets: 3,
        reps: 12,
        exercise_tip:
          'Curl your pelvis up at the top instead of just lifting the knees.'
      }
    ]
  }
]

// Everything below is sample data for the landing page previews, not a real account
export const PREVIEW_ACCOUNT = {
  username: 'sam',
  email: 'sam@example.com',
  programName: 'Hypertrophy 4-day',
  streak: 9,
  workoutsLogged: 61
}

export const PREVIEW_PROGRAMS = [
  { name: 'Hypertrophy 4-day', days: 4, isActive: true },
  { name: 'Strength block', days: 3, isActive: false },
  { name: 'Summer full body', days: 5, isActive: false }
]

export const PREVIEW_HISTORY = [
  { month: 'Oct', day: 20, focus: 'Lower body', weekday: 'Tuesday', sets: 16 },
  { month: 'Oct', day: 19, focus: 'Upper body', weekday: 'Monday', sets: 17 },
  { month: 'Oct', day: 16, focus: 'Lower body', weekday: 'Friday', sets: 15 }
]

export type PreviewDayStatus = 'done' | 'today' | 'planned' | 'rest'

export const PREVIEW_WEEK: {
  shortName: string
  dayOfMonth: number
  status: PreviewDayStatus
}[] = [
  { shortName: 'Mon', dayOfMonth: 19, status: 'done' },
  { shortName: 'Tue', dayOfMonth: 20, status: 'done' },
  { shortName: 'Wed', dayOfMonth: 21, status: 'rest' },
  { shortName: 'Thu', dayOfMonth: 22, status: 'today' },
  { shortName: 'Fri', dayOfMonth: 23, status: 'planned' },
  { shortName: 'Sat', dayOfMonth: 24, status: 'rest' },
  { shortName: 'Sun', dayOfMonth: 25, status: 'rest' }
]

export const PREVIEW_PREVIOUS_SETS = [
  { reps: 6, weight: 80 },
  { reps: 6, weight: 80 },
  { reps: 5, weight: 80 },
  { reps: 5, weight: 77.5 }
]

export const PREVIEW_TRENDS: {
  exercise: string
  points: { date: string; e1rm: number }[]
}[] = [
  {
    exercise: 'Back Squat',
    points: [
      { date: 'Jul 7', e1rm: 112 },
      { date: 'Jul 21', e1rm: 115 },
      { date: 'Aug 4', e1rm: 114 },
      { date: 'Aug 18', e1rm: 119 },
      { date: 'Sep 1', e1rm: 122 },
      { date: 'Sep 15', e1rm: 121 },
      { date: 'Sep 29', e1rm: 126 },
      { date: 'Oct 13', e1rm: 128 }
    ]
  },
  {
    exercise: 'Bench Press',
    points: [
      { date: 'Jul 6', e1rm: 88 },
      { date: 'Jul 20', e1rm: 90 },
      { date: 'Aug 3', e1rm: 91 },
      { date: 'Aug 17', e1rm: 91 },
      { date: 'Aug 31', e1rm: 94 },
      { date: 'Sep 14', e1rm: 95 },
      { date: 'Sep 28', e1rm: 94 },
      { date: 'Oct 12', e1rm: 96 }
    ]
  },
  {
    exercise: 'Deadlift',
    points: [
      { date: 'Jul 10', e1rm: 140 },
      { date: 'Jul 24', e1rm: 142 },
      { date: 'Aug 7', e1rm: 147 },
      { date: 'Aug 21', e1rm: 146 },
      { date: 'Sep 4', e1rm: 151 },
      { date: 'Sep 18', e1rm: 155 },
      { date: 'Oct 2', e1rm: 154 },
      { date: 'Oct 16', e1rm: 160 }
    ]
  }
]

export const PREVIEW_RECORDS = [
  { exercise: 'Deadlift', set: '137.5 kg × 5', e1rm: 160, gain: 6, when: 'Oct 16' },
  { exercise: 'Back Squat', set: '110 kg × 5', e1rm: 128, gain: 2, when: 'Oct 13' },
  { exercise: 'Bench Press', set: '85 kg × 4', e1rm: 96, gain: 2, when: 'Oct 12' }
]
