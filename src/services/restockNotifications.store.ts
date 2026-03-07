/**
 * Restock Notification Store
 *
 * Singleton module-level store so that any component — ForecastingDashboardPage,
 * NotificationBell, Topbar — shares exactly one copy of the notification list
 * without needing React Context or a global state library.
 *
 * Persistence: localStorage key "restock_notifications"
 * Cross-tab sync: native "storage" event
 * Same-tab sync: internal subscriber set + forceRender in the React hook
 */

import { useEffect, useReducer } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RestockUrgency = "critical" | "high" | "medium" | "low" | "unknown";

export interface RestockNotification {
  /** Stable dedup key: restock-{productId}-{expectedStockoutDate|YYYY-MM-DD} */
  id: string;
  productId: number;
  productName: string;
  currentStock: number;
  reorderQty: number;
  urgency: RestockUrgency;
  expectedStockoutDate: string | null; // yyyy-MM-dd from backend
  avgDailyDemand: number;
  /** Human-readable summary built from forecast fields (no separate "message" field exists in the API) */
  detailsMessage: string;
  /** ISO timestamp when the notification was first stored */
  createdAt: string;
  read: boolean;
}

/** Shape passed by ForecastingDashboardPage when data loads */
export interface RestockNotificationInput {
  productId: number;
  productName: string;
  currentStock: number;
  reorderQty: number;
  urgency: RestockUrgency;
  expectedStockoutDate: string | null;
  avgDailyDemand: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "restock_notifications";
const MAX_STORED = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function loadFromStorage(): RestockNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RestockNotification[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: RestockNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage-quota errors silently.
  }
}

/**
 * Build a stable ID from the product + the forecast date.
 * Using expectedStockoutDate means a new notification is generated each time
 * the forecast is re-run and produces a different stockout projection.
 * If there is no stockout date we fall back to today (daily granularity).
 */
function buildId(input: RestockNotificationInput): string {
  const datePart =
    input.expectedStockoutDate ?? new Date().toISOString().split("T")[0];
  return `restock-${input.productId}-${datePart}`;
}

/**
 * Compose a human-readable details message from the available forecast fields.
 * The API has no dedicated "message" field on the stock summary, so we build one.
 */
function buildDetailsMessage(input: RestockNotificationInput): string {
  const parts: string[] = [];

  if (input.expectedStockoutDate) {
    const d = new Date(input.expectedStockoutDate);
    const diffDays = Math.ceil(
      (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const dateLabel = d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const relLabel =
      diffDays > 0
        ? `in ${diffDays} day${diffDays !== 1 ? "s" : ""}`
        : "already overdue";
    parts.push(`Expected stockout: ${dateLabel} (${relLabel}).`);
  } else {
    parts.push("No specific stockout date projected — reorder still recommended.");
  }

  if (input.avgDailyDemand > 0) {
    parts.push(`Average daily demand: ${input.avgDailyDemand.toFixed(2)} units/day.`);
  }

  parts.push(
    `Recommended reorder: ${Math.round(input.reorderQty)} units to maintain adequate supply.`
  );

  return parts.join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton store (module-level so it is shared by all hook instances)
// ─────────────────────────────────────────────────────────────────────────────

type Listener = () => void;

let _notifications: RestockNotification[] = loadFromStorage();
const _listeners = new Set<Listener>();

/** Notify all subscribed React hook instances to re-render. */
function _notify(): void {
  _listeners.forEach((l) => l());
}

/** Persist to localStorage and notify subscribers. */
function _commit(next: RestockNotification[]): void {
  _notifications = next;
  saveToStorage(next);
  _notify();
}

// Cross-tab sync: the "storage" event fires when ANOTHER tab writes to localStorage.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && e.newValue !== null) {
      try {
        _notifications = JSON.parse(e.newValue) as RestockNotification[];
        _notify();
      } catch {
        /* ignore malformed data */
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public store API (callable outside React render cycle too)
// ─────────────────────────────────────────────────────────────────────────────

export function getRestockNotifications(): RestockNotification[] {
  return _notifications;
}

export function subscribeToRestockNotifications(listener: Listener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

/**
 * Add new notifications for critical/high-urgency restock items.
 * Items with urgency medium/low or items whose ID already exists are silently skipped.
 */
export function addRestockNotifications(inputs: RestockNotificationInput[]): void {
  const existingIds = new Set(_notifications.map((n) => n.id));
  const toAdd: RestockNotification[] = [];

  for (const input of inputs) {
    // Only generate notifications for actionable urgency levels.
    if (input.urgency !== "critical" && input.urgency !== "high") continue;

    const id = buildId(input);
    if (existingIds.has(id)) continue; // duplicate — skip

    toAdd.push({
      id,
      productId: input.productId,
      productName: input.productName,
      currentStock: input.currentStock,
      reorderQty: input.reorderQty,
      urgency: input.urgency,
      expectedStockoutDate: input.expectedStockoutDate,
      avgDailyDemand: input.avgDailyDemand,
      detailsMessage: buildDetailsMessage(input),
      createdAt: new Date().toISOString(),
      read: false,
    });
  }

  if (toAdd.length === 0) return;

  // Prepend newest; cap to MAX_STORED.
  _commit([...toAdd, ..._notifications].slice(0, MAX_STORED));
}

export function markRestockNotificationRead(id: string): void {
  if (!_notifications.some((n) => n.id === id && !n.read)) return;
  _commit(_notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
}

export function markAllRestockNotificationsRead(): void {
  if (_notifications.every((n) => n.read)) return;
  _commit(_notifications.map((n) => ({ ...n, read: true })));
}

export function clearRestockNotifications(): void {
  _commit([]);
}

// ─────────────────────────────────────────────────────────────────────────────
// React hook — thin subscriber that forces a re-render when store changes
// ─────────────────────────────────────────────────────────────────────────────

export function useRestockNotifications() {
  // useReducer gives us a stable re-render trigger without extra state.
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    return subscribeToRestockNotifications(forceRender);
  }, []);

  const notifications = getRestockNotifications();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    addNotifications: addRestockNotifications,
    markRead: markRestockNotificationRead,
    markAllRead: markAllRestockNotificationsRead,
    clearAll: clearRestockNotifications,
  };
}
