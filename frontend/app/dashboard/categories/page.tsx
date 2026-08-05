"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Input, Modal, Table } from "@/components/ui";
import { Category } from "@/types";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ErrorDialog from "@/components/common/ErrorDialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Name in English is required"),
  name_amharic: z.string().min(1, "Name in Amharic is required"),
});

type CategoryForm = z.infer<typeof schema>;

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await api.get("/categories/");
      return res.data.results || res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CategoryForm) => api.post("/categories/", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-categories"] }); setIsOpen(false); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryForm }) => api.put(`/categories/${id}/`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-categories"] }); setIsOpen(false); setEditing(null); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: (cat: Category) => api.patch(`/categories/${cat.id}/`, { is_active: !cat.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
    onError: (e: unknown) => setErrorMessage((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to update status"),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryForm>({
    resolver: zodResolver(schema),
  });

  const resetForm = () => { reset({ name: "", name_amharic: "" }); };

  const openCreate = () => { setEditing(null); resetForm(); setIsOpen(true); };
  const openEdit = (cat: Category) => {
    setEditing(cat);
    reset({ name: cat.name, name_amharic: cat.name_amharic });
    setIsOpen(true);
  };

  const onSubmit = (data: CategoryForm) => {
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  if (isLoading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <Button onClick={openCreate}>Add Category</Button>
      </div>

      {!categories || categories.length === 0 ? (
        <EmptyState message="No categories yet" />
      ) : (
        <Table
          columns={[
            { key: "id", header: "ID" },
            { key: "name", header: "Name (English)" },
            { key: "name_amharic", header: "Name (Amharic)", render: (item: Record<string, unknown>) => <span className="text-gray-500">{item.name_amharic as string}</span> },
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
                const cat = item as unknown as Category;
                return (
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>Edit</Button>
                    <Button variant={cat.is_active ? "secondary" : "brand"} size="sm" loading={toggleMutation.isPending && toggleMutation.variables === cat} onClick={() => toggleMutation.mutate(cat)}>
                      {cat.is_active ? "Freeze" : "Unfreeze"}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(cat)}>Delete</Button>
                  </div>
                );
              },
            },
          ]}
          data={categories as unknown as Record<string, unknown>[]}
        />
      )}

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setEditing(null); }} title={editing ? "Edit Category" : "Add Category"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name in English" error={errors.name?.message} {...register("name")} />
          <Input label="Name in Amharic" error={errors.name_amharic?.message} {...register("name_amharic")} />

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
        title="Delete category"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        destructive
      />
      <ErrorDialog open={!!errorMessage} onClose={() => setErrorMessage(null)} message={errorMessage || ""} />
    </div>
  );
}
