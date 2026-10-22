import { useEffect } from 'react'
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform
} from 'motion/react'
import { HomeScreen, PhoneFrame, TrainingScreen } from './PhoneMockups'

const EASE_OUT_STRONG = [0.23, 1, 0.32, 1] as const

export const HeroPhones = () => {
  const reducedMotion = useReducedMotion()
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const springX = useSpring(pointerX, { stiffness: 60, damping: 18 })
  const springY = useSpring(pointerY, { stiffness: 60, damping: 18 })

  const frontX = useTransform(springX, (value) => value * 14)
  const frontY = useTransform(springY, (value) => value * 10)
  const backX = useTransform(springX, (value) => value * -8)
  const backY = useTransform(springY, (value) => value * -6)
  const tiltY = useTransform(springX, (value) => value * 4)
  const tiltX = useTransform(springY, (value) => value * -3)

  useEffect(() => {
    if (reducedMotion) return
    const handleMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      pointerX.set(event.clientX / window.innerWidth - 0.5)
      pointerY.set(event.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('pointermove', handleMove, { passive: true })
    return () => window.removeEventListener('pointermove', handleMove)
  }, [pointerX, pointerY, reducedMotion])

  const enter = (delay: number) =>
    reducedMotion
      ? { initial: false as const }
      : {
          initial: { opacity: 0, y: 70, filter: 'blur(14px)' },
          animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
          transition: { duration: 1.3, delay, ease: EASE_OUT_STRONG }
        }

  return (
    <div className="hero-phones relative mx-auto h-[calc(620px*var(--phone-scale))] w-[calc(520px*var(--phone-scale))] [perspective:1600px]">
      <motion.div
        {...enter(0.55)}
        className="absolute left-0 top-[calc(56px*var(--phone-scale))]"
      >
        <motion.div style={{ x: backX, y: backY }}>
          <div className="origin-top-left scale-[var(--phone-scale)]">
            <PhoneFrame
              label="Ironwise training screen, sample account"
              className="rotate-[-7deg]"
            >
              <TrainingScreen />
            </PhoneFrame>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        {...enter(0.35)}
        className="absolute right-0 top-0"
      >
        <motion.div
          style={{ x: frontX, y: frontY, rotateX: tiltX, rotateY: tiltY }}
        >
          <div className="origin-top-right scale-[var(--phone-scale)]">
            <PhoneFrame
              label="Ironwise home screen, sample account"
              className="rotate-[4deg]"
            >
              <HomeScreen />
            </PhoneFrame>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
