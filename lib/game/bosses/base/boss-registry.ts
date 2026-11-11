

import type { BossType } from "@/lib/game/types"
import type { BossBehavior } from "./boss-behavior"

import { alienMouseBehavior } from "../alien-mouse"
import { alienBumblebeeBehavior } from "../alien-bumblebee"
import { alienOctopusBehavior } from "../alien-octopus"
import { alienMantisBehavior } from "../alien-mantis"
import { abductorBehavior } from "../abductor"
import { queenXenoHenBehavior } from "../queen-xeno-hen"
import { devourerBehavior } from "../devourer"
import { theButcherBehavior } from "../the-butcher"

// Registry of all bosses in the game
// Each boss is registered with its behavior
//  which defines how it behaves in the game
export const BOSS_REGISTRY: Record<BossType, BossBehavior> = {
  alienMouse: alienMouseBehavior,
  alienBumblebee: alienBumblebeeBehavior,
  alienOctopus: alienOctopusBehavior,    
  alienMantis: alienMantisBehavior,     
  abductor: abductorBehavior,        
 queenXenoHen: queenXenoHenBehavior,    
  devourer: devourerBehavior,        
  theButcher: theButcherBehavior,     
  voidReaper: alienMouseBehavior,      
  plagueBringer: alienMouseBehavior,   
  ironTyrant: alienMouseBehavior,      
  voidLeviathan: alienMouseBehavior,   
  theHive: alienMouseBehavior,        
  omegaPrime: alienMouseBehavior,      
}

export function getBossBehavior(type: BossType): BossBehavior {
  return BOSS_REGISTRY[type]
}