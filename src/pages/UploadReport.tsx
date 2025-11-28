import { useState, useEffect } from "react";
import { Send, Upload, Mail } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import FormInput from "../components/forms/FormInput";
import FormSelect from "../components/forms/FormSelect";
import RichTextEditor from "../components/forms/RichTextEditor";
import FileUpload from "../components/forms/FileUpload";
import { messagesApi } from "../services/messages.api";

type RecipientOption = { value: string; label: string; userId?: number; role?: string };

type UploadReportProps = {
  recipients?: RecipientOption[];
};

export default function UploadReport({ recipients }: UploadReportProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [availableRecipients, setAvailableRecipients] = useState<RecipientOption[]>([]);

  const isCompose = pathname.includes("/compose");
  const pageTitle = isCompose ? "Compose Message" : "Upload Report";
  const pageDescription = isCompose 
    ? "Send a message to your team members" 
    : "Send report / note to management";
  const buttonText = isCompose ? "Send Message" : "Send Report";

  useEffect(() => {
    const loadRecipients = async () => {
      setLoadingRecipients(true);
      setError("");
      
      try {
        const result = await messagesApi.getAvailableRecipients();
        
        if (result.error) {
          console.error("Failed to load recipients:", result.error);
          setError(`Failed to load recipients: ${result.error}. Please refresh the page.`);
          if (recipients && recipients.length > 0) {
            const fallbackRecipients = recipients.map(recipient => ({
              ...recipient,
              userId: undefined,
              role: recipient.value,
            }));
            setAvailableRecipients(fallbackRecipients);
          }
        } else if (result.data && result.data.length > 0) {
          const recipientList = result.data.map(user => ({
            value: user.id.toString(),
            label: `${user.name} (${user.role})`,
            userId: user.id,
            role: user.role,
          }));
          setAvailableRecipients(recipientList);
          setError("");
        } else {
          setError("No recipients available. Please contact support.");
          if (recipients && recipients.length > 0) {
            const fallbackRecipients = recipients.map(recipient => ({
              ...recipient,
              userId: undefined,
              role: recipient.value,
            }));
            setAvailableRecipients(fallbackRecipients);
          }
        }
      } catch (err) {
        console.error("Error loading recipients:", err);
        setError(`Error loading recipients: ${err instanceof Error ? err.message : "Unknown error"}`);
      } finally {
        setLoadingRecipients(false);
      }
    };

    loadRecipients();
  }, [recipients]);

  const handleFileChange = (newFiles: File[]) => {
    setFiles(newFiles);
  };

  const handleFileRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);

    try {
      if (!to) {
        setError("Please select a recipient");
        setSending(false);
        return;
      }

      const selectedRecipient = availableRecipients.find(r => r.value === to);
      
      if (!selectedRecipient) {
        setError("Please select a valid recipient from the list");
        setSending(false);
        return;
      }

      if (!selectedRecipient.userId) {
        setError("Recipients list is not loaded properly. Please refresh the page to reload recipients.");
        setSending(false);
        return;
      }

      const request: {
        title: string;
        body: string;
        files?: File[];
        toUserId: number;
      } = {
        title: subject,
        body: message,
        toUserId: selectedRecipient.userId,
      };

      if (files.length > 0) {
        request.files = files;
      }

      const result = await messagesApi.sendMessage(request);

      if (result.error) {
        setError(result.error);
        setSending(false);
        return;
      }

      const basePath = pathname.split("/").slice(0, 2).join("/");
      navigate(`${basePath}/outbox`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setSending(false);
    }
  };

  const handleClear = () => {
    setTo("");
    setSubject("");
    setMessage("");
    setFiles([]);
  };

  return (
    <div className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="border-b border-indigo-200/50 bg-white/60 backdrop-blur-sm shadow-sm rounded-2xl px-6 py-4 mb-6">
            <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 -mx-6 mb-4 rounded-t-2xl"></div>
            
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg ring-2 ring-white/20">
                {isCompose ? (
                  <Mail className="h-6 w-6 text-white" />
                ) : (
                  <Upload className="h-6 w-6 text-white" />
                )}
              </div>
              
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {pageTitle}
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  {pageDescription}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <FormSelect
              label="To"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              options={availableRecipients}
              placeholder={loadingRecipients ? "Loading recipients..." : availableRecipients.length > 0 ? "Select recipient" : "No recipients available"}
              required
              hint={loadingRecipients ? "Loading available recipients..." : availableRecipients.length > 0 ? "Choose the recipient of this report" : "No recipients available. Please refresh the page."}
            />
            
            {loadingRecipients && (
              <div className="text-sm text-blue-600">Loading recipients...</div>
            )}
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

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
                disabled={sending || loadingRecipients || availableRecipients.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 shadow-sm transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
                {sending ? "Sending..." : buttonText}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


