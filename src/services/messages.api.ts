import { apiClient } from "./api.client";
import { getCurrentToken } from "./tokens";
import type { Message, SentMessage } from "../components/messages/types";

const API_BASE_URL = "http://localhost:8081";

export interface UserBasicDTO {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface MessageAttachmentDTO {
  id: number;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
}

export interface MessageDTO {
  id: number;
  fromUser: UserBasicDTO;
  toUser: UserBasicDTO;
  title: string;
  body: string;
  status: "SENT" | "DELIVERED" | "READ";
  createdAt: string;
  readAt?: string | null;
  parentMessageId?: number | null;
  attachments?: MessageAttachmentDTO[];
  repliesCount?: number;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
}

export interface SendMessageRequest {
  toUserId?: number;
  toRole?: string;
  title: string;
  body: string;
  files?: File[];
  parentMessageId?: number;
}

export interface SendMessageResponse {
  id: number;
  message?: string;
  success?: boolean;
}

async function apiRequestWithFiles<T>(
  endpoint: string,
  formData: FormData
): Promise<{ data?: T; error?: string; status: number }> {
  const token = getCurrentToken();

  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.clear();
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }

      return {
        error: data.message || `HTTP error! status: ${response.status}`,
        status: response.status,
      };
    }

    return {
      data: data as T,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Network error occurred",
      status: 0,
    };
  }
}

export const messagesApi = {
  async sendMessage(request: SendMessageRequest): Promise<{ data?: SendMessageResponse; error?: string }> {
    const formData = new FormData();

    if (!request.toUserId) {
      return { error: "toUserId is required" };
    }

    formData.append("toUserId", request.toUserId.toString());

    if (request.toRole) {
      formData.append("toRole", request.toRole);
    }

    formData.append("title", request.title);
    formData.append("body", request.body);

    if (request.parentMessageId) {
      formData.append("parentMessageId", request.parentMessageId.toString());
    }

    if (request.files && request.files.length > 0) {
      request.files.forEach((file) => {
        formData.append(`files`, file);
      });
    }

    const response = await apiRequestWithFiles<SendMessageResponse>("/api/messages/send", formData);

    if (response.error) {
      return { error: response.error };
    }

    return { data: response.data };
  },

  async replyToMessage(
    messageId: string,
    reply: string,
    files?: File[],
    toUserId?: number
  ): Promise<{ data?: SendMessageResponse; error?: string }> {
    if (files && files.length > 0) {
      if (!toUserId) {
        return { error: "toUserId is required when sending files" };
      }

      const formData = new FormData();
      formData.append("toUserId", toUserId.toString());
      formData.append("title", "Re: Message");
      formData.append("body", reply);
      formData.append("parentMessageId", messageId);

      files.forEach((file) => {
        formData.append(`files`, file);
      });

      const response = await apiRequestWithFiles<SendMessageResponse>("/api/messages/send", formData);

      if (response.error) {
        return { error: response.error };
      }

      return { data: response.data };
    } else {
      const response = await apiClient.post<SendMessageResponse>("/api/messages/reply", {
        parentMessageId: parseInt(messageId),
        body: reply,
      });

      if (response.error || !response.data) {
        return { error: response.error || "Failed to send reply" };
      }

      return { data: response.data };
    }
  },

  async getInboxMessages(): Promise<{ data?: Message[]; error?: string }> {
    const response = await apiClient.get<MessageDTO[] | { messages: MessageDTO[]; total: number }>("/api/messages/inbox");

    if (response.error || !response.data) {
      return { error: response.error || "Failed to fetch inbox messages" };
    }

    const messagesArray = Array.isArray(response.data) ? response.data : (response.data as { messages: MessageDTO[] }).messages;
    
    if (!Array.isArray(messagesArray)) {
      return { error: "Invalid response format from server" };
    }
    
    // Allow system messages: only require id and toUser (fromUser can be null)
    const validMessages = messagesArray.filter(dto => {
      if (!dto || !dto.id) return false;
      if (!dto.toUser) return false;
      // fromUser can be null for system messages
      return true;
    });
    
    const convertedMessages = validMessages.map(convertMessageDTOToMessage);
    
    return { data: convertedMessages };
  },

  async getOutboxMessages(): Promise<{ data?: SentMessage[]; error?: string }> {
    const response = await apiClient.get<MessageDTO[] | { messages: MessageDTO[]; total: number }>("/api/messages/sent");

    if (response.error || !response.data) {
      return { error: response.error || "Failed to fetch outbox messages" };
    }

    const messagesArray = Array.isArray(response.data) ? response.data : (response.data as { messages: MessageDTO[] }).messages;
    const convertedMessages = messagesArray.map(convertMessageDTOToSentMessage);
    return { data: convertedMessages };
  },

  async getMessageById(messageId: string): Promise<{ data?: Message; error?: string; dto?: MessageDTO }> {
    const response = await apiClient.get<MessageDTO>(`/api/messages/${messageId}`);

    if (response.error || !response.data) {
      return { error: response.error || "Failed to fetch message" };
    }

    return { 
      data: convertMessageDTOToMessage(response.data),
      dto: response.data
    };
  },

  async getUnreadCount(): Promise<{ data?: number; error?: string }> {
    const response = await apiClient.get<{ count: number }>("/api/messages/unread-count");

    if (response.error || !response.data) {
      return { error: response.error || "Failed to fetch unread count" };
    }

    return { data: response.data.count };
  },

  async markAsRead(messageId: string): Promise<{ data?: { success: boolean }; error?: string }> {
    const response = await apiClient.put<{ success: boolean }>(`/api/messages/${messageId}/read`);

    if (response.error || !response.data) {
      return { error: response.error || "Failed to mark message as read" };
    }

    return { data: response.data };
  },

  async getAvailableRecipients(): Promise<{ data?: Array<{ id: number; name: string; role: string; email?: string }>; error?: string }> {
    const response = await apiClient.get<Array<{ id: number; firstName: string; lastName: string; role: string; email?: string }>>("/api/messages/recipients");

    if (response.error || !response.data) {
      return { error: response.error || "Failed to fetch recipients" };
    }

    const converted = response.data.map(user => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      email: user.email,
    }));

    return { data: converted };
  },
};

