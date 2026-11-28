"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Volume2, VolumeX } from "lucide-react"
import type { GameState } from "@/lib/game/types"

export type GameUIProps = {
  gameState: GameState
  finalScore: number
  finalKillCount: number
  finalWave: number
  soundEnabled: boolean
  isMobile: boolean
  joystickActive: boolean
  joystickPos: { x: number; y: number }
  shootButtonPressed: boolean

  // Callbacks
  onStartGame: () => void
  onRestartGame: () => void
  onToggleSound: () => void
  onInitAudio: () => void

  // Mobile controls
  onJoystickStart: (e: React.TouchEvent) => void
  onJoystickMove: (e: React.TouchEvent) => void
  onJoystickEnd: () => void
  onShootStart: () => void
  onShootEnd: () => void

  // Canvas
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void
  onMouseDown: () => void
  onMouseUp: () => void
  onTouchMove: (e: React.TouchEvent<HTMLCanvasElement>) => void
  onTouchStartCanvas: () => void
  onTouchEndCanvas: () => void
}

export function GameUI(props: GameUIProps) {
  const {
    gameState,
    finalScore,
    finalKillCount,
    finalWave,
    soundEnabled,
    isMobile,
    joystickActive,
    joystickPos,
    shootButtonPressed,
    onStartGame,
    onRestartGame,
    onToggleSound,
    onInitAudio,
    onJoystickStart,
    onJoystickMove,
    onJoystickEnd,
    onShootStart,
    onShootEnd,
    canvasRef,
    onMouseMove,
    onMouseDown,
    onMouseUp,
    onTouchMove,
    onTouchStartCanvas,
    onTouchEndCanvas,
  } = props

  return (
    <div className="relative w-full h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        className="border-2 border-slate-700 rounded-lg shadow-2xl"
        onMouseMove={onMouseMove}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchStart={onTouchStartCanvas}
        onTouchEnd={onTouchEndCanvas}
      />

      {/* Start Menu */}
      {gameState === "menu" && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm transition-opacity duration-500 z-20">
          <div className="text-center space-y-6 px-4">
            <h1 className="text-6xl font-bold text-yellow-400 drop-shadow-lg animate-pulse">
              Chicken vs Aliens
            </h1>
            <p className="text-xl text-gray-300 max-w-md mx-auto">
              Survive as long as possible against the alien invasion!
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <p>WASD or Arrow Keys to move</p>
              <p>Mouse or Touch to aim and shoot</p>
              <p>SPACE for Caca-Doo stun</p>
              <p>Q for Charge</p>
            </div>
            <button
              onClick={onStartGame}
              className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xl rounded-lg shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Play
            </button>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState === "gameOver" && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm transition-opacity duration-500 z-20">
          <div className="text-center space-y-6 px-4">
            <h2 className="text-5xl font-bold text-red-500 drop-shadow-lg">Game Over</h2>
            <div className="space-y-3 text-2xl text-white">
              <p className="text-3xl font-bold text-yellow-400">
                Survival Time:{" "}
                {Math.floor(finalScore / 60 / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(Math.floor(finalScore / 60) % 60).toString().padStart(2, "0")}
              </p>
              <p className="text-2xl text-green-400">Total Kills: {finalKillCount}</p>
              <p className="text-xl text-gray-400">Waves Survived: {finalWave}</p>
            </div>
            <button
              onClick={onRestartGame}
              className="px-8 py-4 bg-green-500 hover:bg-green-400 text-black font-bold text-xl rounded-lg shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Restart
            </button>
          </div>
        </div>
      )}

      {/* Sound Toggle */}
      <Button
        onClick={() => {
          onInitAudio()
          onToggleSound()
        }}
        size="icon"
        variant="secondary"
        className="absolute right-2 top-2 bg-purple-900/80 hover:bg-purple-800 z-30"
      >
        {soundEnabled ? <Volume2 /> : <VolumeX />}
      </Button>

      {/* Mobile Controls */}
      {isMobile && gameState === "playing" && (
        <>
          {/* Joystick  */}
          <div
            className="absolute bottom-6 left-6 flex h-32 w-32 items-center justify-center rounded-full border-2 border-white/20 bg-white/5 backdrop-blur-sm select-none touch-none z-10"
            onTouchStart={onJoystickStart}
            onTouchMove={onJoystickMove}
            onTouchEnd={onJoystickEnd}
          >
            <div
              className="h-14 w-14 rounded-full border-2 border-white/40 bg-white/30 shadow-lg"
              style={{
                transform: `translate(${joystickPos.x * 40}px, ${joystickPos.y * 40}px)`,
              }}
            />
          </div>

          {/* Shoot Button */}
          <button
            className="absolute bottom-6 right-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-red-300/60 bg-gradient-to-br from-red-500/60 to-red-700/60 text-4xl shadow-lg backdrop-blur-sm active:from-red-600/80 active:to-red-800/80 active:shadow-xl select-none touch-none z-10"
            onTouchStart={(e) => {
              e.preventDefault()
              onShootStart()
            }}
            onTouchEnd={(e) => {
              e.preventDefault()
              onShootEnd()
            }}
          >
            🥚
          </button>
        </>
      )}
    </div>
  )
}