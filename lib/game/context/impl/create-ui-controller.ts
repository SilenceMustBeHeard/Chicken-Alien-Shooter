
import type { GameState } from "@/lib/game/types"
import type { UIController } from "../ui-controller"

type UIControllerOptions = {
  setGameState: (state: GameState) => void
  setScore: (score: number) => void
  setKillCount: (count: number) => void
  setFinalScore: (score: number) => void
  setFinalKillCount: (count: number) => void
  setFinalWave: (wave: number) => void
  gameStateRef: React.RefObject<GameState>
}

export function createUIController(options: UIControllerOptions): UIController {
  return {
    setGameState(state) {
      options.gameStateRef.current = state
      options.setGameState(state)
    },

    setScore(score) {
      options.setScore(score)
    },

    setKillCount(count) {
      options.setKillCount(count)
    },

    setFinalStats(score, killCount, wave) {
      options.setFinalScore(score)
      options.setFinalKillCount(killCount)
      options.setFinalWave(wave)
    },

    getGameState() {
      return options.gameStateRef.current
    },
  }
}