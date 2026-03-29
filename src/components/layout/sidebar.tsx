"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  FileText,
  Package,
  Archive,
  Settings,
  Wrench,
  Truck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  {
    href: "/rapporte",
    label: "Servicerapporte",
    icon: FileText,
    roles: ["techniker", "lagerverwalter", "administrator"],
  },
  {
    href: "/lager",
    label: "Lagerverwaltung",
    icon: Package,
    roles: ["lagerverwalter", "administrator"],
  },
  {
    href: "/archiv",
    label: "Archiv",
    icon: Archive,
    roles: ["techniker", "lagerverwalter", "administrator"],
  },
  {
    href: "/reparaturen",
    label: "Reparaturen & RMA",
    icon: Wrench,
    roles: ["techniker", "lagerverwalter", "administrator"],
  },
  {
    href: "/wareneingang",
    label: "Wareneingang",
    icon: Truck,
    roles: ["lagerverwalter", "administrator"],
  },
  {
    href: "/admin",
    label: "Administration",
    icon: Settings,
    roles: ["administrator"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = navItems.filter(
    (item) => profile && item.roles.includes(profile.role)
  );

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 transition-all duration-200 shrink-0"
      style={{
        width: collapsed ? "60px" : "220px",
        background: "var(--card)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-center px-3 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", minHeight: "60px" }}
      >
        {collapsed ? (
          <img src="/oms-logo.png" alt="OMS" className="w-8 h-8 object-contain" />
        ) : (
          <img src="/oms-logo.png" alt="Ottiger Media Systeme" className="h-9 object-contain" style={{ maxWidth: "160px" }} />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-colors mb-0.5",
                active
                  ? "font-medium"
                  : "hover:opacity-80"
              )}
              style={{
                background: active ? "var(--primary)" : "transparent",
                color: active ? "white" : "var(--muted-foreground)",
              }}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: "1px solid var(--border)" }} className="shrink-0">
        {/* User */}
        {profile && (
          <div className={cn("flex items-center gap-3 px-3 py-3", collapsed && "justify-center")}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
              style={{ background: "var(--primary)", color: "white" }}
            >
              {profile.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>{profile.name}</p>
                <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                  {profile.role === "administrator" ? "Administrator" : profile.role === "lagerverwalter" ? "Lagerverwalter" : "Techniker"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={signOut}
          title={collapsed ? "Abmelden" : undefined}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 mx-0 text-sm transition-colors",
            collapsed && "justify-center"
          )}
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--destructive)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted-foreground)")}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span>Abmelden</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-2 text-xs transition-colors"
          style={{ color: "var(--muted-foreground)", borderTop: "1px solid var(--border)" }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
