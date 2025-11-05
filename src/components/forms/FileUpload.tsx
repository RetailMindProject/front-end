import React from "react";
import { Paperclip, X } from "lucide-react";

interface FileUploadProps {
  files: File[];
  onFileChange: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  maxFiles?: number;
  allowedTypes?: string;
  className?: string;
}

export default function FileUpload({
  files,
  onFileChange,
  onFileRemove,
  maxFiles = 5,
  allowedTypes,
  className = "",
}: FileUploadProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }
    onFileChange([...files, ...selectedFiles]);
  };

  return (
    <div className={className}>
      <label className="block mb-1 text-sm font-medium text-slate-700">
        Attach files
      </label>
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-sm rounded-xl cursor-pointer border border-dashed border-slate-300">
          <Paperclip size={16} />
          <span>Add new file</span>
          <input
            type="file"
            className="hidden"
            multiple
            accept={allowedTypes}
            onChange={handleFileChange}
          />
        </label>
        <p className="text-xs text-slate-400">
          Allowed: PDF, Excel, Images (max {maxFiles} files)
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-100"
            >
              <span className="text-sm text-slate-700">{file.name}</span>
              <button
                type="button"
                onClick={() => onFileRemove(index)}
                className="text-slate-400 hover:text-red-500"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

