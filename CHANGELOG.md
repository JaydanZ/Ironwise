# Changelog

Features added to, changed in, or removed from Ironwise, newest first.

## 2026-11-02

**Changed**: Tidier last-session text in the mobile logging panel

- **What**: On phones, the set number and your last weight and reps now have their own line in the logging panel, so the reps no longer wrap onto a line by themselves.
- **What changed**: `SetLogPanel` moves that text above the unit toggle and Finish early button, which now sit at opposite ends of their row.
- **What it affects**: `/workout` under 800px. The panel is slightly taller, so the image gets slightly less room. Desktop, the API and stored workouts are unchanged.

**Changed**: "Next:" label in the mobile workout session

- **What**: On phones, the exercise name at the top right now has "Next:" above it, so it's clear that's the exercise coming up.
- **What changed**: `ExerciseSwitcher` shows the label above the name. The name still shortens with an ellipsis when it's too long.
- **What it affects**: `/workout` under 800px. Tapping and holding work as before, and desktop, the API and stored workouts are unchanged.

**Changed**: Fading edges on the mobile set list

- **What**: On phones, when the set list scrolls, its rows now fade out at the top and bottom instead of looking cut off. A fade only shows on an edge that has more rows past it.
- **What changed**: `MobileSetList` applies a CSS mask to the list and sizes each fade from its scroll position.
- **What it affects**: `/workout` under 800px. Desktop, the API and stored workouts are unchanged.

**Changed**: Sliding set selection in the mobile workout session

- **What**: On phones, the lime outline now slides smoothly from one set to the next when you finish or select a set, and the list scrolls smoothly to keep it in view.
- **What changed**: `MobileSetList` draws the outline on one shared highlight moved with a CSS `transform` transition, instead of on each row.
- **What it affects**: `/workout` under 800px. With reduced motion turned on, the outline moves instantly and the list doesn't scroll smoothly. Desktop, the API and stored workouts are unchanged.

**Changed**: Fixed set controls in the mobile workout session

- **What**: On phones, the add set button and note field now stay directly above the logging panel, instead of moving down as sets are added.
- **What changed**: `MobileSetList` lets the set list fill the spare room.
- **What it affects**: `/workout` under 800px. Desktop, the API and stored workouts are unchanged.

**Changed**: Removing sets in the mobile workout session

- **What**: On phones, each set row now has its own trash icon that removes that set, instead of one button below the list that only removed the last set. A short message lets you undo the removal.
- **What changed**: `MobileSetList` renders the remove button in each row, the `removeSet` action in `useWorkoutSession` takes an optional set position, the new `restoreSet` action puts a set back, and `MobileSession` shows the undo toast and keeps the selection on the same set after a removal.
- **What it affects**: `/workout` under 800px. Later sets renumber after a removal, and their logged values and notes stay with them. Desktop still removes the last set, and the API and stored workouts are unchanged.

**Changed**: Weight units per exercise

- **What**: Each exercise in a workout now has its own kg/lb toggle, and the app remembers your choice for that exercise next time. Before, one unit applied to the whole workout, so switching it also relabelled sets you had already logged.
- **What changed**: `useWorkoutSession` keeps a unit for each exercise, saves it in workout drafts, and remembers it under the new `ironwise:exercise-units` local storage key. `ironwise:weight-unit` is now only read, as the starting unit for exercises with no remembered choice. The desktop toggle moved from the page header into each exercise. `summarizeSession` no longer returns `volume` or `unit`, which nothing displayed and which would be wrong across mixed units.
- **What it affects**: `/workout` on phones and desktop. Changing an exercise's unit relabels that exercise's sets without converting the numbers. Saved history and the API are unchanged, and drafts saved before this change still restore. Remembered units stay on the device they were set on.

**Changed**: Mobile workout session layout

- **What**: On phones, only the set rows scroll now, so adding sets no longer pushes the controls out of view, and a newly added set scrolls into view. On short screens the image shrinks first, then the list, down to one visible row. The exercise tip moved up, between the image and the sets.
- **What changed**: `MobileSetList` sizes and scrolls its own rows and no longer renders the tip, `MobileSession` renders the tip and lays out the middle section as a column, and `ExerciseImage` can shrink to a smaller minimum height.
- **What it affects**: `/workout` under 800px. Desktop, the API, drafts and stored workouts are unchanged.

**Changed**: Mobile workout session font

- **What**: The phone workout session now uses the Inter font, including its exercise list and finish-early dialog.
- **What changed**: `frontend/index.html` loads Inter from Google Fonts, and `tailwind.config.mjs` adds a `font-inter` class, used by `MobileSession`, `ExerciseSwitcher` and, on mobile only, the finish-early dialog in `WorkoutSession`. `MobileSession` and `SetLogPanel` drop `font-display`.
- **What it affects**: `/workout` under 800px. Desktop, the completion screen and the rest of the app keep their current fonts, though every page now loads the Inter stylesheet.

