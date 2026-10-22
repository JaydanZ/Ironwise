import { RefObject, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

interface SignalFieldProps {
  className?: string
  quietRef?: RefObject<HTMLElement | null>
  origin?: [number, number]
  intensity?: number
  interactive?: boolean
}

const VERTEX = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FRAGMENT = `
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform float uSpacing;
uniform float uPixel;
uniform vec2 uMouse;
uniform float uMouseActive;
uniform float uIntro;
uniform vec2 uOrigin;
uniform vec4 uQuiet;
uniform float uIntensity;

const vec3 DEEP_BLUE = vec3(0.137, 0.235, 0.737);
const vec3 PURPLE = vec3(0.608, 0.420, 1.0);
const vec3 AQUA = vec3(0.247, 0.902, 0.839);
const vec3 LIME = vec3(0.580, 0.918, 0.263);

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  return snoise(p) * 0.65 + snoise(p * 2.03 + 11.7) * 0.35;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 palette(float t) {
  t = clamp(t, 0.0, 1.0);
  // Lime holds the whole top of the range so it covers the most ground
  if (t < 0.22) return mix(DEEP_BLUE, PURPLE, t / 0.22);
  if (t < 0.42) return mix(PURPLE, AQUA, (t - 0.22) / 0.2);
  return mix(AQUA, LIME, smoothstep(0.46, 0.66, t));
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 cell = floor(frag / uSpacing);
  vec2 center = (cell + 0.5) * uSpacing;
  vec2 p = center / uRes.y;
  float t = uTime;

  vec2 warp = vec2(
    fbm(p * 0.6 + vec2(0.0, t * 0.035)),
    fbm(p * 0.6 + vec2(5.2, -t * 0.03))
  );
  float n = fbm(p * 0.85 + warp * 0.9 + vec2(t * 0.02, -t * 0.008));

  // Ridges of the noise read as slow, folding ribbons of light
  float ribbon = pow(1.0 - abs(n), 3.5);
  float body = smoothstep(0.1, 0.9, n) * 0.12;

  // A soft band of light sweeps across the field: the shimmer
  float sweep = sin((p.x * 0.9 - p.y * 0.55) * 4.2 - t * 0.7);
  sweep = smoothstep(0.55, 1.0, sweep);

  float seed = hash(cell);
  float twinkle = pow(0.5 + 0.5 * sin(t * (1.2 + seed * 2.6) + seed * 60.0), 18.0);

  float level = ribbon * 0.75 + body + sweep * (ribbon * 0.6 + body) + twinkle * (0.12 + ribbon * 0.7);
  level *= uIntensity;

  vec2 toMouse = (center - uMouse) / uSpacing;
  float mouseGlow = exp(-dot(toMouse, toMouse) / 160.0) * uMouseActive;
  level += mouseGlow * 0.7;

  vec2 quietDelta = (center - uQuiet.xy) / max(uQuiet.zw, vec2(1.0));
  float quiet = smoothstep(0.55, 1.25, length(quietDelta));
  level *= mix(0.15, 1.0, quiet);

  // The opening reveal: a wavefront spreads from the origin and leaves the field behind it
  float originDistance = distance(p, uOrigin * vec2(uRes.x / uRes.y, 1.0));
  float front = uIntro * 2.6;
  float revealed = 1.0 - smoothstep(front - 0.35, front, originDistance);
  float crest = exp(-pow((originDistance - front + 0.12) * 7.0, 2.0)) * (1.0 - uIntro);
  level = level * revealed + crest * 0.9;

  float lit = clamp(level, 0.0, 1.0);
  float radius = mix(0.08, 0.36, lit) * uSpacing;
  float dist = length(frag - center);
  float dotMask = 1.0 - smoothstep(radius - uPixel, radius + uPixel, dist);

  float hue = 0.5 + 0.95 * fbm(p * 0.45 + vec2(-t * 0.02, t * 0.015) + warp * 0.5);
  vec3 color = palette(hue + mouseGlow * 0.25);
  color = mix(color, LIME, smoothstep(0.4, 0.9, ribbon) * (0.2 + sweep * 0.4));
  color = mix(color, vec3(0.94, 1.0, 0.96), smoothstep(0.8, 1.2, level) * 0.35);

  vec3 ground = vec3(0.027, 0.035, 0.067);
  vec3 haze = DEEP_BLUE * 0.12 * (ribbon * 0.5 + body * 2.0) * revealed * quiet;

  float alpha = mix(0.14, 1.0, lit * lit);
  gl_FragColor = vec4(ground + haze + color * dotMask * alpha, 1.0);
}
`

const compile = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

const INTRO_MS = 2200
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)

