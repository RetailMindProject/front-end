import { useState } from "react";
import { Send } from "lucide-react";
import FormInput from "../components/forms/FormInput";
import FormSelect from "../components/forms/FormSelect";
import RichTextEditor from "../components/forms/RichTextEditor";
import FileUpload from "../components/forms/FileUpload";

type RecipientOption = { value: string; label: string };

type UploadReportProps = {
  recipients?: RecipientOption[];
};

export default function UploadReport({ recipients }: UploadReportProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const recipientOptions: RecipientOption[] =
    recipients ?? [
      { value: "inventory_manager", label: "Inventory Manager" },
      { value: "ceo", label: "CEO" },
    ];

  const handleFileChange = (newFiles: File[]) => {
    setFiles(newFiles);
  };

  const handleFileRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ to, subject, message, files });
    // Mock: Show success message
    alert("Report sent successfully! (Mock - no backend)");
  };

  const handleClear = () => {
    setTo("");
    setSubject("");
    setMessage("");
    setFiles([]);
  };

  return (
    <div className="flex-1 bg-[#e9f0ff] min-h-screen">
      <div className="px-6 pt-6">
        <h1 className="text-2xl font-semibold text-slate-800">Upload Report</h1>
        <p className="text-slate-500 text-sm">
          Send report / note to management (mock view – no backend)
        </p>
      </div>

      <div className="px-6 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <FormSelect
              label="To"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              options={recipientOptions}
              placeholder="Select recipient"
              required
              hint="Choose the recipient of this report"
            />

            <FormInput
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Daily store sales report – 2025-11-02"
              required
            />

            <RichTextEditor
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your report / notes here..."
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
                Send Report
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


