

import type { AudioSystem, SoundEffectName, OscillatorWaveType } from "../audio-system"

type AudioSystemOptions = {
  audioContextRef: React.RefObject<AudioContext | null>
  isEnabledRef: React.RefObject<boolean>
}



 // Creates an AudioSystem backed by a Web Audio API AudioContext

export function createAudioSystem(
  options: AudioSystemOptions,
): AudioSystem {
  const { audioContextRef, isEnabledRef } = options

  const playTone = (
    frequency: number,
    duration: number,
    type: OscillatorWaveType,
    gainValue = 0.3,
    startFrequency = frequency,
    endFrequency = frequency,
  ) => {
    if (!isEnabledRef.current || !audioContextRef.current) return

    try {
      const ctx = audioContextRef.current
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

  return {
    play(frequency, duration, type = "sine") {
      playTone(frequency, duration, type)
    },

    playSfx(name: SoundEffectName) {
      switch (name) {
        case "shoot":
          playTone(500, 0.08, "square")
          break
        case "eggSplash":
          playTone(600, 0.15, "sawtooth", 0.2, 600, 150)
          break
        case "enemyDead":
          playTone(800, 0.4, "triangle", 0.25, 800, 100)
          break
        case "chickenHit":
          playTone(400, 0.25, "sawtooth", 0.3, 400, 300)
          break
        case "chickenDeath":
          playTone(500, 0.3, "sawtooth", 0.3, 500, 200)
          setTimeout(() => playTone(300, 0.35, "triangle", 0.25, 300, 80), 150)
          break
        case "powerUp":
          playTone(800, 0.2, "sine")
          break
        case "charge":
          playTone(200, 0.2, "sawtooth", 0.05, 100, 0.1)
          playTone(400, 0.15, "sine", 0.05, 300, 0.08)
          break
        case "stun":
          playTone(600, 0.3, "square", 0.1, 400, 0.15)
          playTone(500, 0.25, "sawtooth", 0.15, 350, 0.2)
          break
        case "bossSpawn":
          playTone(100, 0.5, "sawtooth")
          break
        case "bossDefeat":
          playTone(200, 0.3, "triangle")
          setTimeout(() => playTone(300, 0.3, "triangle"), 150)
          setTimeout(() => playTone(400, 0.5, "triangle"), 300)
          break
        case "bossAttack":
          playTone(300, 0.2, "sawtooth")
          break
        case "playerDash":
          playTone(400, 0.15, "sawtooth", 0.15, 400, 0.1)
          break
        case "playerCharge":
          playTone(200, 0.2, "sawtooth", 0.05, 100, 0.1)
          break
      }
    },

    setEnabled(enabled) {
      isEnabledRef.current = enabled
    },

    isEnabled() {
      return isEnabledRef.current
    },

    init() {
      if (!audioContextRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        if (AudioContextClass) {
          audioContextRef.current = new AudioContextClass()
        }
      }
    },
  }
}