

import type { Boss, BossType, Player } from "@/lib/game/types"
import type { BossContext } from "@/lib/game/context"

export type BossStats = {
  health: number
  radius: number
  speed: number
}

// The contract every boss must fulfill
// Every boss must have a behavior that implements this interface
//  The behavior is responsible for creating the boss, updating it, and drawing it
export interface BossBehavior {

  readonly type: BossType


  getStats(): BossStats


  create(canvasWidth: number, canvasHeight: number): Boss

 
  update(boss: Boss, ctx: BossContext): void


  draw(
    ctx: CanvasRenderingContext2D,
    boss: Boss,
    bossTime: number,
    player: Player,
  ): void
}