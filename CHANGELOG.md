# Changelog

Features added to, changed in, or removed from Ironwise, newest first.

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
