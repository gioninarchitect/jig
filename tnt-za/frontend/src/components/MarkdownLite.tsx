import { Fragment } from 'react';

// =====================================================================
// MarkdownLite — minimal, no-dependency markdown renderer
//
// Handles:
//   ## Heading → small caps section heading
//   **bold**   → semibold
//   *italic*   → italic
//   - bullet   → bullet list
//   `code`     → mono span
// Plain paragraphs separated by blank lines.
//
// Tuned for the Owner Concierge brief and SMF Composer drafts.
// Not a general-purpose renderer — covers what those two emit.
// =====================================================================

function inlineFormat(line: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  // Tokenise on **bold**, *italic*, `code`
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) parts.push(line.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) parts.push(<strong key={i++} className="text-white font-semibold">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) parts.push(<span key={i++} className="font-mono text-xs px-1 py-0.5 rounded bg-white/[0.06] text-amber-200">{tok.slice(1, -1)}</span>);
    else parts.push(<em key={i++} className="text-white/60 italic">{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts;
}

export default function MarkdownLite({ text, className = '' }: { text: string; className?: string }) {
  const lines = text.split('\n');
  const blocks: JSX.Element[] = [];
  let bulletBuffer: string[] = [];
  let key = 0;

  function flushBullets() {
    if (bulletBuffer.length === 0) return;
    blocks.push(
      <ul key={key++} className="list-disc list-inside space-y-0.5 my-1.5 text-sm text-white/75">
        {bulletBuffer.map((b, i) => <li key={i}>{inlineFormat(b)}</li>)}
      </ul>,
    );
    bulletBuffer = [];
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushBullets(); continue; }

    if (line.startsWith('## ')) {
      flushBullets();
      blocks.push(
        <h3 key={key++} className="text-[10px] tracking-[0.18em] uppercase text-primary font-bold mt-4 mb-1.5 first:mt-0">
          {inlineFormat(line.slice(3))}
        </h3>,
      );
    } else if (line.startsWith('# ')) {
      flushBullets();
      blocks.push(<h2 key={key++} className="text-base font-bold text-white mt-3 mb-1">{inlineFormat(line.slice(2))}</h2>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      bulletBuffer.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      flushBullets();
      blocks.push(
        <p key={key++} className="text-sm text-white/75 my-1 leading-relaxed">
          <span className="text-primary font-semibold mr-1.5">{line.match(/^\d+\./)?.[0]}</span>
          {inlineFormat(line.replace(/^\d+\.\s/, ''))}
        </p>,
      );
    } else {
      flushBullets();
      blocks.push(
        <p key={key++} className="text-sm text-white/75 my-1.5 leading-relaxed">
          {inlineFormat(line)}
        </p>,
      );
    }
  }
  flushBullets();

  return <div className={className}>{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}
