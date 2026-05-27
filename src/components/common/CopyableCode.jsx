import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard, cn } from '@/lib/utils';

/**
 * Inline copyable code chip.
 * Shows the code as monospace text with a copy icon that appears on hover.
 * Clicking copies to clipboard and briefly shows a checkmark.
 */
export default function CopyableCode({ code, className }) {
  const [copied, setCopied] = useState(false);

  if (!code) return null;

  async function handleCopy(e) {
    e.stopPropagation();
    await copyToClipboard(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy code"
      className={cn(
        'group inline-flex items-center gap-1 font-mono text-xs text-muted-foreground',
        'hover:text-foreground transition-colors',
        className,
      )}
    >
      <span>{code}</span>
      {copied
        ? <Check className="h-3 w-3 text-emerald-500 shrink-0" />
        : <Copy className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      }
    </button>
  );
}
