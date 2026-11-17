// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor
} from '@testing-library/react'
import { ManualProgramCreation } from './ManualProgramCreation'
import { programImport, updateProgram } from '@/services/programsAPI'
import { WorkoutProgram } from '@/types/programCreation'
import { toast } from '@/hooks/use-toast'
import {
  MAX_EXERCISE_NAME_LENGTH,
  MAX_EXERCISES_PER_DAY,
  MAX_FOCUS_LENGTH,
  MAX_PROGRAM_NAME_LENGTH
} from '@/constants/programRules'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => vi.fn()
}))
vi.mock('react-redux', () => ({ useDispatch: () => vi.fn() }))
vi.mock('@/services/programsAPI', () => ({
  programImport: vi.fn(),
  updateProgram: vi.fn()
}))
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }))
vi.mock('@/services/protectedRoutesAPI', () => ({
  protectedApiSlice: { util: { invalidateTags: vi.fn() } }
}))

describe('ManualProgramCreation', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it.each([0, 1])('removes day %i without crashing', (removeIndex) => {
    render(<ManualProgramCreation />)

    fireEvent.click(screen.getByRole('button', { name: 'Add day' }))
    const removeButtons = screen.getAllByRole('button', {
      name: /^Remove (Mon|Tues)day$/
    })
    expect(removeButtons).toHaveLength(2)

    fireEvent.click(removeButtons[removeIndex])

    expect(
      screen.queryAllByRole('button', { name: /^Remove \w+day$/ })
    ).toHaveLength(0)
    expect(screen.getAllByRole('group', { name: /day/ })).toHaveLength(1)
  })

  it('keeps the remaining day and exercise values after removing earlier ones', () => {
    render(<ManualProgramCreation />)

    fireEvent.click(screen.getByRole('button', { name: 'Add day' }))
    const focusInputs = screen.getAllByLabelText('Focus')
    fireEvent.change(focusInputs[0], { target: { value: 'Push' } })
    fireEvent.change(focusInputs[1], { target: { value: 'Pull' } })

    // Two exercises on the remaining day, then remove the first
    fireEvent.click(screen.getAllByRole('button', { name: 'Add exercise' })[1])
    const exerciseInputs = screen.getAllByLabelText('Exercise Name')
    fireEvent.change(exerciseInputs[1], { target: { value: 'Row' } })
    fireEvent.change(exerciseInputs[2], { target: { value: 'Curl' } })

    fireEvent.click(screen.getByRole('button', { name: 'Remove Monday' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove exercise 1 from Tuesday' })
    )

    expect(screen.getByLabelText('Focus')).toHaveProperty('value', 'Pull')
    expect(screen.getByLabelText('Exercise Name')).toHaveProperty(
      'value',
      'Curl'
    )
  })

  it('shows an error toast on every invalid save while creating a program', async () => {
    render(<ManualProgramCreation />)

    fireEvent.click(screen.getByRole('button', { name: /Save program/ }))
    await waitFor(() => expect(toast).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: /Save program/ }))
    await waitFor(() => expect(toast).toHaveBeenCalledTimes(2))

    expect(toast).toHaveBeenLastCalledWith(
      expect.objectContaining({ variant: 'error', title: 'Can’t save yet' })
    )
    expect(programImport).not.toHaveBeenCalled()
  })

  it.each([
    ['Program name', MAX_PROGRAM_NAME_LENGTH, 'Name'],
    ['Focus', MAX_FOCUS_LENGTH, 'Focus'],
    ['Exercise Name', MAX_EXERCISE_NAME_LENGTH, 'Exercise name']
  ])('limits %s to %i characters', (label, maxLength, errorLabel) => {
    render(<ManualProgramCreation />)
    const input = screen.getByLabelText(label)

    fireEvent.change(input, { target: { value: 'x'.repeat(maxLength) } })
    expect(screen.queryByRole('alert')).toBeNull()

    fireEvent.change(input, { target: { value: 'x'.repeat(maxLength + 1) } })
    expect(screen.getByRole('alert').textContent).toBe(
      `${errorLabel} must be ${maxLength} characters or fewer`
    )
  })

  it(`stops adding exercises at ${MAX_EXERCISES_PER_DAY} per day`, () => {
    render(<ManualProgramCreation />)

    for (let count = 1; count < MAX_EXERCISES_PER_DAY; count++) {
      fireEvent.click(screen.getByRole('button', { name: 'Add exercise' }))
    }

    expect(screen.getAllByLabelText('Exercise Name')).toHaveLength(
      MAX_EXERCISES_PER_DAY
    )
    expect(
      screen.getByRole('button', {
        name: `${MAX_EXERCISES_PER_DAY} exercise limit reached`
      })
    ).toHaveProperty('disabled', true)
  })

  it('shows no edit marks while creating a program', () => {
    render(<ManualProgramCreation />)

    fireEvent.change(screen.getByLabelText('Focus'), {
      target: { value: 'Push' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add day' }))

    expect(screen.queryByTitle(/Edited|New/)).toBeNull()
  })

  it('moves a day to its place in the week and keeps its values', () => {
    render(<ManualProgramCreation />)

    fireEvent.click(screen.getByRole('button', { name: 'Add day' }))
    const focusInputs = screen.getAllByLabelText('Focus')
    fireEvent.change(focusInputs[0], { target: { value: 'Push' } })
    fireEvent.change(focusInputs[1], { target: { value: 'Pull' } })

    // Monday becomes Friday, so it should now render after Tuesday
    fireEvent.keyDown(
      screen.getByRole('button', { name: /^Training day: Monday/ }),
      {
        key: 'Enter'
      }
    )
    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Friday' }))

    expect(
      screen
        .getAllByRole('group', { name: /day/ })
        .map((group) => group.getAttribute('aria-label'))
    ).toEqual(['Tuesday', 'Friday'])
    expect(
      screen
        .getAllByLabelText('Focus')
        .map((input) => (input as HTMLInputElement).value)
    ).toEqual(['Pull', 'Push'])
  })

  describe('editing a saved program', () => {
    const savedProgram: WorkoutProgram = {
      id: 'program-1',
      program_name: 'Upper / Lower',
      description: null,
      created_at: '',
      updated_at: '',
      user_id: 'user-1',
      program_structure: [
        {
          day: 'Thursday',
          focus: 'Lower',
          exercises: [
            { name: 'Squat', sets: 5, reps: 5, exercise_tip: 'Brace hard' }
          ]
        },
        {
          day: 'Monday',
          focus: 'Upper',
          exercises: [{ name: 'Bench Press', sets: 3, reps: 8 }]
        }
      ]
    }

    it('fills the form with the saved program', () => {
      render(<ManualProgramCreation program={savedProgram} />)

      expect(screen.getByRole('heading', { name: 'Edit program' })).toBeTruthy()
      expect(screen.getByLabelText('Program name')).toHaveProperty(
        'value',
        'Upper / Lower'
      )
      expect(
        screen
          .getAllByRole('group', { name: /day/ })
          .map((group) => group.getAttribute('aria-label'))
      ).toEqual(['Monday', 'Thursday'])
      expect(
        screen
          .getAllByLabelText('Exercise Name')
          .map((input) => (input as HTMLInputElement).value)
      ).toEqual(['Bench Press', 'Squat'])
    })

    it('collapses a day before anything is edited', () => {
      render(<ManualProgramCreation program={savedProgram} />)

      fireEvent.click(screen.getByRole('button', { name: 'Collapse Monday' }))

      expect(
        screen
          .getByRole('button', { name: 'Expand Monday' })
          .getAttribute('aria-expanded')
      ).toBe('false')
    })

    it('marks an edited field and clears the mark when it is changed back', () => {
      render(<ManualProgramCreation program={savedProgram} />)
      const sets = screen.getAllByLabelText('Sets')[0]

      expect(screen.queryByTitle('Edited')).toBeNull()

      fireEvent.change(sets, { target: { value: '4' } })
      expect(
        document.getElementById(sets.getAttribute('aria-describedby') ?? '')
          ?.textContent
      ).toBe('Edited')

      fireEvent.change(sets, { target: { value: '3' } })
      expect(sets.getAttribute('aria-describedby')).toBeNull()
      expect(screen.queryByTitle('Edited')).toBeNull()
    })

    it('marks a new exercise once instead of each of its fields', () => {
      render(<ManualProgramCreation program={savedProgram} />)

      fireEvent.click(
        screen.getAllByRole('button', { name: 'Add exercise' })[0]
      )

      expect(screen.getAllByTitle('New exercise')).toHaveLength(1)
      expect(screen.queryByTitle('Edited')).toBeNull()
    })

    it('outlines a collapsed day in lime when it was edited, red when it also has an error', () => {
      render(<ManualProgramCreation program={savedProgram} />)
      const mondayFocus = screen.getAllByLabelText('Focus')[0]

      fireEvent.change(mondayFocus, { target: { value: 'Push' } })
      fireEvent.click(screen.getByRole('button', { name: 'Collapse Monday' }))
      const monday = screen.getByRole('group', { name: 'Monday, edited' })
      expect(monday.className).toContain('border-app-colors-300')

      fireEvent.click(screen.getByRole('button', { name: 'Expand Monday' }))
      fireEvent.change(mondayFocus, { target: { value: '' } })
      fireEvent.click(screen.getByRole('button', { name: 'Collapse Monday' }))
      const withError = screen.getByRole('group', {
        name: 'Monday, edited, has errors'
      })
      expect(withError.className).toContain('border-red-500')
      expect(withError.className).not.toContain('border-app-colors-300')
    })

    it('shows an error toast instead of saving an invalid edit', async () => {
      render(<ManualProgramCreation program={savedProgram} />)

      fireEvent.change(screen.getAllByLabelText('Focus')[0], {
        target: { value: '' }
      })
      fireEvent.click(screen.getByRole('button', { name: /Save changes/ }))

      await waitFor(() =>
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'error' })
        )
      )
      expect(updateProgram).not.toHaveBeenCalled()
    })

    it('updates the saved program and keeps exercise tips', async () => {
      render(<ManualProgramCreation program={savedProgram} />)

      fireEvent.change(screen.getByLabelText('Program name'), {
        target: { value: 'Upper / Lower v2' }
      })
      fireEvent.click(screen.getByRole('button', { name: /Save changes/ }))

      await waitFor(() => expect(updateProgram).toHaveBeenCalledTimes(1))
      expect(programImport).not.toHaveBeenCalled()
      expect(updateProgram).toHaveBeenCalledWith('program-1', {
        program_name: 'Upper / Lower v2',
        program_structure: [
          {
            day: 'Monday',
            focus: 'Upper',
            exercises: [
              { name: 'Bench Press', sets: 3, reps: 8, exercise_tip: '' }
            ]
          },
          {
            day: 'Thursday',
            focus: 'Lower',
            exercises: [
              { name: 'Squat', sets: 5, reps: 5, exercise_tip: 'Brace hard' }
            ]
          }
        ]
      })
    })
  })

  it('suggests catalogue names for an exercise', () => {
    const { container } = render(<ManualProgramCreation />)

    const listId = screen.getByLabelText('Exercise Name').getAttribute('list')
    const options = [
      ...container.querySelectorAll(`datalist[id="${listId}"] option`)
    ]

    expect(options.map((option) => option.getAttribute('value'))).toContain(
      'Bench Press'
    )
  })

  it('keeps a custom exercise name that is not suggested', () => {
    render(<ManualProgramCreation />)
    const input = screen.getByLabelText('Exercise Name')

    fireEvent.change(input, { target: { value: 'My Custom Lift' } })

    expect(input).toHaveProperty('value', 'My Custom Lift')
  })
})
