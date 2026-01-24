import { useEffect, useState } from "react";
import { Mail, Send } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import FormInput from "../components/forms/FormInput";
import FormSelect from "../components/forms/FormSelect";
import RichTextEditor from "../components/forms/RichTextEditor";
import FileUpload from "../components/forms/FileUpload";
import { messagesApi } from "../services/messages.api";
import PageHeader from "../components/PageHeader";

type RecipientOption = { value: string; label: string; userId?: number; role?: string };

export default function ComposeMessagePage({ recipients }: { recipients?: RecipientOption[] }) {
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

  useEffect(() => {
    const loadRecipients = async () => {
      setLoadingRecipients(true);
      setError("");

      try {
        const result = await messagesApi.getAvailableRecipients();
        if (result.error) {
          if (recipients && recipients.length > 0) {
            setAvailableRecipients(
              recipients.map((recipient) => ({
                ...recipient,
                userId: undefined,
                role: recipient.value,
              }))
            );
          }
          setError(result.error);
          return;
        }

        if (result.data && result.data.length > 0) {
          setAvailableRecipients(
            result.data.map((user) => ({
              value: user.id.toString(),
              label: `${user.name} (${user.role})`,
              userId: user.id,
              role: user.role,
            }))
          );
          return;
        }

        if (recipients && recipients.length > 0) {
          setAvailableRecipients(
            recipients.map((recipient) => ({
              ...recipient,
              userId: undefined,
              role: recipient.value,
            }))
          );
        }
        setError("No recipients available.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load recipients");
      } finally {
        setLoadingRecipients(false);
      }
    };

    loadRecipients();
  }, [recipients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);

    try {
      if (!to) {
        setError("Please select a recipient");
        return;
      }

      const selectedRecipient = availableRecipients.find((r) => r.value === to);
      if (!selectedRecipient) {
        setError("Please select a valid recipient");
        return;
      }
      if (!selectedRecipient.userId) {
        setError("Recipients are not loaded properly. Please refresh.");
        return;
      }

      const result = await messagesApi.sendMessage({
        title: subject,
        body: message,
        toUserId: selectedRecipient.userId,
        files: files.length > 0 ? files : undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      window.dispatchEvent(new CustomEvent("messages-updated"));
      const basePath = pathname.split("/").slice(0, 2).join("/");
      navigate(`${basePath}/message-box`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
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
      <PageHeader title="Compose Message" icon={<Mail className="h-6 w-6 text-white" />} />

      <div className="container mx-auto px-4 sm:px-6 py-6 pt-0 max-w-7xl">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <FormSelect
              label="To"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              options={availableRecipients}
              placeholder={
                loadingRecipients
                  ? "Loading recipients..."
                  : availableRecipients.length > 0
                    ? "Select recipient"
                    : "No recipients available"
              }
              required
            />

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <FormInput
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              required
            />

            <RichTextEditor
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message here..."
              required
              showWordCount
              showToolbar
            />

            <FileUpload
              files={files}
              onFileChange={setFiles}
              onFileRemove={(index) => setFiles((prev) => prev.filter((_, i) => i !== index))}
              maxFiles={5}
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={sending || loadingRecipients || availableRecipients.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

