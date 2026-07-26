"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Input, Modal, Table } from "@/components/ui";
import { Category } from "@/types";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type CategoryForm = z.infer<typeof schema>;

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await api.get("/categories/");
      return res.data.results || res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CategoryForm) => {
      const fd = new FormData();
      fd.append("name", data.name);
      if (data.description) fd.append("description", data.description);
      if (imageFile) fd.append("image", imageFile);
      return api.post("/categories/", fd, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-categories"] }); setIsOpen(false); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryForm }) => {
      const fd = new FormData();
      fd.append("name", data.name);
      if (data.description) fd.append("description", data.description);
      if (imageFile) fd.append("image", imageFile);
      return api.put(`/categories/${id}/`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-categories"] }); setIsOpen(false); setEditing(null); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-categories"] }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryForm>({
    resolver: zodResolver(schema),
  });

  const resetForm = () => { reset({ name: "", description: "" }); setImageFile(null); setImagePreview(null); };

  const openCreate = () => { setEditing(null); resetForm(); setIsOpen(true); };
  const openEdit = (cat: Category) => {
    setEditing(cat);
    reset({ name: cat.name, description: cat.description });
    setImageFile(null);
    setImagePreview(cat.image || null);
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
            { key: "name", header: "Name" },
            {
              key: "image",
              header: "Image",
              render: (item: Record<string, unknown>) => {
                const cat = item as unknown as Category;
                return cat.image ? (
                  <img src={cat.image} alt={cat.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <span className="text-gray-300 text-sm">No image</span>
                );
              },
            },
            { key: "description", header: "Description", render: (item: Record<string, unknown>) => <span className="text-gray-500 truncate max-w-xs block">{item.description as string}</span> },
            {
              key: "actions",
              header: "",
              render: (item: Record<string, unknown>) => (
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item as unknown as Category)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => { if (confirm("Delete this category?")) deleteMutation.mutate((item as unknown as Category).id); }}>Delete</Button>
                </div>
              ),
            },
          ]}
          data={categories as unknown as Record<string, unknown>[]}
        />
      )}

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setEditing(null); }} title={editing ? "Edit Category" : "Add Category"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" error={errors.name?.message} {...register("name")} />
          <Input label="Description" error={errors.description?.message} {...register("description")} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
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
                  <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
                  <span className="text-sm text-gray-500">Click to change</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl">+</span>
                  <span className="text-sm text-gray-500">Click to upload image</span>
                </div>
              )}
            </button>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
