"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Animate a numeric value from 0 to `target` over `durationMs`.
 * Restarts whenever `target` changes (e.g. when the dashboard time range changes).
 * Designed for KPI tiles — kept short and ease-out so the motion feels formal.
 *
 * If the target is not a finite number (e.g. NaN, Infinity), the hook returns
 * the target unchanged. Decimals are supported — the returned value is rounded
 * to the same number of decimal places as the target so the digits don't jitter.
 */
export function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState<number>(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef<number>(0)

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setValue(target)
      return
    }

    // Capture where we're starting from so re-renders mid-animation
    // don't snap back to 0 (e.g. when the user switches date range).
    fromRef.current = value
    startRef.current = null

    const decimals = countDecimals(target)
    const factor = 10 ** decimals

    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const t = Math.min(1, elapsed / durationMs)
      // ease-out cubic — formal, no bounce
      const eased = 1 - Math.pow(1 - t, 3)
      const current = fromRef.current + (target - fromRef.current) * eased
      setValue(Math.round(current * factor) / factor)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setValue(target)
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs])

  return value
}

function countDecimals(n: number): number {
  if (!Number.isFinite(n) || Math.floor(n) === n) return 0
  const s = String(n)
  const i = s.indexOf(".")
  return i === -1 ? 0 : s.length - i - 1
}
