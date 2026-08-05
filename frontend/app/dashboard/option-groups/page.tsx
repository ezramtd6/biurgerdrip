"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Input, Select, Modal, Table } from "@/components/ui";
import { OptionGroup, Product } from "@/types";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ErrorDialog from "@/components/common/ErrorDialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  product: z.string().min(1, "Product is required"),
  name: z.string().min(1, "Name is required"),
  name_amharic: z.string().min(1, "Name in Amharic is required"),
  price: z.coerce.number().refine((v) => v >= 0, "Amount is required"),
  required: z.boolean().optional(),
  multiple_choice: z.boolean().optional(),
});

type OptionGroupForm = z.infer<typeof schema>;

export default function OptionGroupsPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<OptionGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<OptionGroup | null>(null);
  const [valueModalOpen, setValueModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OptionGroup | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: groups, isLoading } = useQuery<OptionGroup[]>({
    queryKey: ["admin-option-groups"],
    queryFn: async () => {
      const res = await api.get("/option-groups/");
      return res.data.results || res.data;
    },
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["admin-products-list"],
    queryFn: async () => {
      const res = await api.get("/products/");
      return res.data.results || res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: OptionGroupForm) =>
      api.post("/option-groups/", {
        product: Number(data.product),
        name: data.name,
        name_amharic: data.name_amharic,
        price: data.price,
        required: data.required || false,
        multiple_choice: data.multiple_choice || false,
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-option-groups"] }); setIsOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: OptionGroupForm }) =>
      api.put(`/option-groups/${id}/`, {
        product: Number(data.product),
        name: data.name,
        name_amharic: data.name_amharic,
        price: data.price,
        required: data.required || false,
        multiple_choice: data.multiple_choice || false,
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-option-groups"] }); setIsOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/option-groups/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-option-groups"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: (g: OptionGroup) => api.patch(`/option-groups/${g.id}/`, { is_active: !g.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-option-groups"] }),
    onError: (e: unknown) => setErrorMessage((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to update status"),
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<OptionGroupForm>({
    resolver: zodResolver(schema),
  });

  const requiredVal = watch("required");
  const multipleVal = watch("multiple_choice");

  const openCreate = () => { setEditing(null); reset({ product: "", name: "", name_amharic: "", price: 0, required: false, multiple_choice: false }); setIsOpen(true); };
  const openEdit = (g: OptionGroup) => { setEditing(g); reset({ product: String(g.product), name: g.name, name_amharic: g.name_amharic, price: Number(g.price), required: g.required, multiple_choice: g.multiple_choice }); setIsOpen(true); };

  const onSubmit = (data: OptionGroupForm) => {
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  if (isLoading) return <Loading />;

  const getProductName = (id: number) => products?.find((p) => p.id === id)?.name || "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Option Groups</h1>
        <Button onClick={openCreate}>Add Option Group</Button>
      </div>

      {!groups || groups.length === 0 ? (
        <EmptyState message="No option groups yet" />
      ) : (
        <Table
          columns={[
            { key: "id", header: "ID" },
            { key: "name", header: "Name" },
            { key: "product", header: "Product", render: (item: Record<string, unknown>) => getProductName(item.product as number) },
            { key: "required", header: "Required", render: (item: Record<string, unknown>) => (item.required as boolean) ? "✓" : "—" },
            { key: "multiple_choice", header: "Multi", render: (item: Record<string, unknown>) => (item.multiple_choice as boolean) ? "✓" : "—" },
            {
              key: "is_active",
              header: "Status",
              render: (item: Record<string, unknown>) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {item.is_active ? "Active" : "Frozen"}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (item: Record<string, unknown>) => {
                const group = item as unknown as OptionGroup;
                return (
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedGroup(group); setValueModalOpen(true); }}>Values</Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(group)}>Edit</Button>
                    <Button variant={group.is_active ? "secondary" : "brand"} size="sm" loading={toggleMutation.isPending && toggleMutation.variables === group} onClick={() => toggleMutation.mutate(group)}>
                      {group.is_active ? "Freeze" : "Unfreeze"}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(group)}>Delete</Button>
                  </div>
                );
              },
            },
          ]}
          data={groups as unknown as Record<string, unknown>[]}
        />
      )}

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setEditing(null); }} title={editing ? "Edit Option Group" : "Add Option Group"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Product"
            placeholder="Select product"
            error={errors.product?.message}
            options={products?.map((p) => ({ value: p.id, label: p.name })) || []}
            {...register("product")}
          />
          <Input label="Name (English)" placeholder="e.g. Size, Sauce, Extras" error={errors.name?.message} {...register("name")} />
          <Input label="Name (Amharic)" error={errors.name_amharic?.message} {...register("name_amharic")} />
          <Input label="Amount (ETB)" type="number" step="0.01" placeholder="e.g. 0.00" error={errors.price?.message} {...register("price")} />
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" {...register("required")} />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="rounded" {...register("multiple_choice")} />
              Multiple Choice
            </label>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      {selectedGroup && (
        <OptionValuesModal
          isOpen={valueModalOpen}
          onClose={() => { setValueModalOpen(false); setSelectedGroup(null); }}
          group={selectedGroup}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
        title="Delete option group"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        destructive
      />
      <ErrorDialog open={!!errorMessage} onClose={() => setErrorMessage(null)} message={errorMessage || ""} />
    </div>
  );
}

function OptionValuesModal({ isOpen, onClose, group }: { isOpen: boolean; onClose: () => void; group: OptionGroup }) {
  const queryClient = useQueryClient();

  const { data: values } = useQuery({
    queryKey: ["admin-option-values", group.id],
    queryFn: async () => {
      const res = await api.get(`/option-values/?option_group=${group.id}`);
      return res.data.results || res.data;
    },
    enabled: isOpen,
  });

  const [showAdd, setShowAdd] = useState(false);
  const [editingValue, setEditingValue] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [newNameAmharic, setNewNameAmharic] = useState("");
  const [newPrice, setNewPrice] = useState("0");

  const resetForm = () => { setEditingValue(null); setNewName(""); setNewNameAmharic(""); setNewPrice("0"); setShowAdd(false); };

  const addMutation = useMutation({
    mutationFn: () => api.post("/option-values/", {
      option_group: group.id,
      name: newName,
      name_amharic: newNameAmharic,
      price_adjustment: Number(newPrice),
      available: true,
      display_order: 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-option-values", group.id] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (id: number) => api.put(`/option-values/${id}/`, {
      option_group: group.id,
      name: newName,
      name_amharic: newNameAmharic,
      price_adjustment: Number(newPrice),
      available: true,
      display_order: 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-option-values", group.id] });
      resetForm();
    },
  });

  const openEdit = (v: any) => {
    setEditingValue(v);
    setNewName(v.name);
    setNewNameAmharic(v.name_amharic || "");
    setNewPrice(String(v.price_adjustment ?? 0));
    setShowAdd(true);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/option-values/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-option-values", group.id] }),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${group.name} - Values`} maxWidth="lg">
      <div className="space-y-3 mb-4">
        {values?.map((v: any) => (
          <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <span className="text-sm font-medium">{v.name}</span>
              {v.name_amharic && <span className="ml-1 text-sm text-gray-500">({v.name_amharic})</span>}
              {Number(v.price_adjustment) > 0 && (
                <span className="ml-2 text-xs text-green-600">+${Number(v.price_adjustment).toFixed(2)}</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => openEdit(v)}>Edit</Button>
              <Button variant="danger" size="sm" onClick={() => deleteMutation.mutate(v.id)}>Delete</Button>
            </div>
          </div>
        ))}
        {(!values || values.length === 0) && <p className="text-sm text-gray-400">No values yet</p>}
      </div>

      {showAdd ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name (English)" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
            <input value={newNameAmharic} onChange={(e) => setNewNameAmharic(e.target.value)} placeholder="Name (Amharic)" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="flex gap-2">
            <input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} type="number" step="0.01" placeholder="Price adj." className="flex-1 px-3 py-2 border rounded-lg text-sm" />
            <Button size="sm" onClick={() => (editingValue ? updateMutation.mutate(editingValue.id) : addMutation.mutate())} loading={addMutation.isPending || updateMutation.isPending}>
              {editingValue ? "Update" : "Add"}
            </Button>
            <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Value</Button>
      )}
    </Modal>
  );
}
