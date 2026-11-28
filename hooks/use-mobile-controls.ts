
import { useEffect, useState } from "react"


 // Detects mobile, manages fullscreen, orientation lock, and virtual joystick state.

export function useMobileControls() {
  const [isMobile, setIsMobile] = useState(false)
  const [joystickActive, setJoystickActive] = useState(false)
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 })
  const [shootButtonPressed, setShootButtonPressed] = useState(false)
  const [orientationWarning, setOrientationWarning] = useState(false)

  // Detect mobile
  useEffect(() => {
    setIsMobile("ontouchstart" in window)
  }, [])

  // Fullscreen + orientation lock on game start
  useEffect(() => {
    if (!isMobile) return

    const requestFullscreen = async () => {
      try {
        const elem = document.documentElement
        if (elem.requestFullscreen) {
          await elem.requestFullscreen()
        } else if ((elem as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (elem as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen()
        }
      } catch {
        // ignore
      }
    }

    const lockOrientation = async () => {
      try {
        const screenOrientation = screen.orientation as unknown as {
          lock?: (orientation: string) => Promise<void>
        }
        if (screenOrientation.lock) {
          await screenOrientation.lock("landscape")
        }
      } catch {
        // Not supported — fallback to warning
      }
    }

    // Check orientation
    const checkOrientation = () => {
      setOrientationWarning(window.innerHeight > window.innerWidth)
    }

    checkOrientation()
    window.addEventListener("resize", checkOrientation)
    window.addEventListener("orientationchange", checkOrientation)

    return () => {
      window.removeEventListener("resize", checkOrientation)
      window.removeEventListener("orientationchange", checkOrientation)
    }
  }, [isMobile])

  const handleJoystickStart = (e: React.TouchEvent) => {
    e.preventDefault()
    setJoystickActive(true)
  }

  const handleJoystickMove = (e: React.TouchEvent) => {
    if (!joystickActive) return
    e.preventDefault()

    const touch = e.touches[0]
    const joystick = e.currentTarget as HTMLElement
    const rect = joystick.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const dx = touch.clientX - centerX
    const dy = touch.clientY - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const maxDistance = 50

    if (distance > 0) {
      const normalized = Math.min(distance, maxDistance) / maxDistance
      setJoystickPos({
        x: (dx / distance) * normalized,
        y: (dy / distance) * normalized,
      })
    }
  }

  const handleJoystickEnd = () => {
    setJoystickActive(false)
    setJoystickPos({ x: 0, y: 0 })
  }

  const handleShootStart = () => {
    setShootButtonPressed(true)
  }

  const handleShootEnd = () => {
    setShootButtonPressed(false)
  }

  return {
    isMobile,
    joystickActive,
    joystickPos,
    shootButtonPressed,
    orientationWarning,
    handleJoystickStart,
    handleJoystickMove,
    handleJoystickEnd,
    handleShootStart,
    handleShootEnd,
  }
}