**Changed**: Mobile workout session

- **What**: On phones, a workout session now shows one exercise at a time. The current exercise sits at the top with the next one in grey beside it, and pressing and holding the grey text lists every exercise to jump to. Sets appear below an image slot with the current set outlined in lime. A panel at the bottom logs weight and reps with steppers and a done button, then moves to the next set or exercise automatically. Tapping a logged set lets you edit or clear it.
- **What changed**:
  - New in `components/workoutSession/`: `MobileSession`, `SetLogPanel`, `ExerciseSwitcher`, `ExerciseImage` (a placeholder until real images are added), `MobileSetList`, `UnitToggle` (moved out of `WorkoutSession`) and `sessionNavigation.ts`.
  - `WorkoutSession` renders `MobileSession` under 800px and the existing layout otherwise.
  - `useIsMobile` is correct from the first render instead of starting as `false`.
  - `routes/__root.tsx`: the mobile bottom nav hides while `<body>` has `data-workout-session`.
- **What it affects**:
  - `/workout` on viewports under 800px. Desktop is unchanged.
  - The bottom nav is hidden during a mobile session, and the back arrow leads to Training. It returns on the completion screen.
  - Mobile now has one note field for the selected set, instead of a note field on every set.
  - Pages using `useIsMobile` (the root layout, `ProgressDemo`, `ManualProgramCreation`) get the right layout on first render, with no first-frame desktop flash on phones.
  - The API, drafts and stored workouts are unchanged. A draft started on one layout continues on the other.

## 2026-10-22

**Changed**: Training style and workout location in program generation

- **What**: The program generator asks how you want to train (Weightlifting, Calisthenics or Hybrid) and where (Gym or At home) right after your fitness goal. Choosing At home shows a checklist of equipment, and the generated program only uses exercises that equipment allows.
- **What changed**:
  - `components/programFactory/ProgramFactory.tsx`: two new steps (the wizard now has 7), an equipment checklist on the location step laid out in two columns, where "None" and other equipment can't be ticked together, and step titles rendered as `<h2>` from the `sections` list.
  - The checklist slides open when At home is picked and plays in reverse when switching back to Gym: rows fade in top-down and out bottom-up with CSS `opacity`/`transform` transitions, the panel height animates with the Web Animations API, and reduced motion keeps only the fade. Adds an `in-out-strong` easing to `tailwind.config.mjs`.
  - `POST /api/v1/programs/generate` takes three new optional fields: `training_style` (`Weightlifting` | `Calisthenics` | `Hybrid`, default `Weightlifting`), `workout_location` (`Gym` | `Home`, default `Gym`) and `home_equipment` (list of known equipment names, default empty, ignored for `Gym`). Unknown values are rejected with 422.
  - `models/programGeneration.py` (`ProgramOptions`) and `utils/programGenerator.py` (prompt now includes style, location and equipment).
  - `types/programCreation.ts`: `ProgramOptions` gains the three fields.
- **What it affects**:
  - `/aiProgramFactory`: the summary lists training style, location and, for home workouts, equipment. Each row's edit button jumps to the right step. The desktop progress bar has shorter labels ("Goal", "Style", "Location", "Experience", "Frequency", "About You", "Summary").
  - Existing API callers keep working because the new fields have defaults. Jobs queued before the deploy are generated as gym weightlifting programs.

**Changed**: Login and sign-up redesign

- **What**: The login and sign-up pages open on the landing page's shimmering dot field, which fades to black behind the form. Fields are rounded with icons, passwords have a show/hide button, and the submit button is a lime pill. The form sits near the vertical center of the screen, with the field reaching most of the way down behind it and dimmed slightly under the inputs. On phones everything fits above the bottom nav, including on small screens. On desktop the layout is a centered column instead of a card.
- **What changed**:
  - New `components/auth/AuthLayout.tsx` (page layout plus `AuthSubmitButton`) and `components/auth/AuthField.tsx` (labelled input with icon, error text and password toggle).
  - `routes/login.tsx` and `routes/registerUser.tsx` now render through these. Validation and API calls are unchanged.
  - Reuses `components/landing/SignalField.tsx` with cursor tracking off.
  - `routes/__root.tsx`: the desktop nav is transparent over the field on `/login` and `/registerUser` as well as `/`, and turns into a blurred bar once you scroll.
- **What it affects**:
  - `/login` and `/registerUser` at every width: field labels are kept for screen readers but hidden, a back button links to `/` (login) or `/login` (sign-up), the switch to the other page is a text link instead of a button, errors show without the `Error:` prefix, and inputs get `autocomplete` hints.
  - The headings now read "Welcome back" and "Create your account".

## 2026-10-21

**Changed**: Landing page redesign

