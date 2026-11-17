
import type { GameObject } from "./player"

export type EnemyType =
  | "grunt"
  | "tank"
  | "leech"
  | "splitter"
  | "blinker"
  | "hiveGrunt"  
  | "hiveTank"

export type Enemy = GameObject & {
  health: number
  maxHealth: number
  speed: number
  type: EnemyType
  alienType: EnemyType
  color: string
  groupId: number
  hitFlash?: number
  stunned?: boolean
  stunnedTime?: number
  contactCooldown?: number
  blinkerTimer?: number
  healTimer?: number
  teleportCooldown?: number
  isHiveEnemy?: boolean
}

export type FlyingSaucer = GameObject & {
  speed: number
  health: number
  direction: number
  bobOffset: number
}