'use client'

import { useEffect, useRef } from 'react'
import { ResumeRenderer } from './ResumeRenderer'
import { ResumeData } from '@/lib/resume-data'

interface ResumePreviewProps {
  data: ResumeData
  onDownloadPDF?: () => void
}

export function ResumePreview({ data, onDownloadPDF }: ResumePreviewProps) {
  const areaRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const paperRef = useRef<HTMLDivElement>(null)

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

  const handlePreviewPDF = () => {
    window.print()
  }

  return (
    <div ref={areaRef} className="preview-area">
      <div ref={viewportRef} className="paper-viewport">
        <div ref={wrapperRef} className="paper-wrapper">
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

      {onDownloadPDF && (
        <div className="pdf-actions">
          <button className="btn btn-secondary" onClick={handlePreviewPDF}>
            Preview PDF
          </button>
          <button className="btn btn-primary" onClick={onDownloadPDF}>
            Download PDF
          </button>
        </div>
      )}
    </div>
  )
}
