import type { Message } from "./types";

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

