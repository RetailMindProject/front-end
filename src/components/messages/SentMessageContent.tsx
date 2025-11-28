import { useState, useEffect } from "react";
import type { SentMessage, MessageAttachment } from "./types";
import { CheckCheck, Clock, Download, File, Paperclip, Eye, X } from "lucide-react";
import { getCurrentToken } from "../../services/tokens";

interface SentMessageContentProps {
  message: SentMessage;
  className?: string;
}

function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes || bytes === 0) return "Unknown size";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function canViewFile(contentType: string): boolean {
  const viewableTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "text/plain",
    "text/html",
  ];
  return viewableTypes.some(type => contentType.toLowerCase().includes(type.split("/")[1]));
}

function FileViewModal({ attachment, isOpen, onClose }: { attachment: MessageAttachment | null; isOpen: boolean; onClose: () => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isImage = attachment?.contentType?.startsWith("image/") || false;
  const isPDF = attachment?.contentType === "application/pdf";
  const canView = attachment && attachment.contentType ? canViewFile(attachment.contentType) : false;

  useEffect(() => {
    if (!isOpen || !attachment || !canView) {
      setBlobUrl(null);
      return;
    }

    setLoading(true);
    setError(null);

    const loadFile = async () => {
      try {
        const downloadUrl = attachment.fileUrl.startsWith("http")
          ? attachment.fileUrl
          : `http://localhost:8081/api/messages/attachments/download/${attachment.fileName}`;
        
        const token = getCurrentToken();
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(downloadUrl, { headers });
        
        if (!response.ok) {
          throw new Error("Failed to load file");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load file");
      } finally {
        setLoading(false);
      }
    };

    loadFile();

    return () => {
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, attachment, canView]);

  if (!isOpen || !attachment) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <File className="h-5 w-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-800 truncate">
              {attachment.fileName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-600">Loading...</div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg p-8 border border-slate-200 text-center">
              <File className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">{error}</p>
            </div>
          ) : canView && blobUrl ? (
            isImage ? (
              <div className="flex items-center justify-center h-full">
                <img
                  src={blobUrl}
                  alt={attachment.fileName}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                />
              </div>
            ) : isPDF ? (
              <iframe
                src={blobUrl}
                className="w-full h-full min-h-[600px] border-0 rounded-lg"
                title={attachment.fileName}
              />
            ) : (
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <p className="text-slate-600">Preview not available for this file type.</p>
                <p className="text-sm text-slate-500 mt-2">Please download the file to view it.</p>
              </div>
            )
          ) : (
            <div className="bg-white rounded-lg p-8 border border-slate-200 text-center">
              <File className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600 mb-2">Preview not available for this file type</p>
              <p className="text-sm text-slate-500">{attachment.contentType}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SentMessageContent({ message, className = "" }: SentMessageContentProps) {
  const [viewingAttachment, setViewingAttachment] = useState<MessageAttachment | null>(null);

  if (!message || !message.id) {
    return null;
  }

  const handleDownload = async (fileUrl: string, fileName: string) => {
    let downloadUrl = fileUrl;
    
    if (!fileUrl.startsWith("http")) {
      downloadUrl = `http://localhost:8081/api/messages/attachments/download/${fileName}`;
    }
    
    const token = getCurrentToken();
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(downloadUrl, { headers });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = fileName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleView = (attachment: MessageAttachment) => {
    if (attachment.contentType && canViewFile(attachment.contentType)) {
      setViewingAttachment(attachment);
    } else {
      handleDownload(attachment.fileUrl || "", attachment.fileName || "file");
    }
  };
  const getStatusIcon = () => {
    switch (message.status) {
      case "read":
        return <CheckCheck className="h-4 w-4 text-blue-600" />;
      case "delivered":
        return <CheckCheck className="h-4 w-4 text-green-600" />;
      case "sent":
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusLabel = () => {
    switch (message.status) {
      case "read":
        return "Read";
      case "delivered":
        return "Delivered";
      case "sent":
      default:
        return "Sent";
    }
  };

  const getStatusColor = () => {
    switch (message.status) {
      case "read":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "delivered":
        return "bg-green-100 text-green-700 border-green-200";
      case "sent":
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getToBadgeColor = (to: SentMessage["to"]) => {
    switch (to) {
      case "CEO":
        return "bg-purple-100 text-purple-700";
      case "Store Manager":
        return "bg-indigo-100 text-indigo-700";
      case "Inventory Manager":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 p-6 ${className}`}>
      <div className="mb-4">
        {/* Header with To Badge, Status, and Date */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${getToBadgeColor(message.to)}`}>
              {message.to === "CEO" ? "👔" : message.to === "Store Manager" ? "🏪" : "📦"}
              {message.to}
            </span>
            <span className="text-sm text-slate-500">{message.toName}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium border ${getStatusColor()}`}>
              {getStatusIcon()}
              {getStatusLabel()}
            </div>
            <span className="text-xs text-slate-400">{message.createdAt}</span>
          </div>
        </div>
        
        {/* Subject */}
        <h2 className="text-xl font-semibold text-slate-800 mb-3">
          {message.subject}
        </h2>

        {/* Message Body */}
        <div className="prose prose-sm max-w-none mb-4">
          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
            {message.message}
          </p>
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Paperclip className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700">Attachments</h3>
              <span className="text-xs text-slate-500">({message.attachments.filter(att => att && att.id).length})</span>
            </div>
            <div className="space-y-2">
              {message.attachments.filter(att => att && att.id).map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <File className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {attachment.fileName || "Unknown file"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {attachment.fileSize ? formatFileSize(attachment.fileSize) : "Unknown size"} • {attachment.contentType || "Unknown type"}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-3 flex items-center gap-2">
                    {attachment.contentType && canViewFile(attachment.contentType) && (
                      <button
                        onClick={() => handleView(attachment)}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(attachment.fileUrl || "", attachment.fileName || "file")}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <FileViewModal
        attachment={viewingAttachment}
        isOpen={viewingAttachment !== null}
        onClose={() => setViewingAttachment(null)}
      />
    </div>
  );
}




