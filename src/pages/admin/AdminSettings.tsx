// src/pages/admin/AdminSettings.tsx — versiune completă cu toate câmpurile editabile
// ÎNLOCUIEȘTE complet fișierul existent

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Save,
  Loader2,
  DollarSign,
  FileText,
  Waves,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

interface SettingsRow {
  key: string;
  value: string;
  type: "text" | "number" | "textarea" | "boolean";
  label: string;
  group_name: string;
  sort_order: number;
}

// Secțiuni colapsabile
const Section = ({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={17} className="text-primary" />
          <span className="font-heading text-base font-semibold">{title}</span>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-2 border-t border-border space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

const AdminSettings = () => {
  const [rows, setRows] = useState<SettingsRow[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Încarcă setările din DB ──────────────────────────────────────────────
  useEffect(() => {
    apiGet<{ success: boolean; rows: SettingsRow[] }>("/api/settings")
      .then((res) => {
        setRows(res.rows || []);
        const initial: Record<string, string> = {};
        (res.rows || []).forEach((r) => {
          initial[r.key] = r.value;
        });
        setValues(initial);
      })
      .catch(() =>
        toast({
          title: "Eroare la încărcarea setărilor",
          variant: "destructive",
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  const update = (key: string, val: string) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  // ── Salvare batch ────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    try {
      // Folosim PATCH /api/settings (batch)
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const token = sessionStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Eroare la salvare");
      toast({ title: "✅ Setările au fost salvate cu succes" });
    } catch {
      toast({ title: "Eroare la salvare", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Câmp generic bazat pe type ────────────────────────────────────────────
  const Field = ({ row }: { row: SettingsRow }) => {
    const val = values[row.key] ?? row.value;
    const cls =
      "w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring";

    if (row.type === "textarea") {
      return (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            {row.label}
          </label>
          <textarea
            defaultValue={val}
            onBlur={(e) => update(row.key, e.target.value)}
            rows={3}
            className={`${cls} resize-y`}
          />
        </div>
      );
    }

    if (row.type === "number") {
      return (
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
            {row.label}
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              defaultValue={val}
              onBlur={(e) => update(row.key, e.target.value)}
              className={`${cls} pr-14`}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
              RON
            </span>
          </div>
        </div>
      );
    }

    return (
      <div>
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
          {row.label}
        </label>
        <input
          type="text"
          defaultValue={val}
          onBlur={(e) => update(row.key, e.target.value)}
          className={cls}
        />
      </div>
    );
  };

  const byGroup = (group: string) =>
    rows
      .filter((r) => r.group_name === group)
      .sort((a, b) => a.sort_order - b.sort_order);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl">Setări Pensiune</h2>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          Salvează Toate
        </Button>
      </div>

      {/* ── 1. PREȚURI ──────────────────────────────────────────────────────── */}
      <Section title="Prețuri Servicii Suplimentare" icon={DollarSign}>
        <p className="text-xs text-muted-foreground mb-3">
          Aceste prețuri sunt afișate clienților în formularul de rezervare și
          se calculează automat în total.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {byGroup("prices").map((row) => (
            <Field key={row.key} row={row} />
          ))}
        </div>

        {/* Preview calcul */}
        {values.price_breakfast && (
          <div className="mt-4 bg-muted/40 rounded-lg p-4 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground mb-2">
              Exemplu calcul — 2 persoane, 3 nopți:
            </p>
            <p>
              ☕ Mic dejun: {values.price_breakfast} × 2 pers × 3 nopți ={" "}
              <strong>{parseInt(values.price_breakfast || "0") * 6} RON</strong>
            </p>
            <p>
              🍽️ Cină: {values.price_dinner} × 2 pers × 3 nopți ={" "}
              <strong>{parseInt(values.price_dinner || "0") * 6} RON</strong>
            </p>
            <p>
              🛏️ 1 pat suplimentar × 3 nopți ={" "}
              <strong>{parseInt(values.price_extra_bed || "0") * 3} RON</strong>
            </p>
            <p>
              🌊 Ciubăr (1 sesiune): <strong>{values.price_jacuzzi} RON</strong>
            </p>
          </div>
        )}
      </Section>

      {/* ── 2. CONȚINUT HOME — Povestea Noastră ─────────────────────────────── */}
      <Section
        title='Conținut Home — "Povestea Noastră"'
        icon={FileText}
        defaultOpen={false}
      >
        <p className="text-xs text-muted-foreground mb-3">
          Textele din secțiunea "Povestea Noastră" de pe pagina principală. Poza
          rămâne cea de copertă (hero).
        </p>
        {byGroup("content_home").map((row) => (
          <Field key={row.key} row={row} />
        ))}
      </Section>

      {/* ── 3. CONȚINUT ABOUT — Povestea Pensiunii ──────────────────────────── */}
      <Section
        title='Conținut About — "Povestea Pensiunii"'
        icon={FileText}
        defaultOpen={false}
      >
        <p className="text-xs text-muted-foreground mb-3">
          Textele din secțiunea "Povestea Pensiunii" de pe pagina Despre Noi.
          Poza se schimbă din secțiunea Imagini → Despre Noi.
        </p>
        {byGroup("content_about").map((row) => (
          <Field key={row.key} row={row} />
        ))}
      </Section>

      {/* ── 4. FACILITĂȚI — titluri & descrieri ─────────────────────────────── */}
      <Section
        title="Facilități — Titluri & Descrieri"
        icon={Waves}
        defaultOpen={false}
      >
        <p className="text-xs text-muted-foreground mb-3">
          Editează titlul și descrierea fiecărei facilități din pagina Despre
          Noi. Pozele se schimbă din secțiunea Imagini → Facilități.
        </p>
        <div className="space-y-5">
          {[
            "jacuzzi",
            "bikes",
            "pingpong",
            "sleds",
            "grill",
            "parking",
            "playground",
            "traditional",
          ].map((key) => {
            const titleRow = rows.find(
              (r) => r.key === `facility_${key}_title`,
            );
            const descRow = rows.find((r) => r.key === `facility_${key}_desc`);
            if (!titleRow || !descRow) return null;
            return (
              <div
                key={key}
                className="border border-border rounded-xl p-4 space-y-3"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {titleRow.label.replace("Facilitate: Titlu ", "")}
                </p>
                <Field row={titleRow} />
                <Field row={descRow} />
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── 5. Informații Pensiune (existente) ──────────────────────────────── */}
      <Section
        title="Informații Generale Pensiune"
        icon={FileText}
        defaultOpen={false}
      >
        <p className="text-xs text-muted-foreground mb-3">
          Aceste informații apar în footer, pagina de contact și emailurile
          trimise clienților.
        </p>
        {byGroup("general").map((row) => (
          <Field key={row.key} row={row} />
        ))}
      </Section>

      {/* Buton salvare final */}
      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving} size="lg" className="gap-2">
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Salvează Toate Setările
        </Button>
      </div>
    </div>
  );
};

export default AdminSettings;
