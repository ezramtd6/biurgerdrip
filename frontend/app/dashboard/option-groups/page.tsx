"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Input, Select, Modal, Table } from "@/components/ui";
import { OptionGroup, Product } from "@/types";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  product: z.string().min(1, "Product is required"),
  name: z.string().min(1, "Name is required"),
  required: z.boolean().optional(),
  multiple_choice: z.boolean().optional(),
  display_order: z.string().optional(),
});

type OptionGroupForm = z.infer<typeof schema>;

export default function OptionGroupsPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<OptionGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<OptionGroup | null>(null);
  const [valueModalOpen, setValueModalOpen] = useState(false);

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
        required: data.required || false,
        multiple_choice: data.multiple_choice || false,
        display_order: Number(data.display_order) || 0,
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-option-groups"] }); setIsOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: OptionGroupForm }) =>
      api.put(`/option-groups/${id}/`, {
        product: Number(data.product),
        name: data.name,
        required: data.required || false,
        multiple_choice: data.multiple_choice || false,
        display_order: Number(data.display_order) || 0,
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-option-groups"] }); setIsOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/option-groups/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-option-groups"] }),
  });

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<OptionGroupForm>({
    resolver: zodResolver(schema),
  });

  const requiredVal = watch("required");
  const multipleVal = watch("multiple_choice");

  const openCreate = () => { setEditing(null); reset({ product: "", name: "", required: false, multiple_choice: false, display_order: "0" }); setIsOpen(true); };
  const openEdit = (g: OptionGroup) => { setEditing(g); reset({ product: String(g.product), name: g.name, required: g.required, multiple_choice: g.multiple_choice, display_order: String(g.display_order) }); setIsOpen(true); };

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
              key: "actions",
              header: "",
              render: (item: Record<string, unknown>) => (
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => { setSelectedGroup(item as unknown as OptionGroup); setValueModalOpen(true); }}>Values</Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item as unknown as OptionGroup)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => { if (confirm("Delete?")) deleteMutation.mutate((item as unknown as OptionGroup).id); }}>Delete</Button>
                </div>
              ),
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
          <Input label="Name" placeholder="e.g. Size, Sauce, Extras" error={errors.name?.message} {...register("name")} />
          <Input label="Display Order" type="number" {...register("display_order")} />
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
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("0");

  const addMutation = useMutation({
    mutationFn: () => api.post("/option-values/", {
      option_group: group.id,
      name: newName,
      price_adjustment: Number(newPrice),
      available: true,
      display_order: 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-option-values", group.id] });
      setShowAdd(false);
      setNewName("");
      setNewPrice("0");
    },
  });

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
              {Number(v.price_adjustment) > 0 && (
                <span className="ml-2 text-xs text-green-600">+${Number(v.price_adjustment).toFixed(2)}</span>
              )}
            </div>
            <Button variant="danger" size="sm" onClick={() => deleteMutation.mutate(v.id)}>Delete</Button>
          </div>
        ))}
        {(!values || values.length === 0) && <p className="text-sm text-gray-400">No values yet</p>}
      </div>

      {showAdd ? (
        <div className="flex gap-2">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
          <input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} type="number" step="0.01" placeholder="Price adj." className="w-24 px-3 py-2 border rounded-lg text-sm" />
          <Button size="sm" onClick={() => addMutation.mutate()} loading={addMutation.isPending}>Add</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
        </div>
      ) : (
        <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Value</Button>
      )}
    </Modal>
  );
}
