import { useEffect, useMemo } from "react";
import { KeyRound, Link2, Cpu } from "lucide-react";
import { providers, saveStoredKey, storedKey, type ProviderKey } from "@/lib/aqt";

export interface ProviderValues {
  provider: ProviderKey;
  api_key: string;
  model: string;
  base_url: string;
}

interface ProviderConfigProps {
  compact?: boolean;
  value?: ProviderValues;
  onChange?: (values: ProviderValues) => void;
}

const DEFAULT: ProviderValues = {
  provider: "landingai",
  api_key: "",
  model: "dpt-2-latest",
  base_url: "",
};

export function ProviderConfig({ compact = false, value, onChange }: ProviderConfigProps) {
  const vals = value ?? DEFAULT;
  const selected = useMemo(() => providers.find((p) => p.key === vals.provider) ?? providers[0], [vals.provider]);

  // Pre-fill stored key when provider changes
  useEffect(() => {
    const stored = storedKey(vals.provider);
    if (stored && stored !== vals.api_key) {
      onChange?.({ ...vals, api_key: stored, model: selected.model });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vals.provider]);

  const set = (patch: Partial<ProviderValues>) => onChange?.({ ...vals, ...patch });

  return (
    <div className="space-y-3">
      <label className="grid gap-1 text-sm font-semibold text-foreground">
        Provider
        <select
          value={vals.provider}
          onChange={(e) => {
            const p = e.target.value as ProviderKey;
            const def = providers.find((x) => x.key === p);
            set({ provider: p, model: def?.model ?? "", api_key: storedKey(p) });
          }}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {providers.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </label>

      {selected.needsKey && (
        <label className="grid gap-1 text-sm font-semibold text-foreground">
          <span className="inline-flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary" />API Key</span>
          <input
            type="password"
            value={vals.api_key}
            onChange={(e) => { set({ api_key: e.target.value }); saveStoredKey(vals.provider, e.target.value); }}
            placeholder="Stored locally in browser"
            className="h-10 rounded-lg border border-input bg-card px-3 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      )}

      <label className="grid gap-1 text-sm font-semibold text-foreground">
        <span className="inline-flex items-center gap-2"><Cpu className="h-4 w-4 text-primary" />Model</span>
        <input
          value={vals.model}
          onChange={(e) => set({ model: e.target.value })}
          placeholder={selected.model}
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      {selected.needsBaseUrl && (
        <label className="grid gap-1 text-sm font-semibold text-foreground">
          <span className="inline-flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" />Base URL</span>
          <input
            value={vals.base_url}
            onChange={(e) => set({ base_url: e.target.value })}
            placeholder={vals.provider === "landingai" ? "https://va.eu-west-1.landing.ai/" : vals.provider === "ollama" ? "http://localhost:11434" : "Provider endpoint"}
            className="h-10 rounded-lg border border-input bg-card px-3 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      )}

      {!compact && (
        <p className="rounded-xl border border-panel-border bg-primary/5 p-3 text-xs text-muted-foreground">
          API keys are stored locally in your browser and never saved on the server.
        </p>
      )}
    </div>
  );
}
