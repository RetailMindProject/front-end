export type Message = {
  id: string;
  subject: string;
  message: string;
  from: "CEO" | "Inventory Manager";
  fromName: string;
  createdAt: string;
  read?: boolean;
};

export type SentMessage = {
  id: string;
  subject: string;
  message: string;
  to: "CEO" | "Store Manager" | "Inventory Manager";
  toName: string;
  createdAt: string;
  status?: "sent" | "delivered" | "read";
};

