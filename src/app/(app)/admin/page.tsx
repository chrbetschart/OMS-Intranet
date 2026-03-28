"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import type { Profile, Kategorie } from "@/types/database";
import { Plus, Edit2, Trash2, X } from "lucide-react";

export default function AdminPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [users, setUsers] = useState<Profile[]>([]);
  const [kategorien, setKategorien] = useState<Kategorie[]>([]);
  const [tab, setTab] = useState<"benutzer" | "kategorien">("benutzer");

  // User modal
  const [userModal, setUserModal] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<Profile["role"]>("techniker");
  const [userSaving, setUserSaving] = useState(false);

  // Kategorie modal
  const [katModal, setKatModal] = useState(false);
  const [editKat, setEditKat] = useState<Kategorie | null>(null);
  const [katName, setKatName] = useState("");
  const [katFarbe, setKatFarbe] = useState("#3b82f6");
  const [katSaving, setKatSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) { router.push("/"); return; }
    loadAll();
  }, [isAdmin]);

  async function loadAll() {
    const [{ data: u }, { data: k }] = await Promise.all([
      supabase.from("profiles").select("*").order("name"),
      supabase.from("kategorien").select("*").order("name"),
    ]);
    setUsers(u || []);
    setKategorien(k || []);
  }

  function openNewUser() {
    setEditUser(null); setUserName(""); setUserEmail(""); setUserPassword(""); setUserRole("techniker");
    setUserModal(true);
  }

  function openEditUser(u: Profile) {
    setEditUser(u); setUserName(u.name); setUserEmail(u.email); setUserPassword(""); setUserRole(u.role);
    setUserModal(true);
  }

  async function saveUser() {
    if (!userName || !userEmail) return alert("Name und E-Mail sind erforderlich.");
    setUserSaving(true);

    if (editUser) {
      await supabase.from("profiles").update({ name: userName, role: userRole }).eq("id", editUser.id);
    } else {
      if (!userPassword) return alert("Passwort ist erforderlich.");
      const { data, error } = await supabase.auth.admin.createUser({
        email: userEmail,
        password: userPassword,
        email_confirm: true,
      });
      if (error || !data.user) { alert("Fehler: " + error?.message); setUserSaving(false); return; }
      await supabase.from("profiles").insert({ id: data.user.id, email: userEmail, name: userName, role: userRole, aktiv: true });
    }

    setUserSaving(false);
    setUserModal(false);
    loadAll();
  }

  async function deleteUser(u: Profile) {
    if (!confirm(`Benutzer "${u.name}" wirklich löschen?`)) return;
    await supabase.from("profiles").update({ aktiv: false }).eq("id", u.id);
    loadAll();
  }

  function openNewKat() { setEditKat(null); setKatName(""); setKatFarbe("#3b82f6"); setKatModal(true); }
  function openEditKat(k: Kategorie) { setEditKat(k); setKatName(k.name); setKatFarbe(k.farbe); setKatModal(true); }

  async function saveKat() {
    if (!katName) return alert("Name ist erforderlich.");
    setKatSaving(true);
    if (editKat) {
      await supabase.from("kategorien").update({ name: katName, farbe: katFarbe }).eq("id", editKat.id);
    } else {
      await supabase.from("kategorien").insert({ name: katName, farbe: katFarbe });
    }
    setKatSaving(false);
    setKatModal(false);
    loadAll();
  }

  async function deleteKat(k: Kategorie) {
    if (!confirm(`Kategorie "${k.name}" löschen?`)) return;
    await supabase.from("kategorien").delete().eq("id", k.id);
    loadAll();
  }

  const ROLE_LABELS = { techniker: "Techniker", lagerverwalter: "Lagerverwalter", administrator: "Administrator" };
  const ROLE_COLORS = { techniker: "#3b82f6", lagerverwalter: "#22c55e", administrator: "#ef4444" };

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Administration</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted-foreground)" }}>Benutzer und Kategorien verwalten</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        {(["benutzer", "kategorien"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors"
            style={{
              background: tab === t ? "var(--primary)" : "transparent",
              color: tab === t ? "white" : "var(--muted-foreground)",
            }}
          >
            {t === "benutzer" ? "Benutzer" : "Kategorien"}
          </button>
        ))}
      </div>

      {tab === "benutzer" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={openNewUser} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--primary)", color: "white" }}>
              <Plus size={16} /> Benutzer anlegen
            </button>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}>
                <tr>
                  {["Name", "E-Mail", "Rolle", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--border)", background: "var(--background)" }}>
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)" }}>{u.name}</td>
                    <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: ROLE_COLORS[u.role] + "22", color: ROLE_COLORS[u.role] }}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: u.aktiv ? "#22c55e" : "#ef4444" }}>{u.aktiv ? "Aktiv" : "Inaktiv"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEditUser(u)} className="p-1.5 rounded" style={{ color: "var(--muted-foreground)" }}><Edit2 size={13} /></button>
                        <button onClick={() => deleteUser(u)} className="p-1.5 rounded" style={{ color: "var(--destructive)" }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "kategorien" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={openNewKat} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--primary)", color: "white" }}>
              <Plus size={16} /> Kategorie anlegen
            </button>
          </div>
          <div className="space-y-2">
            {kategorien.map((k) => (
              <div key={k.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ background: k.farbe }} />
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{k.name}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditKat(k)} className="p-1.5 rounded" style={{ color: "var(--muted-foreground)" }}><Edit2 size={13} /></button>
                  <button onClick={() => deleteKat(k)} className="p-1.5 rounded" style={{ color: "var(--destructive)" }}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Modal */}
      {userModal && (
        <Modal title={editUser ? "Benutzer bearbeiten" : "Neuer Benutzer"} onClose={() => setUserModal(false)}>
          <div className="space-y-3 p-5">
            <MField label="Name *">
              <input value={userName} onChange={(e) => setUserName(e.target.value)} className={ic} style={is} />
            </MField>
            {!editUser && (
              <MField label="E-Mail *">
                <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} className={ic} style={is} />
              </MField>
            )}
            {!editUser && (
              <MField label="Passwort *">
                <input type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} className={ic} style={is} />
              </MField>
            )}
            <MField label="Rolle">
              <select value={userRole} onChange={(e) => setUserRole(e.target.value as Profile["role"])} className={ic} style={is}>
                <option value="techniker">Techniker</option>
                <option value="lagerverwalter">Lagerverwalter</option>
                <option value="administrator">Administrator</option>
              </select>
            </MField>
          </div>
          <ModalFooter onClose={() => setUserModal(false)} onSave={saveUser} saving={userSaving} />
        </Modal>
      )}

      {/* Kategorie Modal */}
      {katModal && (
        <Modal title={editKat ? "Kategorie bearbeiten" : "Neue Kategorie"} onClose={() => setKatModal(false)}>
          <div className="space-y-3 p-5">
            <MField label="Name *">
              <input value={katName} onChange={(e) => setKatName(e.target.value)} className={ic} style={is} />
            </MField>
            <MField label="Farbe">
              <div className="flex items-center gap-3">
                <input type="color" value={katFarbe} onChange={(e) => setKatFarbe(e.target.value)} className="w-10 h-10 rounded cursor-pointer" style={{ background: "transparent", border: "none" }} />
                <input value={katFarbe} onChange={(e) => setKatFarbe(e.target.value)} className={ic} style={is} placeholder="#3b82f6" />
              </div>
            </MField>
          </div>
          <ModalFooter onClose={() => setKatModal(false)} onSave={saveKat} saving={katSaving} />
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-md rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>{title}</h2>
          <button onClick={onClose} style={{ color: "var(--muted-foreground)" }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalFooter({ onClose, onSave, saving }: { onClose: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="flex justify-end gap-2 px-5 py-4" style={{ borderTop: "1px solid var(--border)" }}>
      <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--foreground)" }}>Abbrechen</button>
      <button onClick={onSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50" style={{ background: "var(--primary)", color: "white" }}>{saving ? "..." : "Speichern"}</button>
    </div>
  );
}

function MField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</label>
      {children}
    </div>
  );
}

const ic = "w-full px-3 py-2 rounded-lg text-sm outline-none";
const is = { background: "var(--input)", border: "1px solid var(--border)", color: "var(--foreground)" };
