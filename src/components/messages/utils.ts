import type { Message, SentMessage } from "./types";

// Mock function to get messages - في الواقع ستأتي من API
export function getMockMessages(): Message[] {
  return [
    {
      id: "1",
      subject: "Daily store sales report – 2025-11-02",
      message: "Please review the sales data for yesterday. We noticed a significant increase in electronics sales.",
      from: "CEO",
      fromName: "Ahmad Ali",
      createdAt: "2025-11-02 09:30 AM",
      read: false,
    },
    {
      id: "2",
      subject: "Inventory restocking request",
      message: "We need to restock iPhone 15 Pro models. Current stock is below the minimum threshold.",
      from: "Inventory Manager",
      fromName: "Sara Mohammed",
      createdAt: "2025-11-01 02:15 PM",
      read: false,
    },
    {
      id: "3",
      subject: "Weekly performance review",
      message: "Great job on this week's sales performance. Let's schedule a meeting to discuss next week's goals.",
      from: "CEO",
      fromName: "Ahmad Ali",
      createdAt: "2025-10-30 10:00 AM",
      read: true,
    },
  ];
}

// Mock function to get sent messages - في الواقع ستأتي من API
export function getMockSentMessages(_role: "CEO" | "Store Manager" | "Inventory Manager"): SentMessage[] {
  const baseMessages: SentMessage[] = [
    {
      id: "s1",
      subject: "Weekly sales report submission",
      message: "Please find attached the weekly sales report for your review. All metrics are within expected ranges.",
      to: "CEO",
      toName: "Ahmad Ali",
      createdAt: "2025-11-02 08:00 AM",
      status: "read",
    },
    {
      id: "s2",
      subject: "Inventory update request",
      message: "Could you please provide an update on the current inventory levels for electronics category?",
      to: "Inventory Manager",
      toName: "Sara Mohammed",
      createdAt: "2025-11-01 03:45 PM",
      status: "delivered",
    },
    {
      id: "s3",
      subject: "Store operations feedback",
      message: "Thank you for the excellent work on improving store operations. The new procedures are working well.",
      to: "Store Manager",
      toName: "Moath Saleh",
      createdAt: "2025-10-31 11:20 AM",
      status: "read",
    },
    {
      id: "s4",
      subject: "Monthly performance summary",
      message: "Attached is the monthly performance summary. We've exceeded our targets for this month.",
      to: "CEO",
      toName: "Ahmad Ali",
      createdAt: "2025-10-29 09:15 AM",
      status: "read",
    },
    {
      id: "s5",
      subject: "Product restocking inquiry",
      message: "When can we expect the next shipment of iPhone 15 Pro? Current stock is running low.",
      to: "Inventory Manager",
      toName: "Sara Mohammed",
      createdAt: "2025-10-28 02:30 PM",
      status: "delivered",
    },
  ];

  // Filter messages based on role (in real app, this would be done server-side)
  return baseMessages;
}

