# Changelog

Features added to, changed in, or removed from Ironwise, newest first.

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
