"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Input, Select, Modal, Table } from "@/components/ui";
import { Product, Category } from "@/types";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
});

type ProductForm = z.infer<typeof schema>;

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products, isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await api.get("/products/");
      return res.data.results || res.data;
    },
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await api.get("/categories/");
      return res.data.results || res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ProductForm) => {
      const fd = new FormData();
      fd.append("name", data.name);
      fd.append("description", data.description);
      fd.append("category", data.category);
      if (imageFile) fd.append("image", imageFile);
      return api.post("/products/", fd, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); setIsOpen(false); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductForm }) => {
      const fd = new FormData();
      fd.append("name", data.name);
      fd.append("description", data.description);
      fd.append("category", data.category);
      if (imageFile) fd.append("image", imageFile);
      return api.put(`/products/${id}/`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); setIsOpen(false); setEditing(null); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(schema),
  });

  const resetForm = () => { reset({ name: "", description: "", category: "" }); setImageFile(null); setImagePreview(null); };

  const openCreate = () => { setEditing(null); resetForm(); setIsOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    reset({ name: p.name, description: p.description, category: String(p.category) });
    setImageFile(null);
    setImagePreview(p.image || null);
    setIsOpen(true);
  };

  const onSubmit = (data: ProductForm) => {
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  if (loadingProducts) return <Loading />;

  const getCategoryName = (id: number) => categories?.find((c) => c.id === id)?.name || "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <Button onClick={openCreate}>Add Product</Button>
      </div>

      {!products || products.length === 0 ? (
        <EmptyState message="No products yet" />
      ) : (
        <Table
          columns={[
            { key: "id", header: "ID" },
            { key: "name", header: "Name" },
            {
              key: "image",
              header: "Image",
              render: (item: Record<string, unknown>) => {
                const prod = item as unknown as Product;
                return prod.image ? (
                  <img src={prod.image} alt={prod.name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <span className="text-gray-300 text-sm">No image</span>
                );
              },
            },
            { key: "category", header: "Category", render: (item: Record<string, unknown>) => getCategoryName(item.category as number) },
            { key: "description", header: "Description", render: (item: Record<string, unknown>) => <span className="text-gray-500 truncate max-w-xs block">{item.description as string}</span> },
            {
              key: "actions",
              header: "",
              render: (item: Record<string, unknown>) => (
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item as unknown as Product)}>Edit</Button>
                  <Button variant="danger" size="sm" onClick={() => { if (confirm("Delete this product?")) deleteMutation.mutate((item as unknown as Product).id); }}>Delete</Button>
                </div>
              ),
            },
          ]}
          data={products as unknown as Record<string, unknown>[]}
        />
      )}

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setEditing(null); }} title={editing ? "Edit Product" : "Add Product"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" error={errors.name?.message} {...register("name")} />
          <Input label="Description" error={errors.description?.message} {...register("description")} />
          <Select
            label="Category"
            placeholder="Select category"
            error={errors.category?.message}
            options={categories?.map((c) => ({ value: c.id, label: c.name })) || []}
            {...register("category")}
          />

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
