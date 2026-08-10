"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Input, Select, Modal, Table } from "@/components/ui";
import { Product, Category } from "@/types";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ErrorDialog from "@/components/common/ErrorDialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Search } from "lucide-react";

const schema = z
  .object({
    name: z.string().min(1, "Name is required"),
    name_amharic: z.string().min(1, "Name in Amharic is required"),
    description: z.string().min(1, "Description is required"),
    description_amharic: z.string().min(1, "Description in Amharic is required"),
    price: z.coerce.number().min(0),
    category: z.string().min(1, "Category is required"),
    has_sizes: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.has_sizes && data.price <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["price"], message: "Amount is required" });
    }
  });

type ProductForm = z.infer<typeof schema>;

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
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
      fd.append("name_amharic", data.name_amharic);
      fd.append("description", data.description);
      fd.append("description_amharic", data.description_amharic);
      fd.append("price", String(data.price));
      fd.append("has_sizes", data.has_sizes ? "true" : "false");
      fd.append("category", data.category);
      if (imageFile) fd.append("image", imageFile);
      fd.append("is_active", "true");
      return api.post("/products/", fd, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); queryClient.invalidateQueries({ queryKey: ["admin-option-groups"] }); setIsOpen(false); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductForm }) => {
      const fd = new FormData();
      fd.append("name", data.name);
      fd.append("name_amharic", data.name_amharic);
      fd.append("description", data.description);
      fd.append("description_amharic", data.description_amharic);
      fd.append("price", String(data.price));
      fd.append("has_sizes", data.has_sizes ? "true" : "false");
      fd.append("category", data.category);
      if (imageFile) fd.append("image", imageFile);
      fd.append("is_active", "true");
      return api.put(`/products/${id}/`, fd, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); queryClient.invalidateQueries({ queryKey: ["admin-option-groups"] }); setIsOpen(false); setEditing(null); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}/`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); queryClient.invalidateQueries({ queryKey: ["admin-option-groups"] }); },
  });

  const toggleMutation = useMutation({
    mutationFn: (p: Product) => api.patch(`/products/${p.id}/`, { is_active: !p.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
    onError: (e: unknown) => setErrorMessage((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to update status"),
  });

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(schema),
  });

  const hasSizes = watch("has_sizes");

  const resetForm = () => { reset({ name: "", name_amharic: "", description: "", description_amharic: "", price: 0, category: "", has_sizes: false }); setImageFile(null); setImagePreview(null); setImageError(null); };

  const openCreate = () => { setEditing(null); resetForm(); setIsOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    reset({ name: p.name, name_amharic: p.name_amharic, description: p.description, description_amharic: p.description_amharic, price: Number(p.price), category: String(p.category), has_sizes: p.has_sizes });
    setImageFile(null);
    setImagePreview(p.image || null);
    setImageError(null);
    setIsOpen(true);
  };

  const onSubmit = (data: ProductForm) => {
    if (!imageFile && !editing?.image) {
      setImageError("Image is required");
      return;
    }
    setImageError(null);
    if (editing) updateMutation.mutate({ id: editing.id, data });
    else createMutation.mutate(data);
  };

  if (loadingProducts) return <Loading />;

  const getCategoryName = (id: number) => categories?.find((c) => c.id === id)?.name || "—";

  const q = search.trim().toLowerCase();
  const filtered = products?.filter((p) => {
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.name_amharic.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      getCategoryName(p.category).toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <Button onClick={openCreate}>Add Product</Button>
      </div>

      {products && products.length > 0 && (
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-9 pr-3 h-9"
          />
        </div>
      )}

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
            { key: "price", header: "Amount (ETB)", render: (item: Record<string, unknown>) => <span className="font-semibold text-gray-900">ETB {Number(item.price).toFixed(2)}</span> },
            { key: "description", header: "Description", render: (item: Record<string, unknown>) => <span className="text-gray-500 truncate max-w-xs block">{item.description as string}</span> },
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
                const prod = item as unknown as Product;
                return (
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(prod)}>Edit</Button>
                    <Button variant={prod.is_active ? "secondary" : "brand"} size="sm" loading={toggleMutation.isPending && toggleMutation.variables === prod} onClick={() => toggleMutation.mutate(prod)}>
                      {prod.is_active ? "Freeze" : "Unfreeze"}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(prod)}>Delete</Button>
                  </div>
                );
              },
            },
          ]}
          data={filtered as unknown as Record<string, unknown>[]}
          emptyMessage="No products match your search"
        />
      )}

      <Modal isOpen={isOpen} onClose={() => { setIsOpen(false); setEditing(null); }} title={editing ? "Edit Product" : "Add Product"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name (English)" error={errors.name?.message} {...register("name")} />
          <Input label="Name (Amharic)" error={errors.name_amharic?.message} {...register("name_amharic")} />
          <Input label="Description (English)" error={errors.description?.message} {...register("description")} />
          <Input label="Description (Amharic)" error={errors.description_amharic?.message} {...register("description_amharic")} />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="rounded"
              {...register("has_sizes", {
                onChange: (e) => { if (e.target.checked) setValue("price", 0); },
              })}
            />
            Is there sizes
          </label>
          <Input
            label="Amount (ETB)"
            type="number"
            min={0}
            step="0.01"
            disabled={hasSizes}
            placeholder={hasSizes ? "Amount comes from option groups" : "Optional if option groups set the price"}
            error={errors.price?.message}
            {...register("price")}
          />
          <Select
            label="Category"
            placeholder="Select category"
            error={errors.category?.message}
            options={categories?.map((c) => ({ value: c.id, label: c.name })) || []}
            required
            {...register("category")}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              required={!imagePreview}
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
            {imageError && <p className="mt-1 text-sm text-red-500">{imageError}</p>}
          </div>

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
        title="Delete product"
        description={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        destructive
      />
      <ErrorDialog open={!!errorMessage} onClose={() => setErrorMessage(null)} message={errorMessage || ""} />
    </div>
  );
}
