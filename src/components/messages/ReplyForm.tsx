import { useState } from "react";
import { Send } from "lucide-react";
import RichTextEditor from "../forms/RichTextEditor";
import FileUpload from "../forms/FileUpload";

interface ReplyFormProps {
  recipientName: string;
  onSubmit: (reply: string, files: File[]) => void;
  onClear?: () => void;
  initialReply?: string;
  className?: string;
}

export default function ReplyForm({
  recipientName,
  onSubmit,
  onClear,
  initialReply = "",
  className = "",
}: ReplyFormProps) {
  const [reply, setReply] = useState(initialReply);
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (newFiles: File[]) => {
    setFiles(newFiles);
  };

  const handleFileRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) {
      alert("Please write a reply message");
      return;
    }
    onSubmit(reply, files);
  };

  const handleClear = () => {
    setReply("");
    setFiles([]);
    onClear?.();
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${className}`}>
      <div className="p-6 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800">Reply to {recipientName}</h3>
        <p className="text-sm text-slate-500 mt-1">
          Send your response to this message
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <RichTextEditor
          label="Your Reply"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Write your reply here..."
          rows={8}
          required
          showWordCount
          showToolbar
        />

        <FileUpload
          files={files}
          onFileChange={handleFileChange}
          onFileRemove={handleFileRemove}
          maxFiles={5}
        />

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm"
          >
            Clear
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600 shadow-sm"
          >
            <Send size={16} />
            Send Reply
          </button>
        </div>
      </form>
    </div>
  );
}

