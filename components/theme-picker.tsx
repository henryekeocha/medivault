"use client"

import { useState, useEffect, useRef } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ThemePickerProps {
  theme: string
  setTheme: (theme: string) => void
}

export function ThemePicker({ theme, setTheme }: ThemePickerProps) {
  const [position, setPosition] = useState({ x: 20, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return

      const newX = Math.max(0, Math.min(window.innerWidth - 60, event.clientX - 30))
      const newY = Math.max(0, Math.min(window.innerHeight - 60, event.clientY - 30))

      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  const handleMouseDown = () => {
    setIsDragging(true)
  }

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000,
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onMouseDown={handleMouseDown}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="rounded-full w-12 h-12 shadow-lg"
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
      </Button>
    </div>
  )
}

