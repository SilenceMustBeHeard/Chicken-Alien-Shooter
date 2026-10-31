// lib/game/types/powerup.ts

import type { GameObject } from "./player"

export type PowerUpType =
  | "doubleYolk"
  | "scrambled"
  | "hardBoiled"
  | "explosive"
  | "golden"
  | "shield"
  | "health"
  | "speedBoost"
  | "charge"

export type PowerUp = GameObject & {
  type: PowerUpType
  lifetime: number
}