export const SignalField = ({
  className,
  quietRef,
  origin = [0.7, 0.5],
  intensity = 1,
  interactive = true
}: SignalFieldProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [originX, originY] = origin
  const [isSupported, setIsSupported] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', {
      antialias: false,
      powerPreference: 'low-power'
    })
    if (!gl) {
      setIsSupported(false)
      return
    }

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX)
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
    const program = gl.createProgram()
    if (!vertex || !fragment || !program) {
      setIsSupported(false)
      return
    }
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setIsSupported(false)
      return
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    )
    const position = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const uniform = (name: string) => gl.getUniformLocation(program, name)
    const u = {
      res: uniform('uRes'),
      time: uniform('uTime'),
      spacing: uniform('uSpacing'),
      pixel: uniform('uPixel'),
      mouse: uniform('uMouse'),
      mouseActive: uniform('uMouseActive'),
      intro: uniform('uIntro'),
      origin: uniform('uOrigin'),
      quiet: uniform('uQuiet'),
      intensity: uniform('uIntensity')
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    // Capped so a 4K display doesn't shade four times the pixels for no visible gain
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
    let width = 0
    let height = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, Math.round(rect.width * dpr))
      height = Math.max(1, Math.round(rect.height * dpr))
      canvas.width = width
      canvas.height = height
      gl.viewport(0, 0, width, height)
    }
    resize()

    const pointer = { x: -9999, y: -9999, targetX: -9999, targetY: -9999 }
    let mouseActive = 0
    let mouseTarget = 0

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const rect = canvas.getBoundingClientRect()
      const inside =
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right
      mouseTarget = inside ? 1 : 0
      pointer.targetX = (event.clientX - rect.left) * dpr
      pointer.targetY = (rect.bottom - event.clientY) * dpr
      if (pointer.x < -999) {
        pointer.x = pointer.targetX
        pointer.y = pointer.targetY
      }
    }
    const handlePointerLeave = () => {
      mouseTarget = 0
    }

    const quietRect = () => {
      const el = quietRef?.current
      if (!el) return [0, 0, 0, 0]
      const canvasRect = canvas.getBoundingClientRect()
      const rect = el.getBoundingClientRect()
      return [
        (rect.left + rect.width / 2 - canvasRect.left) * dpr,
        (canvasRect.bottom - (rect.top + rect.height / 2)) * dpr,
        (rect.width / 2) * dpr * 1.05,
        (rect.height / 2) * dpr * 1.1
      ]
    }
    let quiet = quietRect()

    const observer = new ResizeObserver(() => {
      resize()
      quiet = quietRect()
      if (reducedMotion) draw(0)
    })
    observer.observe(canvas)
    if (quietRef?.current) observer.observe(quietRef.current)

    let frame = 0
    let isVisible = true
    let start = performance.now()
    let elapsed = 0
    let last = start

    const draw = (time: number) => {
      const intro = reducedMotion
        ? 1
        : easeOut(Math.min(1, (time - start) / INTRO_MS))
      pointer.x += (pointer.targetX - pointer.x) * 0.12
      pointer.y += (pointer.targetY - pointer.y) * 0.12
      mouseActive += (mouseTarget - mouseActive) * 0.06

      gl.uniform2f(u.res, width, height)
      gl.uniform1f(u.time, reducedMotion ? 12 : 12 + elapsed / 1000)
      gl.uniform1f(u.spacing, 7 * dpr)
      gl.uniform1f(u.pixel, 0.6 * dpr)
      gl.uniform2f(u.mouse, pointer.x, pointer.y)
      gl.uniform1f(u.mouseActive, interactive ? mouseActive : 0)
      gl.uniform1f(u.intro, intro)
      gl.uniform2f(u.origin, originX, 1 - originY)
      gl.uniform4f(u.quiet, quiet[0], quiet[1], quiet[2], quiet[3])
      gl.uniform1f(u.intensity, intensity)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const loop = (time: number) => {
      elapsed += Math.min(time - last, 50)
      last = time
      draw(time)
      frame = requestAnimationFrame(loop)
    }

    const play = () => {
      if (frame || reducedMotion) return
      last = performance.now()
      frame = requestAnimationFrame(loop)
    }
    const pause = () => {
      cancelAnimationFrame(frame)
      frame = 0
    }

    const visibility = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting
      if (isVisible && !document.hidden) {
        // The reveal should play when the field is first seen, not while it sat offscreen
        if (elapsed === 0) start = performance.now()
        play()
      } else pause()
    })
    visibility.observe(canvas)

    const handleVisibility = () => {
      if (document.hidden) pause()
      else if (isVisible) play()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    if (interactive && !reducedMotion) {
      window.addEventListener('pointermove', handlePointerMove, {
        passive: true
      })
      document.documentElement.addEventListener(
        'pointerleave',
        handlePointerLeave
      )
    }

    if (reducedMotion) draw(0)

    return () => {
      pause()
      observer.disconnect()
      visibility.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pointermove', handlePointerMove)
      document.documentElement.removeEventListener(
        'pointerleave',
        handlePointerLeave
      )
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      gl.deleteBuffer(buffer)
    }
  }, [quietRef, originX, originY, intensity, interactive])

  return (
    <div
      aria-hidden
      className={clsx('overflow-hidden bg-[#07090f]', className)}
    >
      {isSupported ? (
        <canvas ref={canvasRef} className="block size-full" />
      ) : (
        <div className="signal-field-fallback size-full" />
      )}
    </div>
  )
}
