
import { useEffect, useRef, type RefObject } from "react"

export type GameLoopFn = ((currentTime: number) => void) & { lastTime?: number }

export type UseGameLoopOptions = {
  canvasRef: RefObject<HTMLCanvasElement | null>
  gameStateRef: RefObject<string>
  animationIdRef: RefObject<number | null>
  update: (canvas: HTMLCanvasElement, deltaTime: number) => void
  draw: (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void
}

export function useGameLoop(options: UseGameLoopOptions) {
  const gameLoopRef = useRef<GameLoopFn | null>(null)

  const gameLoop: GameLoopFn = (currentTime: number) => {
    const canvas = options.canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    if (options.gameStateRef.current === "playing") {
      const rawDeltaTime = currentTime - (gameLoop.lastTime ?? 0) || 16
      const deltaTime = Math.min(Math.max(rawDeltaTime, 1), 34)
      options.update(canvas, deltaTime)
      options.draw(ctx, canvas)
      gameLoop.lastTime = currentTime
    }

    options.animationIdRef.current = requestAnimationFrame(gameLoop)
  }

  // Store gameLoop in ref (for startGame)
  useEffect(() => {
    gameLoopRef.current = gameLoop
  }, [gameLoop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (options.animationIdRef.current) {
        cancelAnimationFrame(options.animationIdRef.current)
      }
    }
  }, [options.animationIdRef])

  return {
    gameLoopRef,
  }
}