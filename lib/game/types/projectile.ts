// lib/game/types/projectile.ts

import type { GameObject } from "./player"

export type Projectile = GameObject & {
  vx: number
  vy: number
  damage: number
  piercing?: boolean
  explosive?: boolean
  explosionRadius?: number
  color?: string
  dead?: boolean
  isEnemyProjectile?: boolean

  // Void Leviathan wave
  isLeviathanWave?: boolean
  waveAngle?: number
  waveScaleX?: number
  waveScaleY?: number
  waveAge?: number
  waveMaxAge?: number
}