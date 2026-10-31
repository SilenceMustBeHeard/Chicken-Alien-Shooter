// lib/game/types/boss.ts

import type { GameObject } from "./player"

export type BossType =
  | "alienMouse"
  | "alienBumblebee"
  | "alienOctopus"
  | "alienMantis"
  | "abductor"
  | "queenXenoHen"
  | "devourer"
  | "theButcher"
  | "voidReaper"
  | "plagueBringer"
  | "ironTyrant"
  | "voidLeviathan"
  | "theHive"
  | "omegaPrime"

export type Boss = GameObject & {
  health: number
  maxHealth: number
  type: BossType
  speed: number
  spawnTimer?: number
  phase?: number

  // queenXenoHen
  shootTimer?: number
  buffRadius?: number

  // devourer / theButcher / alienMouse / voidLeviathan
  chargeDirection?: { x: number; y: number }

  // voidReaper
  combatTimer?: number
  healTimer?: number
  blinkTimer?: number
  reaperShootTimer?: number
  isHealing?: boolean

  // plagueBringer
  auraRadius?: number
  plagueTimer?: number

  // ironTyrant
  armor?: number
  maxArmor?: number
  isArmored?: boolean

  // alienMouse
  attackState?: string
  attackTimer?: number
  attackCooldown?: number
  dashDirX?: number
  dashDirY?: number
  dashIsFeint?: boolean
  burstDashCount?: number

  // voidLeviathan
  leviathanPhase?: "forceField" | "zigzag" | "uroboros"
  leviathanPhaseTimer?: number
  leviathanWhipTimer?: number
  leviathanDashCount?: number
  leviathanHealTimer?: number
  leviathanWaveTimer?: number
  leviathanTrail?: { x: number; y: number }[]
  leviathanHeading?: number
  leviathanBurstTimer?: number
  leviathanTurnTimer?: number
  leviathanWaveCount?: number
  leviathanWaveSequenceTimer?: number

  // theHive
  hivePhase?: 1 | 2 | 3 | 4
  hiveAttackTimer?: number
  hiveAttackChoice?: number
  hiveLordA?: { x: number; y: number; 
    health: number; maxHealth: number; 
    shootTimer: number }
  hiveLordB?: { x: number; y: number;
     health: number; maxHealth: number;
      stunTimer: number; healTimer: number;
       isHealing: boolean }
  hivePhase2Timer?: number
}