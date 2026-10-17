# Ironwise

Reps and workouts, guided by AI intelligence.

Ironwise is a workout planner and training log. You answer five quick questions (your goal, how long you've been lifting, how many days a week you can train, and your age, weight and gender) and it builds a weekly program for you, day by day, with sets, reps and a short coaching tip for every exercise. Once you have an account you can save that program, edit it, make it your active plan, and log every session against it. Over time the app turns those logs into personal records, strength trends and a workout streak.

You can try the program generator without signing up. Logged-out generation is rate limited, so there's a cap on how many programs you can make before you need an account.

The project is still in active development.

## Features

### AI program generation

- Five-question form that sends your answers to an OpenAI model through LangChain.
- The model's output is parsed straight into a Pydantic schema, so a program either matches the rules (valid weekday names, each day used once, limits on name lengths and exercises per day) or it gets rejected. Invalid output is retried once before the request fails.
- Recovery is built into the prompt: workouts land on weekdays when you train fewer than six days, with rest spread through the week.
- Generated programs can be saved straight to your account.

### Building and editing programs

- Create a program by hand from scratch, or open any saved program and change it.
- Add and remove days and exercises, set sets and reps per exercise, and move a day to a different weekday (the week re-sorts itself).
- Mobile layouts keep the header and save button pinned so long programs are still easy to edit on a phone.
- Programs are paginated and searchable from your profile.

### Logging workouts

- Start a session from your active program and record weight and reps set by set.
- Each set shows what you lifted last time for that exercise, so you know what to beat.
- Switch between kg and lb; weights are converted for comparisons.
- Drafts are saved locally while you train, so a refresh or a closed tab doesn't wipe a half-finished session.
- A summary screen at the end shows total volume and what you did for each exercise.

### Progress tracking

- Home dashboard with a week strip showing which scheduled days are done, missed or coming up. Tap a day to see its workout.
- Personal records and best lifts, ranked by estimated one-rep max (Epley formula).
- Per-exercise strength trend chart.
- Workout streak that only counts the days your program actually schedules, so rest days don't break it.
- Searchable history of past workouts. Every search term has to match the workout's focus, day, program name or exercise names.

### Accounts and security

- Registration and login with short-lived JWT access tokens and refresh tokens. Refresh tokens are stored in Redis and revoked on logout.
- Passwords hashed with Argon2id. Older bcrypt hashes are upgraded automatically the next time that user logs in.
- New passwords are checked against Have I Been Pwned using the k-anonymity range API (only the first five characters of the SHA-1 hash leave the server). Passwords that match your username or email are also rejected.
- Account lockout after repeated failed logins, keyed by email so unknown addresses get the same treatment and nothing leaks about which accounts exist.
- Password reset by emailed six-digit code (sent through Resend), with expiring codes, attempt limits and single-use reset tokens, all held in Redis.
- Per-route rate limiting with SlowAPI, keyed by IP, by user, or by both depending on the route, plus an Nginx `limit_req` zone in front of the API.
- Change password from the profile page.
- Locked-down CORS and auth middleware on every route that isn't explicitly public.

## Tech stack

**Languages:** TypeScript, Python, SQL

### Frontend

- **React 19** with **Vite** and **TypeScript**
- **TanStack Router** for file-based, type-safe routing
- **TanStack Form** for form state and validation
- **Redux Toolkit** and **RTK Query** for app state, API caching and automatic access-token refresh
- **Axios** for the auth and program generation calls
- **Tailwind CSS** with **shadcn/ui** components built on **Radix UI** primitives
- **Motion** for animation, **Lucide** and **React Icons** for icons
- **Vitest**, **Testing Library** and **happy-dom** for tests
- **ESLint** and **Prettier**, with **pnpm** as the package manager

### Backend

- **Python** with **FastAPI**, served by **Uvicorn**
- **Pydantic** and **pydantic-settings** for request/response models and config
- **LangChain** with the **OpenAI** API for program generation
- **Supabase** (PostgreSQL) for data, with SQL migrations, declarative schemas, views and Postgres functions
- **Redis** for refresh tokens, login lockouts and password reset state
- **PyJWT** for tokens, **argon2-cffi** (and **bcrypt** for legacy hashes) for passwords
- **SlowAPI** for rate limiting
- **Resend** for transactional email
- **HTTPX** for the Have I Been Pwned check
- **pytest** with **fakeredis** for tests

### Infrastructure

- **Docker** and **Docker Compose** for running the frontend and backend together
- **Nginx** as a reverse proxy with request rate limiting
- **GitHub Actions** workflow that pushes database migrations to Supabase whenever a migration lands on `main`
