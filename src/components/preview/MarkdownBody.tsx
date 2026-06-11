import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownBodyProps {
  text: string
}

export function MarkdownBody({ text }: MarkdownBodyProps) {
  if (!text.trim()) return null

  return (
    <div className="paper-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        allowedElements={['p', 'strong', 'em', 'code', 'ul', 'ol', 'li', 'br']}
        unwrapDisallowed
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
