// lib/game/types/player.ts

export type GameObject = {
  x: number
  y: number
  radius: number
}

export type PlayerWeaponType =
  | "basic"
  | "doubleYolk"
  | "scrambled"
  | "hardBoiled"
  | "explosive"
  | "golden"

export type Player = GameObject & {
  health: number
  maxHealth: number
  speed: number
  shootCooldown: number
  weaponType: PlayerWeaponType
  weaponTime: number
  shield: boolean
  shieldTime: number
  chargeCooldown: number
  stunCooldown: number
  isCharging: boolean
  chargeDistance: number
  chargeDirection: { x: number; y: number }
  chargeReady: boolean
  invincibleTime: number
}