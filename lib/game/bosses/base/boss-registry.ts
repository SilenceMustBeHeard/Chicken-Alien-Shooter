

import type { BossType } from "@/lib/game/types"
import type { BossBehavior } from "./boss-behavior"

import { alienMouseBehavior } from "../alien-mouse"
import { alienBumblebeeBehavior } from "../alien-bumblebee"
import { alienOctopusBehavior } from "../alien-octopus"

// Registry of all bosses in the game
// Each boss is registered with its behavior
//  which defines how it behaves in the game
export const BOSS_REGISTRY: Record<BossType, BossBehavior> = {
  alienMouse: alienMouseBehavior,
  alienBumblebee: alienBumblebeeBehavior,
  alienOctopus: alienOctopusBehavior,    // placeholder
  alienMantis: alienMouseBehavior,     // placeholder
  abductor: alienMouseBehavior,        // placeholder
  queenXenoHen: alienMouseBehavior,    // placeholder
  devourer: alienMouseBehavior,        // placeholder
  theButcher: alienMouseBehavior,      // placeholder
  voidReaper: alienMouseBehavior,      // placeholder
  plagueBringer: alienMouseBehavior,   // placeholder
  ironTyrant: alienMouseBehavior,      // placeholder
  voidLeviathan: alienMouseBehavior,   // placeholder
  theHive: alienMouseBehavior,         // placeholder
  omegaPrime: alienMouseBehavior,      // placeholder
}

export function getBossBehavior(type: BossType): BossBehavior {
  return BOSS_REGISTRY[type]
}