// hooks/use-audio.ts

import { useEffect, useMemo, useRef } from "react"
import { createAudioSystem, type OscillatorWaveType } from "@/lib/game/audio"

// creates an audio system for the game, providing functions to play sounds and manage audio context

export function useAudio(soundEnabled: boolean) {
  const soundEnabledRef = useRef(soundEnabled)
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  const audioSystem = useMemo(
    () =>
      createAudioSystem({
        audioContextRef,
        isEnabledRef: soundEnabledRef,
      }),
    [audioContextRef, soundEnabledRef],
  )

  const initAudio = () => audioSystem.init()

  const playSound = (
    freq: number,
    dur: number,
    type?: OscillatorWaveType,
    _gainValue?: number,
    _startFreq?: number,
    _endFreq?: number,
  ) => {
    audioSystem.play(freq, dur, type)
  }

  return {
    audioContextRef,
    soundEnabledRef,
    audioSystem,
    initAudio,
    playSound,
    shootSound: () => audioSystem.shootSound(),
    eggSplashSound: () => audioSystem.eggSplashSound(),
    enemyDeadSound: () => audioSystem.enemyDeadSound(),
    chickenHitSound: () => audioSystem.chickenHitSound(),
    chickenDeathSound: () => audioSystem.chickenDeathSound(),
    powerUpSound: () => audioSystem.powerUpSound(),
    chargeSound: () => audioSystem.chargeSound(),
    stunSound: () => audioSystem.stunSound(),
  }
}