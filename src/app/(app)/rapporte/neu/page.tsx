import { RapportForm } from "@/components/rapporte/rapport-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NeuerRapportPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/rapporte" className="flex items-center gap-1.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
          <ArrowLeft size={15} /> Zurück
        </Link>
        <span style={{ color: "var(--border)" }}>|</span>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Neuer Servicerapport</h1>
      </div>
      <RapportForm />
    </div>
  );
}
