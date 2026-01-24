import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  Database,
  FileText,
  History,
  LineChart,
  MessagesSquare,
  Package,
  Sparkles,
  Terminal,
} from "lucide-react";

export type FeatureKey =
  | "inventory"
  | "rag"
  | "recommendation"
  | "forecasting"
  | "sessions"
  | "payments"
  | "reports"
  | "messages"
  | "history";

export const FEATURES: Record<
  FeatureKey,
  {
    title: string;
    description: string;
    bullets?: string[];
    usedBy?: Array<"Customer" | "Cashier" | "Manager" | "Inventory">;
  }
> = {
  inventory: {
    title: "Inventory Movement",
    description:
      "Tracks product stock changes including sales, restocking, waste, and adjustments in real time.",
    bullets: [
      "Live stock updates across warehouse and stores.",
      "Helps reduce waste and prevent stockouts.",
      "Supports audits and accurate reporting.",
    ],
    usedBy: ["Manager", "Inventory"],
  },
  rag: {
    title: "AI Assistant (RAG)",
    description:
      "Smart assistant that answers questions using system data and business knowledge.",
    bullets: [
      "Ask questions and get answers grounded in your POS data.",
      "Explains anomalies, alerts, and KPI changes quickly.",
      "Helps teams act faster with less manual digging.",
    ],
    usedBy: ["Customer", "Cashier", "Manager", "Inventory"],
  },
  recommendation: {
    title: "Product Recommendations",
    description:
      "AI-driven suggestions based on customer behavior, sales patterns, and offers.",
    bullets: [
      "Personalized items for customers and targeted offers.",
      "Boosts conversion using trends + inventory availability.",
      "Works alongside promotions and special offers.",
    ],
    usedBy: ["Customer", "Manager"],
  },
  forecasting: {
    title: "Sales Forecasting",
    description:
      "Predicts future demand to help optimize inventory and purchasing decisions.",
    bullets: [
      "Anticipates demand by time, store, and product patterns.",
      "Improves purchasing decisions and staffing planning.",
      "Highlights upcoming risk areas early.",
    ],
    usedBy: ["Manager", "Inventory"],
  },
  sessions: {
    title: "Sessions & Terminals",
    description:
      "Manages cashier sessions, POS terminals, and active device connections.",
    bullets: [
      "Track active cashiers and connected devices in real time.",
      "Prevents conflicts across multiple terminals.",
      "Supports safe opening/closing workflows.",
    ],
    usedBy: ["Cashier", "Manager"],
  },
  payments: {
    title: "Payment Methods",
    description:
      "Handles cash and card payments securely within the POS workflow.",
    bullets: [
      "Supports mixed payment flows within a single order.",
      "Keeps receipts and transaction records consistent.",
      "Designed for fast checkout under load.",
    ],
    usedBy: ["Cashier", "Manager"],
  },
  reports: {
    title: "Reports",
    description:
      "Provides sales, inventory, and performance analytics for decision making.",
    bullets: [
      "Daily/weekly insights for sales and operations.",
      "Highlights top products, low stock, and waste impact.",
      "Turns raw activity into actionable metrics.",
    ],
    usedBy: ["Manager", "Inventory"],
  },
  messages: {
    title: "Messages",
    description:
      "System notifications and alerts related to operations and AI insights.",
    bullets: [
      "Keeps teams informed with operational + AI alerts.",
      "Helps prioritize what needs action now.",
      "Central place to review important updates.",
    ],
    usedBy: ["Customer", "Cashier", "Manager", "Inventory"],
  },
  history: {
    title: "History & Logs",
    description: "Audit trail of actions, transactions, and system events.",
    bullets: [
      "Review who did what, when, and from which terminal.",
      "Useful for investigations and compliance.",
      "Improves trust with transparent activity logs.",
    ],
    usedBy: ["Manager", "Inventory"],
  },
};

export const FEATURE_ICONS: Record<FeatureKey, LucideIcon> = {
  inventory: Package,
  rag: Database,
  recommendation: Sparkles,
  forecasting: LineChart,
  sessions: Terminal,
  payments: CreditCard,
  reports: FileText,
  messages: MessagesSquare,
  history: History,
};

