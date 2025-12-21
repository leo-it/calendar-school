import { readFile } from 'fs/promises'
import { join } from 'path'
import ReactMarkdown from 'react-markdown'

export default async function ReadmePage() {
  // Leer el archivo README.md
  const filePath = join(process.cwd(), 'README.md')
  let content = ''
  try {
    content = await readFile(filePath, 'utf-8')
  } catch (error) {
    // Si el archivo no existe (por ejemplo, en Docker build), usar contenido por defecto
    content = '# Almanaque de Clases\n\nDocumentación no disponible en este momento.'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8 prose prose-lg max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-4xl font-bold text-gray-900 mb-6 mt-8 first:mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-3xl font-semibold text-gray-800 mb-4 mt-6">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-2xl font-semibold text-gray-700 mb-3 mt-4">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-gray-700 mb-4 leading-relaxed">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="ml-4">{children}</li>
              ),
              code: ({ children, className }) => {
                const isInline = !className
                return isInline ? (
                  <code className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                ) : (
                  <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4 font-mono text-sm">
                    {children}
                  </code>
                )
              },
              pre: ({ children }) => (
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
                  {children}
                </pre>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-primary-600 hover:text-primary-700 underline"
                  target={href?.startsWith('http') ? '_blank' : undefined}
                  rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary-500 pl-4 italic text-gray-600 my-4">
                  {children}
                </blockquote>
              ),
              hr: () => <hr className="my-8 border-gray-300" />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

