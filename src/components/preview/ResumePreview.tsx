'use client'

import { useEffect, useRef } from 'react'
import { ResumeRenderer } from './ResumeRenderer'
import { ResumeData } from '@/lib/resume-data'
import { layoutToCSSVariables } from '@/lib/layout-config'

interface ResumePreviewProps {
  data: ResumeData
}

export function ResumePreview({ data }: ResumePreviewProps) {
  const areaRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)

  const layout = data.meta.layout

  useEffect(() => {
    function scalePaper() {
      const area = areaRef.current
      const viewport = viewportRef.current
      const wrapper = wrapperRef.current
      const paper = paperRef.current
      if (!area || !viewport || !wrapper || !paper) return

      const scale = Math.min((area.clientWidth - 48) / paper.offsetWidth, 1)
      const finalScale = Math.max(scale, 0.55)

      const scaledW = paper.offsetWidth * finalScale
      const scaledH = paper.offsetHeight * finalScale

      viewport.style.width = `${scaledW}px`
      viewport.style.height = `${scaledH}px`
      wrapper.style.transform = `scale(${finalScale})`
    }

    scalePaper()

    window.addEventListener('resize', scalePaper)

    const ro = new ResizeObserver(scalePaper)
    if (areaRef.current) ro.observe(areaRef.current)

    return () => {
      window.removeEventListener('resize', scalePaper)
      ro.disconnect()
    }
  }, [data])

  const cssVars = layoutToCSSVariables(layout)
  const paperStyle: React.CSSProperties = {
    ...cssVars,
    padding: `${layout.marginTop}mm ${layout.marginRight}mm ${layout.marginBottom}mm ${layout.marginLeft}mm`,
  }

  return (
    <main ref={areaRef} aria-label="Resume preview" className="preview-area">
      <div ref={viewportRef} className="paper-viewport">
        <div ref={wrapperRef} className="paper-wrapper">
          <div
            ref={paperRef}
            className={`paper theme-${data.meta.activeStyle}`}
            style={paperStyle}
          >
            <ResumeRenderer data={data} />
          </div>
        </div>
      </div>
    </main>
  )
}
