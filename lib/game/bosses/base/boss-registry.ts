

import type { BossType } from "@/lib/game/types"
import type { BossBehavior } from "./boss-behavior"

import { alienMouseBehavior } from "../alien-mouse"

// Registry of all bosses in the game
// Each boss is registered with its behavior
//  which defines how it behaves in the game
export const BOSS_REGISTRY: Record<BossType, BossBehavior> = {
  alienMouse: alienMouseBehavior,
  // TODO: add remaining 13 bosses
  alienBumblebee: alienMouseBehavior,  // placeholder
  alienOctopus: alienMouseBehavior,    // placeholder
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