"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Modal } from "@/components/ui";
import { Product, Category } from "@/types";
import { apiErrorMessage } from "@/lib/utils";
import { Loading } from "@/components/common/Loading";

interface ProductBulkCompleteProps {
  isOpen: boolean;
  ids: number[];
  onDone: () => void;
  onClose: () => void;
}

interface Draft {
  id: number;
  name: string;
  name_amharic: string;
  category: number;
  price: number;
  has_sizes: boolean;
}

export default function ProductBulkComplete({ isOpen, ids, onDone, onClose }: ProductBulkCompleteProps) {
  const queryClient = useQueryClient();
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [edits, setEdits] = useState<Record<number, Partial<Draft>>>({});
  const [images, setImages] = useState<Record<number, File | null>>({});
  const [previews, setPreviews] = useState<Record<number, string | null>>({});
  const [invalid, setInvalid] = useState<Record<number, string | null>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["bulk-import", ids],
    queryFn: async () => {
      const res = await api.get("/products/");
      return res.data.results || res.data;
    },
    enabled: isOpen && ids.length > 0,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await api.get("/categories/");
      return res.data.results || res.data;
    },
    enabled: isOpen,
  });

  const baseRows = useMemo<Draft[]>(() => {
    if (!products || products.length === 0) return [];
    const byId = new Map(products.map((p) => [p.id, p]));
    return ids
      .map((id) => byId.get(id))
      .filter((p): p is Product => !!p)
      .map((p) => ({
        id: p.id,
        name: p.name,
        name_amharic: p.name_amharic,
        category: p.category,
        price: Number(p.price),
        has_sizes: p.has_sizes,
      }));
  }, [products, ids]);

  const rows = useMemo<Draft[]>(
    () => baseRows.map((r) => ({ ...r, ...(edits[r.id] || {}) })),
    [baseRows, edits]
  );

  const updateRow = (id: number, patch: Partial<Draft>) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const setRowImage = (id: number, file: File | null) => {
    setImages((prev) => ({ ...prev, [id]: file }));
    if (file) {
      setPreviews((prev) => ({ ...prev, [id]: URL.createObjectURL(file) }));
    } else {
      setPreviews((prev) => ({ ...prev, [id]: null }));
    }
  };

  const clearError = (id: number) => {
    setInvalid((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const validateRow = (row: Draft): string | null => {
    if (!row.has_sizes && (!row.price || row.price <= 0)) {
      return "Set an amount (or tick Sizes)";
    }
    if (!previews[row.id]) {
      return "Upload an image";
    }
    return null;
  };

  const uncategorizedId = useMemo(() => {
    const c = (categories || []).find((c) => c.name.toLowerCase() === "uncategorized");
    return c ? c.id : null;
  }, [categories]);

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    let firstError: string | null = null;

    for (const row of rows) {
      if (row.category === uncategorizedId) {
        setInvalid((prev) => ({ ...prev, [row.id]: "Choose a category" }));
        if (!firstError) firstError = `Products need a category. Assign one before saving.`;
        continue;
      }
      const rowError = validateRow(row);
      if (rowError) {
        setInvalid((prev) => ({ ...prev, [row.id]: rowError }));
        if (!firstError) firstError = rowError;
        continue;
      }
    }
    if (firstError) {
      setSaving(false);
      setSaveError(firstError);
      return;
    }

    for (const row of rows) {
      try {
        const fd = new FormData();
        fd.append("category", String(row.category));
        fd.append("price", String(row.has_sizes ? 0 : row.price));
        fd.append("has_sizes", row.has_sizes ? "true" : "false");
        const imageFile = images[row.id];
        if (imageFile) fd.append("image", imageFile);
        await api.patch(`/products/${row.id}/`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      } catch (e) {
        firstError = firstError || apiErrorMessage(e, `Failed to save "${row.name}"`);
      }
    }
    setSaving(false);
    if (firstError) {
      setSaveError(firstError);
      return;
    }
    const keys = [
      ["admin-products"],
      ["products"],
      ["product"],
      ["cashier-products"],
      ["admin-categories"],
      ["categories"],
    ];
    keys.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
    onDone();
  };

  if (isLoading) return <Modal isOpen={isOpen} onClose={onClose} title="Complete Imported Products"><Loading /></Modal>;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Imported Products" maxWidth="2xl">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Set a category, price, sizes and an image for each imported product. Product types (food/drink) are set on the
          category.
        </p>

        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{saveError}</div>
        )}

        <div className="max-h-96 overflow-y-auto border border-gray-100 rounded-xl">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">Sizes</th>
                <th className="px-3 py-2 font-semibold">Amount (ETB)</th>
                <th className="px-3 py-2 font-semibold">Image</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => {
                const rowInvalid = invalid[row.id];
                return (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{row.name}</div>
                    {row.name_amharic && <div className="text-xs text-gray-400">{row.name_amharic}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.category}
                      onChange={(e) => { updateRow(row.id, { category: Number(e.target.value) }); clearError(row.id); }}
                      className={`w-32 px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        rowInvalid ? "border-red-400 bg-red-50" : "border-gray-300"
                      }`}
                    >
                      {(categories || []).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={row.has_sizes}
                      onChange={(e) => {
                        updateRow(row.id, { has_sizes: e.target.checked, price: e.target.checked ? 0 : row.price });
                        clearError(row.id);
                      }}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      disabled={row.has_sizes}
                      value={row.price}
                      placeholder={row.has_sizes ? "Amount comes from option groups" : "0"}
                      onChange={(e) => { updateRow(row.id, { price: Number(e.target.value) }); clearError(row.id); }}
                      className={`w-28 px-2 py-1.5 border rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        !row.has_sizes && rowInvalid ? "border-red-400 bg-red-50" : "border-gray-300"
                      }`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      ref={(el) => { fileInputRefs.current[row.id] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { setRowImage(row.id, e.target.files?.[0] || null); clearError(row.id); }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[row.id]?.click()}
                      className={`w-24 border-2 border-dashed rounded-lg p-1.5 text-center transition-colors cursor-pointer ${
                        previews[row.id] ? "border-gray-300 hover:border-orange-400" : rowInvalid ? "border-red-400 bg-red-50 hover:border-orange-400" : "border-gray-300 hover:border-orange-400"
                      }`}
                    >
                      {previews[row.id] ? (
                        <div className="flex flex-col items-center gap-1">
                          <img src={previews[row.id] || undefined} alt="Preview" className="w-12 h-12 rounded object-cover" />
                          <span className="text-xs text-gray-500">Change</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-lg leading-none text-gray-400">+</span>
                          <span className="text-xs text-gray-500">Upload</span>
                        </div>
                      )}
                    </button>
                    {rowInvalid && (
                      <div className="mt-1 text-xs text-red-500">{rowInvalid}</div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" loading={saving} onClick={save}>
            Save All
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Skip / Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
