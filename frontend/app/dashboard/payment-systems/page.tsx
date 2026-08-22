"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Input, Textarea, Modal, Table } from "@/components/ui";
import { PaymentSystem } from "@/types";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ErrorDialog from "@/components/common/ErrorDialog";
import { Search } from "lucide-react";
import { apiErrorMessage } from "@/lib/utils";

interface PaymentSystemForm {
  name: string;
  code: string;
  details: string;
  display_order: string;
  is_active: boolean;
  cashier_enabled: boolean;
  customer_enabled: boolean;
  for_refund: boolean;
}

const emptyForm: PaymentSystemForm = {
  name: "",
  code: "",
  details: "",
  display_order: "0",
  is_active: true,
  cashier_enabled: true,
  customer_enabled: true,
  for_refund: true,
};

export default function PaymentSystemsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentSystem | null>(null);
  const [form, setForm] = useState<PaymentSystemForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentSystem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: systems, isLoading } = useQuery<PaymentSystem[]>({
    queryKey: ["admin-payment-systems"],
    queryFn: async () => {
      const res = await api.get("/orders/payment-systems/");
      return res.data.results || res.data;
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-payment-systems"] });
    queryClient.invalidateQueries({ queryKey: ["payment-systems"] });
  };

  const createMut = useMutation({
    mutationFn: (body: FormData | Record<string, unknown>) => api.post("/orders/payment-systems/", body),
    onSuccess: () => { invalidate(); setOpen(false); },
    onError: (e: unknown) => setFormError(apiErrorMessage(e, "Failed to create payment system")),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: FormData | Record<string, unknown> }) =>
      api.put(`/orders/payment-systems/${id}/`, body),
    onSuccess: () => { invalidate(); setOpen(false); setEditing(null); },
    onError: (e: unknown) => setFormError(apiErrorMessage(e, "Failed to update payment system")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/orders/payment-systems/${id}/`),
    onSuccess: () => invalidate(),
  });

  const toggleMut = useMutation({
    mutationFn: (s: PaymentSystem) => api.patch(`/orders/payment-systems/${s.id}/`, { is_active: !s.is_active }),
    onSuccess: () => invalidate(),
    onError: (e: unknown) => setErrorMessage(apiErrorMessage(e, "Failed to update payment system")),
  });

  const resetForm = () => {
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
    setFormError(null);
  };

  const openCreate = () => { setEditing(null); resetForm(); setOpen(true); };

  const openEdit = (s: PaymentSystem) => {
    setEditing(s);
    setForm({
      name: s.name,
      code: s.code,
      details: s.details,
      display_order: String(s.display_order),
      is_active: s.is_active,
      cashier_enabled: s.cashier_enabled,
      customer_enabled: s.customer_enabled,
      for_refund: s.for_refund,
    });
    setImageFile(null);
    setImagePreview(s.icon || null);
    setFormError(null);
    setOpen(true);
  };

  const buildBody = (): FormData | Record<string, unknown> => {
    const json: Record<string, unknown> = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase().replace(/\s+/g, "_"),
      details: form.details,
      display_order: Number(form.display_order) || 0,
      is_active: form.is_active,
      cashier_enabled: form.cashier_enabled,
      customer_enabled: form.customer_enabled,
      for_refund: form.for_refund,
    };
    if (imageFile) {
      const fd = new FormData();
      Object.entries(json).forEach(([key, value]) => {
        if (value !== null && value !== undefined) fd.append(key, String(value));
      });
      fd.append("icon", imageFile);
      return fd;
    }
    return json;
  };

  const submit = () => {
    setFormError(null);
    if (!form.name.trim()) { setFormError("Name is required"); return; }
    if (!form.code.trim()) { setFormError("Code is required"); return; }
    const body = buildBody();
    if (editing) updateMut.mutate({ id: editing.id, body });
    else createMut.mutate(body);
  };

  if (isLoading) return <Loading />;

  const query = search.trim().toLowerCase();
  const filtered = (systems ?? []).filter((s) =>
    !query || s.name.toLowerCase().includes(query) || s.code.toLowerCase().includes(query)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment Systems</h1>
        <Button onClick={openCreate}>Add Payment System</Button>
      </div>

      {systems && systems.length > 0 && (
        <div className="relative max-w-sm mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payment systems..."
            className="pl-9 pr-3 h-9"
          />
        </div>
      )}

      {!systems || systems.length === 0 ? (
        <EmptyState message="No payment systems yet" />
      ) : (
        <Table<PaymentSystem>
          columns={[
            { key: "id", header: "ID" },
            { key: "name", header: "Name" },
            { key: "code", header: "Code" },
            {
              key: "icon",
              header: "Icon",
              render: (s) =>
                s.icon ? (
                  <img src={s.icon} alt={s.name} className="w-9 h-9 rounded-lg object-cover" />
                ) : (
                  <span className="text-xl">💳</span>
                ),
            },
            {
              key: "details",
              header: "Details",
              render: (s) => (
                <span className="text-gray-600">{s.details || <span className="text-gray-400">—</span>}</span>
              ),
            },
            { key: "display_order", header: "Order" },
            {
              key: "is_active",
              header: "Status",
              render: (s) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {s.is_active ? "Active" : "Frozen"}
                </span>
              ),
            },
            {
              key: "for_refund",
              header: "Refund",
              render: (s) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.for_refund ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-400"}`}>
                  {s.for_refund ? "Refund" : "—"}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (s) => (
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>Edit</Button>
                  <Button variant={s.is_active ? "secondary" : "brand"} size="sm" loading={toggleMut.isPending && toggleMut.variables === s} onClick={() => toggleMut.mutate(s)}>
                    {s.is_active ? "Freeze" : "Unfreeze"}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteTarget(s)}>Delete</Button>
                </div>
              ),
            },
          ]}
          data={filtered}
          emptyMessage="No payment systems match your search"
        />
      )}

      <Modal isOpen={open} onClose={() => { setOpen(false); setEditing(null); }} title={editing ? "Edit Payment System" : "Add Payment System"}>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
          <Input
            label="Name"
            required
            placeholder="e.g. Telebirr"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Code"
            required
            placeholder="e.g. TELEBIRR"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <Textarea
            label="Details / instructions (optional)"
            placeholder="e.g. Pay to 09XXXXXXXX and show confirmation"
            value={form.details}
            onChange={(e) => setForm({ ...form, details: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icon (optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImageFile(file);
                  setImagePreview(URL.createObjectURL(file));
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-400 transition-colors cursor-pointer"
            >
              {imagePreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={imagePreview} alt="Preview" className="w-16 h-16 object-contain rounded-lg" />
                  <span className="text-sm text-gray-500">Click to change</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl">💳</span>
                  <span className="text-sm text-gray-500">Click to upload an icon</span>
                </div>
              )}
            </button>
          </div>
          <Input
            label="Display order"
            type="number"
            min={0}
            value={form.display_order}
            onChange={(e) => setForm({ ...form, display_order: e.target.value })}
          />
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded"
                checked={form.cashier_enabled}
                onChange={(e) => setForm({ ...form, cashier_enabled: e.target.checked })}
              />
              For Cashier
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded"
                checked={form.customer_enabled}
                onChange={(e) => setForm({ ...form, customer_enabled: e.target.checked })}
              />
              For Customer
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="rounded"
                checked={form.for_refund}
                onChange={(e) => setForm({ ...form, for_refund: e.target.checked })}
              />
              For Refund
            </label>
          </div>

          {formError && <p className="text-sm text-red-500">{formError}</p>}

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createMut.isPending || updateMut.isPending}>
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMut.mutate(deleteTarget.id); setDeleteTarget(null); }}
        title="Delete payment system"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        destructive
      />

      <ErrorDialog open={!!errorMessage} onClose={() => setErrorMessage(null)} message={errorMessage || ""} />
    </div>
  );
}