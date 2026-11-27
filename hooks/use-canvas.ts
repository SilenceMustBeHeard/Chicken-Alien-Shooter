
import { useEffect, type RefObject } from "react"

// resizes the canvas to fit its parent while maintaining 
// a 3:2 aspect ratio, and ensures the player stays within bounds

export function useCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  playerRef: RefObject<{ x: number; y: number; radius: number } | null>,
) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const rect = parent.getBoundingClientRect()

      const maxW = 1200
      const maxH = 800
      const aspect = maxW / maxH

      let w = rect.width
      let h = rect.height

      if (w / h > aspect) {
        w = h * aspect
      } else {
        h = w / aspect
      }

      canvas.width = Math.floor(w)
      canvas.height = Math.floor(h)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      canvas.style.position = "absolute"
      canvas.style.left = `${(rect.width - w) / 2}px`
      canvas.style.top = `${(rect.height - h) / 2}px`

      const player = playerRef.current
      if (player) {
        player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x))
        player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y))
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [canvasRef, playerRef])
}