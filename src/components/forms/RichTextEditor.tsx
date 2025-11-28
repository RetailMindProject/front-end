import React, { useMemo, useRef, useEffect } from "react";

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  showWordCount?: boolean;
  showToolbar?: boolean;
  className?: string;
  onFocus?: () => void;
}

export default function RichTextEditor({
  label,
  value,
  onChange,
  placeholder = "Write your message here...",
  rows = 7,
  required = false,
  showWordCount = true,
  showToolbar = true,
  className = "",
  onFocus,
}: RichTextEditorProps) {
  const wordCount = useMemo(() => {
    return value.trim().split(/\s+/).filter((word) => word.length > 0).length;
  }, [value]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && onFocus) {
      const handleFocus = () => {
        setTimeout(() => {
          onFocus();
        }, 100);
      };
      textarea.addEventListener("focus", handleFocus);
      return () => textarea.removeEventListener("focus", handleFocus);
    }
  }, [onFocus]);

  return (
    <div>
      <label className="block mb-1 text-sm font-medium text-slate-700">
        {label} {required && "*"}
      </label>

      {showToolbar && (
        <div className="flex items-center gap-1 border border-slate-200 bg-slate-50 rounded-t-xl px-2 py-1">
          <button
            type="button"
            className="text-xs px-2 py-1 rounded hover:bg-slate-200"
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            className="text-xs px-2 py-1 rounded hover:bg-slate-200 italic"
            title="Italic"
          >
            I
          </button>
          <button
            type="button"
            className="text-xs px-2 py-1 rounded hover:bg-slate-200 underline"
            title="Underline"
          >
            U
          </button>
          <span className="mx-1 h-4 w-px bg-slate-200" />
          <button
            type="button"
            className="text-xs px-2 py-1 rounded hover:bg-slate-200"
            title="Bullet List"
          >
            • List
          </button>
          <button
            type="button"
            className="text-xs px-2 py-1 rounded hover:bg-slate-200"
            title="Numbered List"
          >
            1. List
          </button>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        rows={rows}
        required={required}
        placeholder={placeholder}
        className={`w-full ${showToolbar ? "rounded-b-xl" : "rounded-xl"} border border-slate-200 bg-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 ${className}`}
      />

      {showWordCount && (
        <p className="text-[11px] text-slate-400 mt-1 text-right">
          {wordCount} words
        </p>
      )}
    </div>
  );
}

