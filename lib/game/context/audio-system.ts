
export type OscillatorWaveType = "sine" | "square" | "sawtooth" | "triangle"

export interface AudioSystem {
// Play a sound 
  play(frequency: number, duration: number, type?: OscillatorWaveType): void

 // Play a sound effect by name
  playSfx(name: SoundEffectName): void

 // Enable/disable audio 
  setEnabled(enabled: boolean): void

// Check if audio is enabled
  isEnabled(): boolean

  // Initialize the audio system
  init(): void
}

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