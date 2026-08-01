import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Brain, Database, Eye, Pencil, Plus, Trash2, Upload, Search } from "lucide-react";
import { AppShell, SkeletonCard, EmptyState } from "@/components/aqt/app-shell";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/aqt";

export const Route = createFileRoute("/schemas")({ component: Schemas });

const FIELD_TYPES = ["string", "number", "integer", "boolean", "date", "currency", "email", "phone", "url", "list", "object"];

function Schemas() {
  const qc = useQueryClient();
  const [form, setForm] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newFields, setNewFields] = useState([{ name: "", type: "string", description: "", required: false }]);

  const { data, isLoading } = useQuery({
    queryKey: ["schemas"],
    queryFn: () => api.get("/schemas").then((r) => r.data.schemas ?? []),
  });
  const schemas = data ?? [];
  const [search, setSearch] = useState("");
  const filtered = schemas.filter((s: { name: string; description: string }) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/schemas/${id}`),
    onSuccess: () => { toast.success("Schema deleted"); qc.invalidateQueries({ queryKey: ["schemas"] }); },
  });

  const createMut = useMutation({
    mutationFn: () => api.post("/schemas", { name: newName, description: newDesc, domain: newDomain, fields: newFields }),
    onSuccess: () => {
      toast.success("Schema created");
      qc.invalidateQueries({ queryKey: ["schemas"] });
      setForm(false);
      setNewName(""); setNewDesc(""); setNewDomain("");
      setNewFields([{ name: "", type: "string", description: "", required: false }]);
    },
    onError: () => toast.error("Failed to create schema"),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.post("/schemas/upload", fd);
    },
    onSuccess: (res) => {
      toast.success(`Schema uploaded (adapted from: ${res.data.adapted_from ?? "json"})`);
      qc.invalidateQueries({ queryKey: ["schemas"] });
    },
    onError: () => toast.error("Upload failed"),
  });

  const addField = () => setNewFields((f) => [...f, { name: "", type: "string", description: "", required: false }]);
  const removeField = (i: number) => setNewFields((f) => f.filter((_, idx) => idx !== i));
  const updateField = (i: number, key: string, val: string | boolean) =>
    setNewFields((f) => f.map((field, idx) => idx === i ? { ...field, [key]: val } : field));

  return (
    <AppShell
      title="Schemas"
      subtitle="Manage extraction schemas for structured data output"
      sectionLabel="SCHEMA MANAGEMENT"
      actions={
        <>
          <label className="cursor-pointer">
            <Button variant="outline" asChild><span><Upload className="h-4 w-4" />Upload JSON</span></Button>
            <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && uploadMut.mutate(e.target.files[0])} />
          </label>
          <Button onClick={() => setForm(!form)} style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)", border: "none" }} className="font-black text-white"><Plus className="h-4 w-4" />New Schema</Button>
          <Button variant="outline" onClick={() => toast("Go to Intelligence → Auto Schema")}><Brain className="h-4 w-4" />Auto-Generate</Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* New schema form */}
        {form && (
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-black">New Schema</h2>
            <div className="mt-4 grid gap-3">
              <input placeholder="Schema Name *" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-11 rounded-lg border border-input bg-card px-3" />
              <textarea placeholder="Description" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="rounded-lg border border-input bg-card p-3" />
              <input placeholder="Domain (optional)" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} className="h-11 rounded-lg border border-input bg-card px-3" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground"><tr><th>Name</th><th>Type</th><th>Description</th><th>Req</th><th /></tr></thead>
                  <tbody>
                    {newFields.map((field, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-2"><input value={field.name} onChange={(e) => updateField(i, "name", e.target.value)} placeholder="field_name" className="h-9 rounded-lg border border-input bg-card px-2" /></td>
                        <td><select value={field.type} onChange={(e) => updateField(i, "type", e.target.value)} className="h-9 rounded-lg border border-input bg-card px-2">{FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}</select></td>
                        <td><input value={field.description} onChange={(e) => updateField(i, "description", e.target.value)} placeholder="Description (helps AI)" className="h-9 rounded-lg border border-input bg-card px-2" /></td>
                        <td><input type="checkbox" checked={field.required} onChange={(e) => updateField(i, "required", e.target.checked)} /></td>
                        <td><Button size="icon" variant="ghost" onClick={() => removeField(i)}><Trash2 className="h-4 w-4" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={addField}><Plus className="h-4 w-4" />Add Field</Button>
                <Button variant="outline" onClick={() => setForm(false)}>Cancel</Button>
                <Button onClick={() => createMut.mutate()} disabled={!newName || createMut.isPending}>Save Schema</Button>
              </div>
            </div>
          </section>
        )}

        {/* Schema cards */}
        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : schemas.length === 0 && !form ? (
          <EmptyState icon={Database} title="No schemas yet" description="Create a schema to define what fields to extract, or upload a JSON schema file."
            action={() => setForm(true)} actionLabel="+ Create Schema" />
        ) : (
          <>
            {/* Search bar */}
            {schemas.length > 3 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search schemas..."
                  className="w-full h-10 rounded-xl pl-9 pr-4 text-sm"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#f8fafc" }} />
              </div>
            )}
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((schema: { id: string; name: string; description: string; field_count: number; domain: string; created_at: string; fields?: Array<{ name: string; type: string; required: boolean }> }) => (
                <article key={schema.id} className="rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl overflow-hidden"
                  style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <h2 className="text-lg font-black truncate" title={schema.name}>{schema.name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{schema.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{schema.field_count} fields</span>
                    {schema.domain && <span className="rounded-full bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">{schema.domain}</span>}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{schema.created_at ? new Date(schema.created_at).toLocaleDateString() : ""}</p>
                  <p className="mt-1 font-mono text-xs text-primary">{schema.id.slice(0, 16)}...</p>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setViewing(viewing === schema.id ? null : schema.id)}><Eye className="h-4 w-4" />Fields</Button>
                    <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete schema?")) deleteMut.mutate(schema.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  {viewing === schema.id && schema.fields && (
                    <div className="mt-4 max-h-40 overflow-y-auto rounded-lg bg-muted/40 p-3">
                      {schema.fields.map((f) => (
                        <div key={f.name} className="flex items-center gap-2 py-0.5 text-xs">
                          <span className="font-mono text-foreground">{f.name}</span>
                          <span className="rounded bg-muted px-1 text-muted-foreground">{f.type}</span>
                          {f.required && <span className="text-destructive">*</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
