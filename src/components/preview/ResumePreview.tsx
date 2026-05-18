'use client'

import { useEffect, useRef } from 'react'
import { ResumeRenderer } from './ResumeRenderer'
import { ResumeData } from '@/lib/resume-data'

interface ResumePreviewProps {
  data: ResumeData
}

export function ResumePreview({ data }: ResumePreviewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function scalePaper() {
      const wrapper = wrapperRef.current
      const area = areaRef.current
      const paper = paperRef.current
      if (!wrapper || !area || !paper) return

      const scale = Math.min(
        (area.clientWidth - 48) / paper.offsetWidth,
        (area.clientHeight - 48) / paper.offsetHeight,
        1
      )
      const finalScale = Math.max(scale, 0.55)

      const scaledW = paper.offsetWidth * finalScale
      const scaledH = paper.offsetHeight * finalScale

      wrapper.style.transform = `scale(${finalScale})`
      wrapper.style.left = `${(area.clientWidth - scaledW) / 2}px`
      wrapper.style.top = `${(area.clientHeight - scaledH) / 2}px`
    }

    scalePaper()
    window.addEventListener('resize', scalePaper)
    return () => window.removeEventListener('resize', scalePaper)
  }, [data])

  return (
    <div ref={areaRef} className="relative flex-1 bg-[#080a0f] overflow-hidden">
      <div
        ref={wrapperRef}
        className="absolute origin-top-left transition-transform duration-300"
      >
        <div
          ref={paperRef}
          className={`paper theme-${data.meta.activeStyle}`}
          style={{
            width: '210mm',
            minHeight: '297mm',
            background: '#faf8f5',
            padding: '15mm 20mm',
            color: '#1a1a1a',
            fontSize: '10.5pt',
            lineHeight: 1.45,
            boxShadow: '0 2px 8px rgba(0,0,0,0.5), 0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          <ResumeRenderer data={data} />
        </div>
      </div>
    </div>
  )
}
