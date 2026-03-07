import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  Database,
  FileText,
  History,
  LineChart,
  Mail,
  MessagesSquare,
  Package,
  Shield,
  Sparkles,
  Terminal,
  ShoppingBag,
  UserRound,
  Store,
  Cookie,
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
  | "history"
  | "customers"
  | "cashiers"
  | "managers"
  | "email"
  | "privacy"
  | "terms"
  | "cookies";

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
  customers: {
    title: "Customers",
    description:
      "Empower your customers with personalized shopping experiences, product recommendations, and seamless order management.",
    bullets: [
      "Browse products with AI-powered recommendations tailored to preferences.",
      "Search and filter products by category, price, and availability.",
      "Track order history and manage account settings easily.",
      "Receive personalized offers and promotions based on shopping behavior.",
    ],
    usedBy: ["Customer"],
  },
  cashiers: {
    title: "Cashiers",
    description:
      "Streamlined POS interface for fast and accurate checkout, payment processing, and order management.",
    bullets: [
      "Quick barcode scanning and product lookup for efficient checkout.",
      "Support for multiple payment methods including cash and card.",
      "Real-time inventory updates and low stock alerts.",
      "Session management with opening and closing workflows.",
    ],
    usedBy: ["Cashier"],
  },
  managers: {
    title: "Managers",
    description:
      "Comprehensive dashboard for store operations, analytics, inventory management, and team oversight.",
    bullets: [
      "Real-time sales analytics and performance metrics.",
      "Inventory management with low stock alerts and movement tracking.",
      "Terminal and session management across multiple devices.",
      "Staff management and access control for secure operations.",
    ],
    usedBy: ["Manager"],
  },
  email: {
    title: "Email Communication",
    description:
      "Integrated email system for sending receipts, promotions, and customer service messages.",
    bullets: [
      "Send digital receipts directly to customers.",
      "Automate promotional emails based on purchase history.",
      "Handle customer inquiries efficiently.",
    ],
    usedBy: ["Customer", "Cashier", "Manager"],
  },
  privacy: {
    title: "Privacy Policy",
    description:
      "Your privacy is important to us. This policy explains how we collect, use, and protect your personal information when you use RetailMind POS.",
    bullets: [
      "We collect only necessary information to provide and improve our services.",
      "Your data is encrypted and stored securely with industry-standard protections.",
      "We never sell your personal information to third parties.",
      "You have the right to access, update, or delete your personal data at any time.",
      "We comply with applicable data protection regulations including GDPR and local privacy laws.",
    ],
    usedBy: ["Customer", "Cashier", "Manager", "Inventory"],
  },
  terms: {
    title: "Terms of Service",
    description:
      "These terms govern your use of RetailMind POS. By using our platform, you agree to comply with these terms and conditions.",
    bullets: [
      "You must be authorized to use the system and maintain account security.",
      "You are responsible for all activities that occur under your account.",
      "We reserve the right to suspend or terminate accounts that violate these terms.",
      "The platform is provided 'as is' with reasonable efforts to ensure reliability.",
      "We may update these terms periodically, and continued use constitutes acceptance.",
    ],
    usedBy: ["Customer", "Cashier", "Manager", "Inventory"],
  },
  cookies: {
    title: "Cookie Policy",
    description:
      "We use cookies and similar technologies to enhance your experience, analyze usage, and improve our services.",
    bullets: [
      "Essential cookies are required for the platform to function properly.",
      "Analytics cookies help us understand how you use our services.",
      "You can control cookie preferences through your browser settings.",
      "Some features may not work correctly if cookies are disabled.",
      "We do not use cookies to track you across other websites.",
    ],
    usedBy: ["Customer", "Cashier", "Manager", "Inventory"],
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
  customers: ShoppingBag,
  cashiers: UserRound,
  managers: Store,
  email: Mail,
  privacy: Shield,
  terms: FileText,
  cookies: Cookie,
};

