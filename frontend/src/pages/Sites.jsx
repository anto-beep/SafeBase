import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Buildings, Plus, MapPin, Trash, PencilSimple, X } from "@phosphor-icons/react";
import { toast } from "sonner";
import AddressAutocomplete from "@/components/AddressAutocomplete";

const EMPTY = {
  name: "", address: "", lat: null, lng: null, place_id: "",
  geofence_radius_m: 0,
  site_contact_name: "", site_contact_phone: "", site_contact_email: "",
  notes: "",
};

export default function Sites() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null); // {site_id?, ...} or null
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/sites").then((r) => setRows(r.data || []));
  useEffect(() => { load(); }, []);

  const startNew = () => setEditing({ ...EMPTY });
  const startEdit = (row) => setEditing({ ...row });
  const cancel = () => setEditing(null);
  const patch = (k, v) => setEditing((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (!editing.name?.trim()) return toast.error("Site name is required");
    setSaving(true);
    try {
      if (editing.site_id) {
        await api.patch(`/sites/${editing.site_id}`, editing);
      } else {
        await api.post("/sites", editing);
      }
      toast.success("Site saved");
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const archive = async (row) => {
    if (!window.confirm(`Archive "${row.name}"?`)) return;
    try {
      await api.delete(`/sites/${row.site_id}`);
      toast.success("Archived");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Archive failed");
    }
  };

  return (
    <div className="space-y-6" data-testid="sites-page">
      <div className="border-b-2 border-ink pb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="label-eyebrow flex items-center gap-2"><Buildings size={14} /><span>Site / Location Register</span></div>
          <h1 className="font-display text-4xl font-black tracking-tighter mt-2">Your sites.</h1>
          <p className="text-muted-foreground mt-2 text-sm">Account-wide register of physical sites you work at. Used by Incidents (Where & When), SWMS, inspections, and toolbox talks.</p>
        </div>
        <Button onClick={startNew} className="btn-sharp bg-ink text-white hover:bg-authority h-11" data-testid="add-site-btn">
          <Plus className="mr-2" weight="bold" /> Add site
        </Button>
      </div>

      {editing && (
        <div className="bg-background border-2 border-ink p-5 space-y-4" data-testid="site-form">
          <div className="flex items-center justify-between">
            <div className="font-display text-xl font-black">{editing.site_id ? "Edit site" : "New site"}</div>
            <button onClick={cancel} aria-label="Close" className="w-8 h-8 flex items-center justify-center hover:bg-muted"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="label-eyebrow">Site name *</Label>
              <Input value={editing.name} onChange={(e) => patch("name", e.target.value)} placeholder="e.g. Botany Bay Depot" className="mt-1 h-11 rounded-none border-ink" data-testid="site-name" />
            </div>
            <div>
              <Label className="label-eyebrow">Geofence radius (m)</Label>
              <Input type="number" min="0" max="5000" value={editing.geofence_radius_m} onChange={(e) => patch("geofence_radius_m", Number(e.target.value) || 0)} className="mt-1 h-11 rounded-none border-ink" />
            </div>
            <div className="md:col-span-2">
              <Label className="label-eyebrow">Address (Google search)</Label>
              <AddressAutocomplete
                value={editing.address}
                onChange={(v) => patch("address", v)}
                onSelect={(place) => {
                  patch("address", place.formatted_address || place.name || "");
                  const loc = place.geometry?.location;
                  patch("lat", loc?.lat ? loc.lat() : null);
                  patch("lng", loc?.lng ? loc.lng() : null);
                  patch("place_id", place.place_id || "");
                }}
                placeholder="Start typing an address…"
                data-testid="site-address"
              />
            </div>
            <div>
              <Label className="label-eyebrow">Site contact name</Label>
              <Input value={editing.site_contact_name} onChange={(e) => patch("site_contact_name", e.target.value)} className="mt-1 h-11 rounded-none border-ink" />
            </div>
            <div>
              <Label className="label-eyebrow">Site contact phone</Label>
              <Input value={editing.site_contact_phone} onChange={(e) => patch("site_contact_phone", e.target.value)} className="mt-1 h-11 rounded-none border-ink" />
            </div>
            <div className="md:col-span-2">
              <Label className="label-eyebrow">Site contact email</Label>
              <Input value={editing.site_contact_email} onChange={(e) => patch("site_contact_email", e.target.value)} className="mt-1 h-11 rounded-none border-ink" />
            </div>
            <div className="md:col-span-2">
              <Label className="label-eyebrow">Notes</Label>
              <Textarea rows={3} value={editing.notes} onChange={(e) => patch("notes", e.target.value)} placeholder="Access instructions, parking, gate codes, etc." className="mt-1 rounded-none border-ink" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="btn-sharp border-ink h-11" onClick={cancel}>Cancel</Button>
            <Button className="btn-sharp bg-ink text-white hover:bg-authority h-11" onClick={save} disabled={saving} data-testid="save-site-btn">
              {saving ? "Saving…" : "Save site"}
            </Button>
          </div>
        </div>
      )}

      <div className="border border-border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-ink text-warning text-left text-xs uppercase tracking-widest">
            <tr>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.site_id} className="border-t border-border" data-testid={`site-row-${r.site_id}`}>
                <td className="px-4 py-3"><div className="font-bold">{r.name}</div>{r.geofence_radius_m > 0 && <div className="text-[10px] text-muted-foreground">Geofence {r.geofence_radius_m}m</div>}</td>
                <td className="px-4 py-3 text-xs">{r.address ? <span className="inline-flex items-center gap-1"><MapPin size={12} />{r.address}</span> : <span className="text-muted-foreground">—</span>}</td>
                <td className="px-4 py-3 text-xs">{r.site_contact_name || "—"}{r.site_contact_phone ? ` · ${r.site_contact_phone}` : ""}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => startEdit(r)} className="p-1.5 hover:bg-muted inline-flex items-center gap-1 text-xs" data-testid={`edit-site-${r.site_id}`}><PencilSimple size={14} /></button>
                  <button onClick={() => archive(r)} className="p-1.5 hover:bg-muted inline-flex items-center gap-1 text-xs text-destructive ml-2" data-testid={`archive-site-${r.site_id}`}><Trash size={14} /></button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No sites yet. <button onClick={startNew} className="underline">Add your first site →</button></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
