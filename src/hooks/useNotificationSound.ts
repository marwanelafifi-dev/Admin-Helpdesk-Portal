"use client"

import { useEffect, useRef } from "react"

function playNotificationBeep() {
  try {
    const ctx = new AudioContext()
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)

    // Two-tone chime: high note then slightly lower
    const freqs = [880, 660]
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      osc.type = "sine"
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12)
      osc.connect(gain)
      osc.start(ctx.currentTime + i * 0.12)
      osc.stop(ctx.currentTime + i * 0.12 + 0.3)
    })

    // Auto-close context after sound ends
    setTimeout(() => ctx.close(), 800)
  } catch {
    // AudioContext unavailable (SSR or restricted browser) — silent fallback
  }
}

/**
 * Plays a notification chime whenever `unreadCount` increases.
 * Skips the sound on the very first render (page load) so it doesn't fire
 * for pre-existing unread notifications.
 */
export function useNotificationSound(unreadCount: number) {
  const prevCount = useRef<number | null>(null)

  useEffect(() => {
    if (prevCount.current === null) {
      // First render — record baseline, don't play
      prevCount.current = unreadCount
      return
    }
    if (unreadCount > prevCount.current) {
      playNotificationBeep()
    }
    prevCount.current = unreadCount
  }, [unreadCount])
}
