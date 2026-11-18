
export type OscillatorWaveType = "sine" | "square" | "sawtooth" | "triangle"

export type SoundContext = {
  audioContext: AudioContext | null
  enabled: boolean
}

/**
 * Play a tone with the given frequency, duration, and wave type.
 */
export function playTone(
  soundCtx: SoundContext,
  frequency: number,
  duration: number,
  type: OscillatorWaveType = "sine",
  gainValue = 0.3,
  startFrequency: number = frequency,
  endFrequency: number = frequency,
): void {
  if (!soundCtx.enabled || !soundCtx.audioContext) return

  try {
    const ctx = soundCtx.audioContext
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type = type
    oscillator.frequency.setValueAtTime(startFrequency, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(
      endFrequency,
      ctx.currentTime + duration,
    )

    gainNode.gain.setValueAtTime(gainValue, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + duration)
  } catch (e) {
    console.log("[audio] error:", e)
  }
}

export function shootSound(soundCtx: SoundContext): void {
  playTone(soundCtx, 500, 0.08, "square")
}

export function eggSplashSound(soundCtx: SoundContext): void {
  playTone(soundCtx, 600, 0.15, "sawtooth", 0.2, 600, 150)
}

export function enemyDeadSound(soundCtx: SoundContext): void {
  playTone(soundCtx, 800, 0.4, "triangle", 0.25, 800, 100)
}

export function chickenHitSound(soundCtx: SoundContext): void {
  playTone(soundCtx, 400, 0.25, "sawtooth", 0.3, 400, 300)
}

export function chickenDeathSound(soundCtx: SoundContext): void {
  if (!soundCtx.enabled || !soundCtx.audioContext) return
  playTone(soundCtx, 500, 0.3, "sawtooth", 0.3, 500, 200)
  setTimeout(() => {
    playTone(soundCtx, 300, 0.35, "triangle", 0.25, 300, 80)
  }, 150)
}

export function powerUpSound(soundCtx: SoundContext): void {
  playTone(soundCtx, 800, 0.2, "sine")
}

export function chargeSound(soundCtx: SoundContext): void {
  playTone(soundCtx, 200, 0.2, "sawtooth", 0.05, 100, 0.1)
  playTone(soundCtx, 400, 0.15, "sine", 0.05, 300, 0.08)
}

export function stunSound(soundCtx: SoundContext): void {
  playTone(soundCtx, 600, 0.3, "square", 0.1, 400, 0.15)
  playTone(soundCtx, 500, 0.25, "sawtooth", 0.15, 350, 0.2)
  playTone(soundCtx, 700, 0.2, "sine", 0.2, 600, 0.1)
}