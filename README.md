# Ironwise

Reps and workouts, guided by AI intelligence. https://ironwise.net/

Answer five questions and Ironwise builds a weekly program with sets, reps and coaching tips. Save it, edit it, log your sessions against it, and track PRs, strength trends and streaks. You can try the generator without an account (rate limited).

Still in active development.

## Features

### Landing page

- Animated hero: a WebGL dot field in lime, aqua, purple and deep blue that shimmers, reacts to the cursor and pauses when offscreen. Falls back to a static pattern without WebGL, and holds still with reduced motion.
- Coded previews of the Home and Training screens, plus working demos of set logging and the strength trend chart (sample data).

### AI program generation

- OpenAI model via LangChain, with output parsed into a strict Pydantic schema and retried once if invalid.
- Spreads rest days through the week when you train fewer than six days.
- Runs as a background job on Amazon SQS, so refreshes, closed tabs or server restarts don't lose your program.
- Logged-in users see in-progress programs across devices and can save them to their account.

### Building and editing programs

- Create programs from scratch or edit saved ones: days, exercises, sets, reps and weekday order.
- Mobile-friendly editor with a pinned header and save button.
- Paginated, searchable program list on your profile.

### Logging workouts

- Log weight and reps set by set, with your last performance shown for each exercise.
- kg/lb switching with conversion for comparisons.
- Drafts saved locally so a refresh doesn't lose a session.
- End-of-session summary with total volume.

### Progress tracking

- Home week strip showing done, missed and upcoming days.
- Personal records ranked by estimated one-rep max (Epley).
- Per-exercise strength trend chart.
- Streak that only counts scheduled days.
- Searchable workout history.

### Accounts and security

- JWT access tokens with Redis-backed refresh tokens, revoked on logout.
- Argon2id password hashing, with legacy bcrypt hashes upgraded on login.
- Breached-password check via Have I Been Pwned (k-anonymity).
- Account lockout after repeated failed logins, without revealing which accounts exist.
- Password reset by emailed six-digit code (Resend).
- Per-route rate limiting with SlowAPI plus Nginx `limit_req`.
- Locked-down CORS and auth middleware on all non-public routes.

## Tech stack

**Frontend:** React 19, Vite, TypeScript, WebGL, TanStack Router, TanStack Form, Redux Toolkit / RTK Query, Axios, Tailwind CSS, shadcn/ui (Radix UI), Motion, Lucide, React Icons, Vitest, Testing Library, happy-dom, ESLint, Prettier, pnpm

**Backend:** Python, FastAPI, Uvicorn, Pydantic, LangChain, OpenAI, Supabase (PostgreSQL), Redis, Amazon SQS (boto3), PyJWT, argon2-cffi, bcrypt, SlowAPI, Resend, HTTPX, pytest, fakeredis, moto

**Infrastructure:** Docker Compose (with ElasticMQ as local SQS), Terraform (AWS), Nginx, GitHub Actions (Supabase migrations on `main`)
