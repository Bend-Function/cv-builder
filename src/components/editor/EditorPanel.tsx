'use client'

import { useRef, useEffect, useCallback, ReactNode } from 'react'

interface EditorPanelProps {
  children: ReactNode
}

export function EditorPanel({ children }: EditorPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handleMouseDown = useCallback(() => {
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !panelRef.current) return
      const workspace = panelRef.current.parentElement
      if (!workspace) return
      const rect = workspace.getBoundingClientRect()
      const newWidth = e.clientX - rect.left
      const clamped = Math.max(280, Math.min(window.innerWidth / 2, newWidth))
      panelRef.current.style.width = `${clamped}px`
    }

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <>
      <div
        ref={panelRef}
        className="flex flex-col border-r border-border-panel bg-workspace overflow-hidden shrink-0"
        style={{ width: 380 }}
      >
        <div className="px-6 py-4 border-b border-border-panel">
          <h2 className="font-serif text-sm font-medium text-text-secondary uppercase tracking-widest">
            Editor
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 pb-12">{children}</div>
      </div>
      <div
        className="w-[6px] bg-transparent cursor-col-resize relative z-10 -ml-[3px] -mr-[3px] group"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-8 rounded bg-border-subtle group-hover:bg-accent transition-colors" />
      </div>
    </>
  )
}
