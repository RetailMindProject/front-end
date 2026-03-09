export type MessageAttachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
};

export type Message = {
  id: string;
  subject: string; // Legacy field, use title instead
  title: string; // API field: title
  message: string;
  from: "CEO" | "Store Manager" | "Inventory Manager";
  fromName: string;
  createdAt: string;
  read?: boolean; // Legacy field, use status and readAt instead
  status?: "SENT" | "DELIVERED" | "READ"; // API field: status
  readAt?: string | null; // API field: readAt
  attachments?: MessageAttachment[];
};

export type SentMessage = {
  id: string;
  subject: string;
  message: string;
  to: "CEO" | "Store Manager" | "Inventory Manager";
  toName: string;
  createdAt: string;
  status?: "sent" | "delivered" | "read";
  attachments?: MessageAttachment[];
};

