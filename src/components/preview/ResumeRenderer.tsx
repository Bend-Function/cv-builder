import { ResumeData } from '@/lib/resume-data'
import { StandardLayout } from './layouts/StandardLayout'
import { FunctionalLayout } from './layouts/FunctionalLayout'

export function ResumeRenderer({ data }: { data: ResumeData }) {
  if (data.meta.activeStyle === 'functional') {
    return <FunctionalLayout data={data} />
  }
  return <StandardLayout data={data} />
}
