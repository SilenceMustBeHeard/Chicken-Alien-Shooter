
import type { OscillatorWaveType } from "./sounds"
import {
  playTone,
  shootSound as rawShootSound,
  eggSplashSound as rawEggSplashSound,
  enemyDeadSound as rawEnemyDeadSound,
  chickenHitSound as rawChickenHitSound,
  chickenDeathSound as rawChickenDeathSound,
  powerUpSound as rawPowerUpSound,
  chargeSound as rawChargeSound,
  stunSound as rawStunSound,
  type SoundContext,
} from "./sounds"

export type SoundEffectName =
  | "shoot"
  | "eggSplash"
  | "enemyDead"
  | "chickenHit"
  | "chickenDeath"
  | "powerUp"
  | "charge"
  | "stun"
  | "bossSpawn"
  | "bossDefeat"
  | "bossAttack"
  | "playerDash"
  | "playerCharge"

export type AudioSystem = {
  play: (frequency: number, duration: number, type?: OscillatorWaveType) => void
  playSfx: (name: SoundEffectName) => void
  setEnabled: (enabled: boolean) => void
  isEnabled: () => boolean
  init: () => void

  // Named convenience methods
  shootSound: () => void
  eggSplashSound: () => void
  enemyDeadSound: () => void
  chickenHitSound: () => void
  chickenDeathSound: () => void
  powerUpSound: () => void
  chargeSound: () => void
  stunSound: () => void
}

type AudioSystemOptions = {
  audioContextRef: React.RefObject<AudioContext | null>
  isEnabledRef: React.RefObject<boolean>
}

export function createAudioSystem(options: AudioSystemOptions): AudioSystem {
  const { audioContextRef, isEnabledRef } = options

  const getSoundCtx = (): SoundContext => ({
    audioContext: audioContextRef.current,
    enabled: isEnabledRef.current,
  })

  return {
    play(frequency, duration, type = "sine") {
      playTone(getSoundCtx(), frequency, duration, type)
    },

    playSfx(name) {
      switch (name) {
        case "shoot":
          rawShootSound(getSoundCtx())
          break
        case "eggSplash":
          rawEggSplashSound(getSoundCtx())
          break
        case "enemyDead":
          rawEnemyDeadSound(getSoundCtx())
          break
        case "chickenHit":
          rawChickenHitSound(getSoundCtx())
          break
        case "chickenDeath":
          rawChickenDeathSound(getSoundCtx())
          break
        case "powerUp":
          rawPowerUpSound(getSoundCtx())
          break
        case "charge":
          rawChargeSound(getSoundCtx())
          break
        case "stun":
          rawStunSound(getSoundCtx())
          break
        case "bossSpawn":
          playTone(getSoundCtx(), 100, 0.5, "sawtooth")
          break
        case "bossDefeat":
          playTone(getSoundCtx(), 200, 0.3, "triangle")
          setTimeout(() => playTone(getSoundCtx(), 300, 0.3, "triangle"), 150)
          setTimeout(() => playTone(getSoundCtx(), 400, 0.5, "triangle"), 300)
          break
        case "bossAttack":
          playTone(getSoundCtx(), 300, 0.2, "sawtooth")
          break
        case "playerDash":
          playTone(getSoundCtx(), 400, 0.15, "sawtooth", 0.15, 400, 0.1)
          break
        case "playerCharge":
          playTone(getSoundCtx(), 200, 0.2, "sawtooth", 0.05, 100, 0.1)
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

    // Convenience methods
    shootSound: () => rawShootSound(getSoundCtx()),
    eggSplashSound: () => rawEggSplashSound(getSoundCtx()),
    enemyDeadSound: () => rawEnemyDeadSound(getSoundCtx()),
    chickenHitSound: () => rawChickenHitSound(getSoundCtx()),
    chickenDeathSound: () => rawChickenDeathSound(getSoundCtx()),
    powerUpSound: () => rawPowerUpSound(getSoundCtx()),
    chargeSound: () => rawChargeSound(getSoundCtx()),
    stunSound: () => rawStunSound(getSoundCtx()),
  }
}