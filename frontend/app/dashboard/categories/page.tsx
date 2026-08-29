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
import { Search, ChevronUp, ChevronDown } from "lucide-react";
import { apiErrorMessage } from "@/lib/utils";

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
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [bulkTarget, setBulkTarget] = useState<"freeze-all" | "unfreeze-all" | null>(null);

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await api.get("/categories/");
      return res.data.results || res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CategoryForm) =>
      api.post("/categories/", {
        ...data,
        is_active: true,
        display_order: (categories?.length ?? 0) + 1,
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-categories"] }); setIsOpen(false); resetForm(); },
    onError: (e: unknown) => setFormError(apiErrorMessage(e, "Failed to create category")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryForm }) =>
      api.put(`/categories/${id}/`, {
        ...data,
        is_active: editing?.is_active ?? true,
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-categories"] }); setIsOpen(false); setEditing(null); resetForm(); },
    onError: (e: unknown) => setFormError(apiErrorMessage(e, "Failed to update category")),
  });

  const bulkMutation = useMutation({
    mutationFn: (action: "freeze-all" | "unfreeze-all") => api.post(`/categories/${action}/`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-categories"] }); setBulkTarget(null); },
    onError: (e: unknown) => { setBulkTarget(null); setErrorMessage(apiErrorMessage(e, "Failed to update categories")); },
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

  const reorderMutation = useMutation({
    mutationFn: ({ id, display_order }: { id: number; display_order: number }) =>
      api.patch(`/categories/${id}/`, { display_order }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
  });

  const moveCategory = (index: number, direction: -1 | 1) => {
    if (!categories) return;
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const reordered = [...categories];
    const a = reordered[index];
    const b = reordered[target];
    reordered[index] = b;
    reordered[target] = a;
    queryClient.setQueryData(["admin-categories"], reordered);
    reorderMutation.mutate({ id: a.id, display_order: target + 1 });
    reorderMutation.mutate({ id: b.id, display_order: index + 1 });
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryForm>({
    resolver: zodResolver(schema),
  });

  const resetForm = () => { reset({ name: "", name_amharic: "" }); };

  const openCreate = () => { setEditing(null); resetForm(); setFormError(null); setIsOpen(true); };
  const openEdit = (cat: Category) => {
    setEditing(cat);
    reset({
      name: cat.name,
      name_amharic: cat.name_amharic,
    });
    setFormError(null);
    setIsOpen(true);
  };

  const onSubmit = (data: CategoryForm) => {
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  if (isLoading) return <Loading />;

  const q = search.trim().toLowerCase();
  const filtered = categories?.filter((c) => {
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.name_amharic.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
        <div className="flex gap-2">
          {categories && categories.length > 0 && (
            <>
              {categories.every((c) => !c.is_active) ? (
                <Button
                  variant="brand"
                  loading={bulkMutation.isPending && bulkTarget === "unfreeze-all"}
                  onClick={() => setBulkTarget("unfreeze-all")}
                >
                  Unfreeze All
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  loading={bulkMutation.isPending && bulkTarget === "freeze-all"}
                  onClick={() => setBulkTarget("freeze-all")}
                >
                  Freeze All
                </Button>
              )}
            </>
          )}
          <Button onClick={openCreate}>Add Category</Button>
        </div>
      </div>

      {categories && categories.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="pl-9 pr-3 h-9"
          />
        </div>
      )}

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
              render: (item: Record<string, unknown>) => {
                const cat = item as unknown as Category;
                const label = !cat.is_active ? "Frozen" : !cat.is_available_now ? "Outside hours" : "Active";
                const cls = !cat.is_active
                  ? "bg-gray-100 text-gray-500"
                  : !cat.is_available_now
                    ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700";
                return (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                    {label}
                  </span>
                );
              },
            },
            {
              key: "actions",
              header: "",
              render: (item: Record<string, unknown>) => {
                const cat = item as unknown as Category;
                const index = categories?.findIndex((c) => c.id === cat.id) ?? 0;
                return (
                  <div className="flex gap-2 justify-end">
                    <div className="flex items-center gap-0.5 mr-1">
                      <button
                        onClick={() => moveCategory(index, -1)}
                        disabled={index === 0 || reorderMutation.isPending}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-30 transition p-0.5"
                        title="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveCategory(index, 1)}
                        disabled={index === (categories?.length ?? 0) - 1 || reorderMutation.isPending}
                        className="text-gray-400 hover:text-gray-700 disabled:opacity-30 transition p-0.5"
                        title="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
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
          data={filtered as unknown as Record<string, unknown>[]}
          emptyMessage="No categories match your search"
        />
      )}

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setEditing(null); }} title={editing ? "Edit Category" : "Add Category"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name in English" error={errors.name?.message || formError || undefined} {...register("name")} />
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
        open={bulkTarget === "freeze-all"}
        onClose={() => setBulkTarget(null)}
        onConfirm={() => bulkMutation.mutate("freeze-all")}
        title="Freeze all categories"
        description="All categories and their products will be hidden from customers until you unfreeze them."
        confirmLabel="Freeze All"
        destructive
      />
      <ConfirmDialog
        open={bulkTarget === "unfreeze-all"}
        onClose={() => setBulkTarget(null)}
        onConfirm={() => bulkMutation.mutate("unfreeze-all")}
        title="Unfreeze all categories"
        description="All frozen categories and their products will become visible to customers again."
        confirmLabel="Unfreeze All"
      />

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
