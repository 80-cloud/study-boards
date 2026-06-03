import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';

// マークダウン描画（コード批評の読みやすさ向上）。
// 生 HTML は描画しない（react-markdown 既定で無効・rehype-raw 不使用）→ XSS 面を増やさない。
// rehype-sanitize で多層防御（セキュリティ）。要素は Tailwind で明示スタイル（typography プラグイン非依存）。
const COMPONENTS = {
  p: ({ children }) => <p className="mb-2 whitespace-pre-wrap last:mb-0">{children}</p>,
  h1: ({ children }) => <h1 className="mb-2 mt-3 text-base font-bold text-gray-800">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-3 text-base font-bold text-gray-800">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-bold text-gray-800">{children}</h3>,
  ul: ({ children }) => <ul className="mb-2 list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal pl-5">{children}</ol>,
  li: ({ children }) => <li className="mb-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-4 border-gray-300 pl-3 text-gray-600">{children}</blockquote>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-800">{children}</a>
  ),
  // インラインコードとコードブロックを区別（pre 配下が block）。
  code: ({ inline, className, children }) =>
    inline ? (
      <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em] text-pink-700">{children}</code>
    ) : (
      <code className={`font-mono text-xs ${className ?? ''}`}>{children}</code>
    ),
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded bg-gray-900 p-3 text-xs text-gray-100">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-gray-300 bg-gray-50 px-2 py-1 text-left">{children}</th>,
  td: ({ children }) => <td className="border border-gray-200 px-2 py-1">{children}</td>,
};

export default function MarkdownText({ children, className = '' }) {
  if (!children) return null;
  return (
    <div className={`text-sm text-gray-700 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
