import { NextRequest, NextResponse } from 'next/server'
import { generatePDF } from '@/lib/pdf-generator'
import { isValidResumeData } from '@/lib/validate'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!isValidResumeData(body)) {
      return NextResponse.json({ error: 'Invalid resume data' }, { status: 400 })
    }

    const pdf = await generatePDF(body)

    return new NextResponse(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="resume.pdf"',
      },
    })
  } catch (error) {
    console.error('PDF generation failed:', error)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }
}
