export type Message = {
  id: string;
  subject: string;
  message: string;
  from: "CEO" | "Inventory Manager";
  fromName: string;
  createdAt: string;
  read?: boolean;
};

