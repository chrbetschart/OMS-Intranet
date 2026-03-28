"use client";

import { RapportForm } from "@/components/rapporte/rapport-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function RapportBearbeitenPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/rapporte/${id}`} className="flex items-center gap-1.5 text-sm" style={{ color: "var(--muted-foreground)" }}>
          <ArrowLeft size={15} /> Zurück
        </Link>
        <span style={{ color: "var(--border)" }}>|</span>
        <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>Rapport bearbeiten</h1>
      </div>
      <RapportForm editId={id} />
    </div>
  );
}
