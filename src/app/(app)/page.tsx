"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { FileText, Package, Archive, Wrench, Truck, Settings } from "lucide-react";

const cards = [
  {
    href: "/rapporte",
    label: "Servicerapporte",
    desc: "Rapporte erstellen und verwalten",
    icon: FileText,
    color: "#3b82f6",
    roles: ["techniker", "lagerverwalter", "administrator"],
  },
  {
    href: "/lager",
    label: "Lagerverwaltung",
    desc: "Artikel, Bestände, Kategorien",
    icon: Package,
    color: "#22c55e",
    roles: ["lagerverwalter", "administrator"],
  },
  {
    href: "/archiv",
    label: "Archiv",
    desc: "Gespeicherte Rapporte durchsuchen",
    icon: Archive,
    color: "#8b5cf6",
    roles: ["techniker", "lagerverwalter", "administrator"],
  },
  {
    href: "/reparaturen",
    label: "Reparaturen & RMA",
    desc: "Defekte Geräte und RMA-Fälle",
    icon: Wrench,
    color: "#f59e0b",
    roles: ["techniker", "lagerverwalter", "administrator"],
  },
  {
    href: "/wareneingang",
    label: "Wareneingang",
    desc: "Lieferungen erfassen und kontrollieren",
    icon: Truck,
    color: "#06b6d4",
    roles: ["lagerverwalter", "administrator"],
  },
  {
    href: "/admin",
    label: "Administration",
    desc: "Benutzer, Kategorien, Einstellungen",
    icon: Settings,
    color: "#ef4444",
    roles: ["administrator"],
  },
];

export default function DashboardPage() {
  const { profile } = useAuth();

  const visible = cards.filter(
    (c) => profile && c.roles.includes(profile.role)
  );

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
            Willkommen{profile ? `, ${profile.name}` : ""}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
            Ottiger Media Systeme AG — Internes System
          </p>
        </div>
        <img src="/logo_ottiger_media_systeme_rgb.jpg" alt="OMS" className="h-10 object-contain opacity-80" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group p-5 rounded-xl transition-all"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = card.color;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ background: card.color + "22" }}
              >
                <Icon size={20} style={{ color: card.color }} />
              </div>
              <h2 className="font-semibold text-sm mb-1" style={{ color: "var(--foreground)" }}>
                {card.label}
              </h2>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {card.desc}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
