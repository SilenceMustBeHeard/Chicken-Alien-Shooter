// hooks/use-game-loop.ts

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
  const { canvasRef, gameStateRef, animationIdRef, update, draw } = options

  const gameLoopRef = useRef<GameLoopFn | null>(null)

  const gameLoop: GameLoopFn = (currentTime: number) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    if (gameStateRef.current === "playing") {
      const rawDeltaTime = currentTime - (gameLoop.lastTime ?? 0) || 16
      const deltaTime = Math.min(Math.max(rawDeltaTime, 1), 34)
      update(canvas, deltaTime)
      draw(ctx, canvas)
      gameLoop.lastTime = currentTime
    }

    animationIdRef.current = requestAnimationFrame(gameLoop)
  }

  // Store gameLoop in ref (for startGame)
  useEffect(() => {
    gameLoopRef.current = gameLoop
  }, [gameLoop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current)
      }
    }
  }, [animationIdRef])

  return {
    gameLoopRef,
  }
}