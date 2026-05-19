/**
 * Central registry of every localStorage key the app reads or writes.
 *
 * Why: The Database admin page (backup / restore / clear) auto-discovers
 * stores from this registry. When you add a new store anywhere in the app,
 * register it here once and backup / restore / clear pick it up automatically —
 * no need to edit the Database page.
 *
 * Backup additionally captures any `arp_*` or `feedback_*` / `admin_*` key found
 * in localStorage at runtime, even if missing from the registry, so user data
 * is never lost just because a developer forgot to register a key.
 */

import type { LucideIcon } from "lucide-react"
import {
  Bell, MessageSquare, ListTodo, Building2, Shield, FileText, Package,
} from "lucide-react"

export interface StoreDefinition {
  key: string
  label: string
  description: string
  icon: LucideIcon
  /** Tailwind text color class for the icon */
  color: string
  /** Tailwind bg color class for the icon container */
  bg: string
  /** Tailwind border color class for the icon container */
  border: string
  /** If true, key is a system marker (never user data — included in clear, hidden from UI) */
  system?: boolean
}

/** All known localStorage stores. Add new entries here when introducing a new persistent store. */
export const STORE_REGISTRY: StoreDefinition[] = [
  // ── Request data ───────────────────────────────────────────────────────────
  {
    key: "arp_requests",
    label: "Requests",
    description: "All request records across every module (Shipping, HR, Purchase, Event, Travel, Maintenance, General)",
    icon: Package, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200",
  },

  // ── Tasks ──────────────────────────────────────────────────────────────────
  {
    key: "admin_tasks",
    label: "Team Tasks",
    description: "Task records, comments, and activity logs",
    icon: ListTodo, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200",
  },

  // ── Feedback ───────────────────────────────────────────────────────────────
  {
    key: "feedback_surveys",
    label: "Feedback Surveys",
    description: "Pending and sent employee survey records",
    icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200",
  },
  {
    key: "feedback_responses",
    label: "Feedback Responses",
    description: "Submitted star ratings and comments",
    icon: MessageSquare, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200",
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  {
    key: "arp_notifications",
    label: "Notifications",
    description: "In-app notification log",
    icon: Bell, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200",
  },
  {
    key: "arp_notification_preferences",
    label: "Notification Preferences",
    description: "Per-user email & in-app toggle settings",
    icon: Bell, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200",
  },

  // ── Comments ───────────────────────────────────────────────────────────────
  {
    key: "arp_viewed_comments",
    label: "Viewed Comments",
    description: "Read/unread comment tracking per user",
    icon: MessageSquare, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200",
  },

  // ── Configuration / lookups ────────────────────────────────────────────────
  {
    key: "arp_company_data",
    label: "Company Data",
    description: "Suppliers, Cost Centers, Managers, Carriers, Departments, Sectors lists",
    icon: Building2, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200",
  },
  {
    key: "arp_platform_settings",
    label: "Platform Settings",
    description: "Branding, login page, header, and system config",
    icon: Shield, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200",
  },

  // ── Theme & logos ──────────────────────────────────────────────────────────
  {
    key: "arp_theme",
    label: "Theme",
    description: "Dark / light mode preference",
    icon: Shield, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200",
  },
  {
    key: "arp_logo_header",
    label: "Header Logo",
    description: "Custom header logo (base64 image data)",
    icon: FileText, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200",
  },
  {
    key: "arp_logo_login",
    label: "Login Logo",
    description: "Custom login page logo (base64 image data)",
    icon: FileText, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200",
  },

  // ── System markers (hidden from UI but cleared on Clear All) ──────────────
  {
    key: "arp_prod_wipe_v1",
    label: "Production Wipe Marker",
    description: "Version marker — first-boot data wipe completed",
    icon: Shield, color: "text-gray-400", bg: "bg-gray-50", border: "border-gray-200",
    system: true,
  },
  {
    key: "arp_mock_version",
    label: "Mock Data Version",
    description: "Version marker — mock data seed",
    icon: Shield, color: "text-gray-400", bg: "bg-gray-50", border: "border-gray-200",
    system: true,
  },
]

/** Map of key → definition for quick lookups. */
export const STORE_BY_KEY: Record<string, StoreDefinition> = Object.fromEntries(
  STORE_REGISTRY.map((s) => [s.key, s])
)

/** All registered keys, including system markers. */
export const ALL_REGISTERED_KEYS: string[] = STORE_REGISTRY.map((s) => s.key)

/** User-facing stores only (no system markers). */
export const USER_FACING_STORES: StoreDefinition[] = STORE_REGISTRY.filter((s) => !s.system)

/** Stores excluding request data (used by "Clear by Data Type") and system markers. */
export const NON_REQUEST_STORES: StoreDefinition[] = USER_FACING_STORES.filter(
  (s) => s.key !== "arp_requests"
)

/**
 * Prefixes considered "owned" by this app. Any localStorage key starting with
 * one of these is included in backup/restore/clear, even if not registered.
 *
 * Why: ensures new stores added in code without registering here still get
 * backed up and restored — defensive against developer forgetfulness.
 */
export const OWNED_PREFIXES = ["arp_", "admin_", "feedback_"]

/** Check if a localStorage key is owned by this app (and thus subject to backup/clear). */
export function isOwnedKey(key: string): boolean {
  return OWNED_PREFIXES.some((p) => key.startsWith(p))
}

/**
 * Collect every owned localStorage key currently present, whether or not it
 * is in the registry. Returns deduplicated list.
 */
export function discoverAllOwnedKeys(): string[] {
  if (typeof window === "undefined") return [...ALL_REGISTERED_KEYS]
  const found = new Set<string>(ALL_REGISTERED_KEYS)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && isOwnedKey(key)) found.add(key)
  }
  return Array.from(found)
}
