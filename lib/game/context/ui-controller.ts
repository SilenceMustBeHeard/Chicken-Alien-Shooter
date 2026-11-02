
import type { GameState } from "@/lib/game/types"

export interface UIController {

 // Update the game state 
  setGameState(state: GameState): void

// Update the score
  setScore(score: number): void

  // Update kill count
  setKillCount(count: number): void

// Update wave number
  setFinalStats(score: number, killCount: number, wave: number): void

// Get the current game state
  getGameState(): GameState
}