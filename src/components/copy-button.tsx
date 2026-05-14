"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Small icon button that copies text to the clipboard. */
export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      className={`p-1.5 rounded-md transition-colors shrink-0 ${
        copied
          ? "text-green-400"
          : "text-surface-500 hover:text-white"
      } ${className || ""}`}
      title="Copy link"
    >
      {copied ? <Check className="w-3.5 h-3.5" strokeWidth={2} /> : <Copy className="w-3.5 h-3.5" strokeWidth={2} />}
    </button>
  );
}
