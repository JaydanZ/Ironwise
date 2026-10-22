import { CSSProperties, useRef } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { CreateProgramButton } from '@/components/programCreation/CreateProgramButton'
import { SampleWeek } from '@/components/landing/SampleWeek'
import { SignalField } from '@/components/landing/SignalField'
import { HeroPhones } from '@/components/landing/HeroPhones'
import { LoggingDemo } from '@/components/landing/LoggingDemo'
import { ProgressDemo } from '@/components/landing/ProgressDemo'
import { SAMPLE_PROFILE } from '@/data/landingData'

export const Route = createFileRoute('/')({
  component: RouteComponent
})

const reveal = (index: number) => ({ '--i': index }) as CSSProperties

const HERO_ORIGIN: [number, number] = [0.72, 0.55]
const CLOSE_ORIGIN: [number, number] = [0.5, 0.5]

const headingClass =
  'text-balance font-display text-4xl font-bold leading-[1.02] tracking-[-0.015em] text-neutral-50 md:text-5xl'
const bodyClass = 'text-lg leading-relaxed text-neutral-400'

function RouteComponent() {
  const heroCopyRef = useRef<HTMLDivElement>(null)
  const closeCopyRef = useRef<HTMLDivElement>(null)

  return (
    <main className="landing w-full pb-36 min-[800px]:pb-0">
      <section
        aria-labelledby="hero-title"
        className="relative isolate overflow-hidden min-[800px]:min-h-[max(100svh,760px)]"
      >
        <SignalField
          quietRef={heroCopyRef}
          origin={HERO_ORIGIN}
          className="absolute inset-0 -z-10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-80 bg-gradient-to-b from-transparent via-app-colors-500/80 to-app-colors-500 min-[800px]:h-96"
        />

        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 pb-28 pt-14 sm:px-8 min-[800px]:min-h-[max(100svh,760px)] min-[800px]:pb-16 min-[800px]:pt-28 lg:grid-cols-12 lg:gap-6 lg:px-12">
          <div ref={heroCopyRef} className="lg:col-span-6 xl:col-span-6">
            <h1
              id="hero-title"
              className="font-display text-[3rem] font-bold leading-[0.95] -tracking-wide text-neutral-50 sm:text-7xl xl:text-[6rem]"
            >
              <span className="hero-line" style={reveal(0)}>
                <span>Walk in knowing</span>
              </span>
              <span className="hero-line" style={reveal(1)}>
                <span>
                  what to <span className="text-app-colors-300">lift.</span>
                </span>
              </span>
            </h1>
            <p
              className="hero-fade mt-7 max-w-[40ch] text-lg font-normal leading-relaxed text-neutral-100 [text-shadow:0_1px_12px_rgb(0_0_0/0.9)] sm:text-xl"
              style={reveal(2)}
            >
              Answer four questions and get a week of training written for
              you. Log your sets as you go and see which lifts are getting
              stronger.
            </p>
            <div
              className="hero-fade mt-9 flex flex-wrap items-center gap-x-7 gap-y-4"
              style={reveal(3)}
            >
              <CreateProgramButton size="lg" />
              <a
                href="#sample-week"
                className="text-sm font-medium text-neutral-200 underline decoration-neutral-500 underline-offset-[6px] transition-colors duration-150 hover:text-neutral-50 hover:decoration-app-colors-300"
              >
                See a sample week
              </a>
            </div>
            <p
              className="hero-fade mt-5 text-sm text-neutral-300 [text-shadow:0_1px_10px_rgb(0_0_0/0.9)]"
              style={reveal(4)}
            >
              Free to try. You don&rsquo;t need an account.
            </p>
          </div>

          <div className="[--phone-scale:0.62] sm:[--phone-scale:0.78] lg:col-span-6 lg:[--phone-scale:0.98] xl:[--phone-scale:1.06]">
            <HeroPhones />
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-12">
        <section
          id="sample-week"
          aria-labelledby="sample-title"
          className="scroll-mt-28 pt-8 min-[800px]:pt-24 md:pt-32"
        >
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-6">
              <h2 id="sample-title" className={`${headingClass} max-w-[18ch]`}>
                This came back from four answers.
              </h2>
              <p className={`${bodyClass} mt-5 max-w-[50ch]`}>
                Someone who wants to build muscle, has been training for a
                couple of years and can get to the gym four days a week. Tap
                any exercise to read the note that came with it.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-6 self-end lg:col-span-5 lg:col-start-8">
              {SAMPLE_PROFILE.map((step) => (
                <div key={step.question} className="border-t border-neutral-800 pt-4">
                  <dt className="text-sm text-neutral-400">{step.question}</dt>
                  <dd className="mt-1.5 font-display text-xl font-semibold text-neutral-50">
                    {step.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-12">
            <SampleWeek />
          </div>
        </section>

        <section
          aria-labelledby="log-title"
          className="grid items-center gap-12 pt-28 md:pt-40 lg:grid-cols-12 lg:gap-8"
        >
          <div className="lg:col-span-5">
            <h2 id="log-title" className={`${headingClass} max-w-[14ch]`}>
              Log it between sets.
            </h2>
            <p className={`${bodyClass} mt-5 max-w-[46ch]`}>
              Open today&rsquo;s workout and every exercise shows what you did
              last time. Tap that number to copy it across, or type what you
              actually lifted. Kilos or pounds, your call.
            </p>
            <ul className="mt-8 max-w-[46ch] divide-y divide-neutral-800 border-y border-neutral-800 text-neutral-300">
              <li className="py-4">
                Refresh by accident and the sets you typed are still there.
              </li>
              <li className="py-4">
                Finish the session and you get a summary with your total
                volume.
              </li>
            </ul>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <LoggingDemo />
            <p className="mt-3 text-sm text-neutral-500">
              Try it. Last session&rsquo;s numbers fill in when you tap them.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="progress-title"
          className="pt-28 md:pt-40"
        >
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
            <h2
              id="progress-title"
              className={`${headingClass} max-w-[16ch] lg:col-span-6`}
            >
              See which lifts are actually going up.
            </h2>
            <div className="lg:col-span-5 lg:col-start-8">
              <p className={bodyClass}>
                Records are ranked by estimated one-rep max, so a heavy triple
                and a lighter set of eight are measured on the same scale.
                Pick a lift to see where it&rsquo;s heading.
              </p>
              <p className={`${bodyClass} mt-4`}>
                Your streak only counts the days your program has you
                training. Rest days don&rsquo;t break it.
              </p>
            </div>
          </div>
          <div className="mt-12">
            <ProgressDemo />
            <p className="mt-3 text-sm text-neutral-500">Sample data.</p>
          </div>
        </section>
      </div>

      <section
        aria-labelledby="close-title"
        className="relative isolate mt-28 overflow-hidden md:mt-40"
      >
        <SignalField
          quietRef={closeCopyRef}
          origin={CLOSE_ORIGIN}
          intensity={0.75}
          className="absolute inset-0 -z-10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-56 bg-gradient-to-b from-app-colors-500 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-app-colors-500 to-transparent"
        />
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 py-32 text-center sm:px-8 md:py-44 lg:px-12">
          <div ref={closeCopyRef} className="flex flex-col items-center">
            <h2
              id="close-title"
              className="max-w-[16ch] text-balance font-display text-5xl font-bold leading-[0.98] tracking-[-0.02em] text-neutral-50 md:text-7xl"
            >
              Your first session is a minute away.
            </h2>
            <div className="mt-10">
              <CreateProgramButton size="lg" />
            </div>
            <p className="mt-5 max-w-[40ch] text-sm text-neutral-300">
              Try it without an account.{' '}
              <Link
                to="/registerUser"
                className="font-medium text-app-colors-300 underline decoration-app-colors-300/40 underline-offset-[5px] transition-colors duration-150 hover:decoration-app-colors-300"
              >
                Sign up
              </Link>{' '}
              when you want to keep it.
            </p>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-2 border-t border-neutral-800 px-4 py-8 text-sm text-neutral-400 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <span className="font-medium text-app-colors-300">Ironwise</span>
        <span>Reps and workouts, guided by AI intelligence.</span>
      </footer>
    </main>
  )
}
