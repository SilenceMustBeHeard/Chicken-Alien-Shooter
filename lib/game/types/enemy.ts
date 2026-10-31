// lib/game/types/enemy.ts

import type { GameObject } from "./player"

export type EnemyType = "grunt" | "tank" | "leech" | "splitter" | "blinker"

export type Enemy = GameObject & {
  speed: number
  health: number
  maxHealth: number
  groupId: number
  type: EnemyType
  blinkerTimer?: number
  healTimer?: number
  stunned?: boolean
  stunnedTime?: number
  teleportCooldown?: number
  alienType?: string
  color?: string
  hitFlash?: number
  contactCooldown?: number
}

export type FlyingSaucer = GameObject & {
  speed: number
  health: number
  direction: number
  bobOffset: number
}