function convertMessageDTOToMessage(dto: MessageDTO): Message {
  // read = dto.readAt != null
  const isRead = dto.readAt != null;
  
  // Support system messages: fromUser can be null
  if (!dto.fromUser || !dto.fromUser.role) {
    return {
      id: dto.id.toString(),
      subject: dto.title || "", // Legacy field
      title: dto.title || "", // API field
      message: dto.body || "",
      from: "Inventory Manager", // Default role for system messages
      fromName: "System", // System messages have fromName = "System"
      createdAt: dto.createdAt, // Keep as ISO string, do NOT format
      read: isRead,
      status: dto.status, // API field
      readAt: dto.readAt, // API field
      attachments: dto.attachments?.filter(att => att && att.id).map(att => ({
        id: att.id.toString(),
        fileName: att.fileName || "Unknown file",
        fileUrl: att.fileUrl || "",
        fileSize: att.fileSize || 0,
        contentType: att.contentType || "application/octet-stream",
      })),
    };
  }
  
  const fromRoleRaw = dto.fromUser.role.trim();
  const fromRole = fromRoleRaw.toUpperCase().replace(/\s+/g, "_").replace(/-/g, "_");
  
  let normalizedFrom: "CEO" | "Store Manager" | "Inventory Manager" = "Inventory Manager";
  
  if (fromRole === "CEO" || fromRole === "CE_O" || fromRoleRaw.toUpperCase() === "CEO") {
    normalizedFrom = "CEO";
  } else if (
    fromRole === "STORE_MANAGER" || 
    fromRole === "STOREMANAGER" ||
    (fromRole.includes("STORE") && fromRole.includes("MANAGER"))
  ) {
    normalizedFrom = "Store Manager";
  } else if (
    fromRole === "INVENTORY_MANAGER" || 
    fromRole === "INVENTORYMANAGER" ||
    (fromRole.includes("INVENTORY") && fromRole.includes("MANAGER")) ||
    (fromRoleRaw.toUpperCase().includes("INVENTORY") && fromRoleRaw.toUpperCase().includes("MANAGER"))
  ) {
    normalizedFrom = "Inventory Manager";
  }
  
  return {
    id: dto.id.toString(),
    subject: dto.title || "", // Legacy field
    title: dto.title || "", // API field
    message: dto.body || "",
    from: normalizedFrom,
    fromName: `${dto.fromUser.firstName || ""} ${dto.fromUser.lastName || ""}`.trim() || "Unknown",
    createdAt: dto.createdAt, // Keep as ISO string, do NOT format
    read: isRead,
    status: dto.status, // API field
    readAt: dto.readAt, // API field
    attachments: dto.attachments?.filter(att => att && att.id).map(att => ({
      id: att.id.toString(),
      fileName: att.fileName || "Unknown file",
      fileUrl: att.fileUrl || "",
      fileSize: att.fileSize || 0,
      contentType: att.contentType || "application/octet-stream",
    })),
  };
}

function convertMessageDTOToSentMessage(dto: MessageDTO): SentMessage {
  const statusMap: Record<string, "sent" | "delivered" | "read"> = {
    "SENT": "sent",
    "DELIVERED": "delivered",
    "READ": "read",
  };

  const toRole = dto.toUser.role.toUpperCase().replace(/\s+/g, "_");
  let normalizedTo: "CEO" | "Store Manager" | "Inventory Manager" = "Store Manager";
  
  if (toRole === "CEO") {
    normalizedTo = "CEO";
  } else if (toRole === "STORE_MANAGER" || toRole === "STOREMANAGER") {
    normalizedTo = "Store Manager";
  } else if (toRole === "INVENTORY_MANAGER" || toRole === "INVENTORYMANAGER") {
    normalizedTo = "Inventory Manager";
  }

  return {
    id: dto.id.toString(),
    subject: dto.title,
    message: dto.body,
    to: normalizedTo,
    toName: `${dto.toUser.firstName} ${dto.toUser.lastName}`,
    createdAt: formatDateTime(dto.createdAt),
    status: statusMap[dto.status] || "sent",
    attachments: dto.attachments?.filter(att => att && att.id).map(att => ({
      id: att.id.toString(),
      fileName: att.fileName || "Unknown file",
      fileUrl: att.fileUrl || "",
      fileSize: att.fileSize || 0,
      contentType: att.contentType || "application/octet-stream",
    })),
  };
}

function formatDateTime(dateTimeString: string): string {
  try {
    const date = new Date(dateTimeString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return "Just now";
    } else if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  } catch {
    return dateTimeString;
  }
}