- **What**: The landing page opens on an animated dot field in lime, aqua, purple and deep blue, with phone previews of the Home and Training screens on top. Below it, the page walks through the sample program, a set-logging demo you can type into, and a strength trend and records demo. The closing call to action sits on a quieter version of the same field.
- **What changed**:
  - `routes/index.tsx` is rewritten. The hero is now full-bleed, and the old "How it works" and tracking sections are replaced by the logging and progress sections.
  - New components in `components/landing/`: `SignalField.tsx` (WebGL shader), `HeroPhones.tsx`, `PhoneMockups.tsx`, `LoggingDemo.tsx` and `ProgressDemo.tsx`.
  - `data/landingData.ts` adds `PREVIEW_ACCOUNT`, `PREVIEW_WEEK`, `PREVIEW_PROGRAMS`, `PREVIEW_HISTORY`, `PREVIEW_PREVIOUS_SETS`, `PREVIEW_TRENDS` and `PREVIEW_RECORDS` (sample data only).
  - `index.css` adds the hero reveal, phone scroll, chart draw and WebGL fallback styles.
  - `routes/__root.tsx`: on `/`, the desktop nav is transparent over the hero and turns into a blurred bar once you scroll.
- **What it affects**:
  - The landing page (`/`) only. Other pages keep the solid desktop nav.
  - The animation pauses when the hero or the closing section is offscreen or the tab is hidden. With reduced motion turned on, the field renders one still frame and the phones and headline appear without moving.
  - Browsers without WebGL get a static dot pattern instead of the animation.

**Changed**: Generated programs are no longer lost

- **What**: A program you're generating, or one you've just generated, now survives a refresh, a closed tab, leaving the page, or a server restart. Come back to the program generator and it shows the program, or the loading screen if it's still being made. Logged in, it also follows you to other devices. A logged-out user's free program is now counted when it arrives, not when it's requested.
- **What changed**:
  - `POST /programs/generate` now answers `202 {job_id}` (or 503 if the queue is down) instead of the program.
  - New `GET /programs/generate/{job_id}`, `GET /programs/generate/latest` and `DELETE /programs/generate/{job_id}`.
  - Generation runs in a new worker process, `backend/worker.py`, fed by an Amazon SQS queue (`program-generation`, with dead-letter queue `program-generation-dlq`). The queue and IAM users are managed with Terraform in `infra/terraform/`.
  - Job state lives in Redis under `progen:job:{job_id}` and `progen:user:{user_id}`: 15 minutes while pending, 24 hours once done or failed.
  - New settings: `AWS_REGION` and `PROGRAM_QUEUE_URL`, plus optional `SQS_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`.
  - `docker-compose.yml` adds `elasticmq` (a local SQS) and `ironwise-worker`.
  - `/programs/generate*` reads an access token when one is sent instead of skipping auth.
  - On the frontend, `programGenAPI.ts` sends the token and stores the job ID in localStorage (`programGenJob`). `programGenerationSlice.ts` replaces `getAIProgram` with `startAIProgram` and `resumeAIProgram`, and `clearProgram` is now a thunk. The page body moved to `ProgramFactoryPage.tsx`.
- **What it affects**:
  - The program generator page: it waits for the resume check before showing the form, and "Start over" and saving a program now delete the job.
  - API consumers: any client that read the program from the `POST` response breaks, and must poll the job instead.
  - Deployment: production now needs the worker service and the AWS settings.
  - The free-program limit: a refresh, or a failed or expired job, no longer uses it up.

## 2026-10-20

**Changed**: Unsaved workout sets survive refreshes more reliably

- **What**: Reps, weight and notes you've entered in a workout but not yet submitted now come back after a refresh, even if the session runs past midnight or the program is edited mid-workout. Abandoned drafts are cleared after 18 hours.
- **What changed**: `useWorkoutSession.ts` stores the draft under `ironwise:workout:<programId>:<day>` (no date) as `{ startedAt, performedOn, exercises: [{ name, sets }] }`. It restores sets by exercise name instead of by position, prunes expired or old-format drafts when a workout opens, and stops saving a draft until something is entered.
- **What it affects**: The workout session page. A restored session submits with the date it started, not the current date. Drafts saved in the old date-keyed format are discarded the first time a workout opens after this change.

## 2026-10-19

**Changed**: Activity streak entrance animation

- **What**: When the Activity panel finishes loading, the totals and streak count de-blur into view, the labels fade in, and the workout grid's squares grow and fade in as a diagonal wave.
- **What changed**: `WorkoutStreakTracker.tsx` adds `animate-blur-in`, `animate-fade-in` and `animate-cell-in` classes; `tailwind.config.mjs` adds the `blur-in`, `fade-in` and `cell-in` keyframes; `index.css` adds the stagger delays, a `cell-fade` keyframe and a reduced-motion fallback.
- **What it affects**: The Activity panel on the home/profile page. It plays once, when the grid mounts after loading, not on refetches. With reduced motion turned on, the panel uses a plain 200ms fade with no stagger.
