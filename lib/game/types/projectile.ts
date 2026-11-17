
export type Projectile = {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  damage: number
  color: string
  piercing?: boolean
  explosive?: boolean
  explosionRadius?: number
  isEnemyProjectile?: boolean
  dead?: boolean

  // Leviathan wave
  isLeviathanWave?: boolean
  waveAngle?: number
  waveScaleX?: number
  waveScaleY?: number
  waveAge?: number
  waveMaxAge?: number

  // Void Reaper
  isVoidSlash?: boolean
  isVoidOrb?: boolean
}