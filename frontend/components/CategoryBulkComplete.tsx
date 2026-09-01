"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Modal } from "@/components/ui";
import { Category } from "@/types";
import { apiErrorMessage } from "@/lib/utils";
import { Loading } from "@/components/common/Loading";

interface CategoryBulkCompleteProps {
  isOpen: boolean;
  ids: number[];
  onDone: () => void;
  onClose: () => void;
}

interface Draft {
  id: number;
  name: string;
  name_amharic: string;
  type: "food" | "drink";
}

export default function CategoryBulkComplete({ isOpen, ids, onDone, onClose }: CategoryBulkCompleteProps) {
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<number, Partial<Draft>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["bulk-import-categories", ids],
    queryFn: async () => {
      const res = await api.get("/categories/");
      return res.data.results || res.data;
    },
    enabled: isOpen && ids.length > 0,
  });

  const baseRows = useMemo<Draft[]>(() => {
    if (!categories || categories.length === 0) return [];
    const byId = new Map(categories.map((c) => [c.id, c]));
    return ids
      .map((id) => byId.get(id))
      .filter((c): c is Category => !!c)
      .map((c) => ({ id: c.id, name: c.name, name_amharic: c.name_amharic, type: c.type || "food" }));
  }, [categories, ids]);

  const rows = useMemo<Draft[]>(
    () => baseRows.map((r) => ({ ...r, ...(edits[r.id] || {}) })),
    [baseRows, edits]
  );

  const updateRow = (id: number, patch: Partial<Draft>) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    let firstError: string | null = null;
    for (const row of rows) {
      try {
        await api.patch(`/categories/${row.id}/`, { type: row.type });
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
      ["admin-categories"],
      ["categories"],
      ["cashier-categories"],
    ];
    keys.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
    onDone();
  };

  if (isLoading) return <Modal isOpen={isOpen} onClose={onClose} title="Set Imported Category Types"><Loading /></Modal>;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Imported Category Types" maxWidth="xl">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Choose whether each imported category is a <span className="font-semibold">Food</span> or{" "}
          <span className="font-semibold">Drink</span> category.
        </p>

        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{saveError}</div>
        )}

        <div className="max-h-96 overflow-y-auto border border-gray-100 rounded-xl">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="px-3 py-2 font-semibold">Name</th>
                <th className="px-3 py-2 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{row.name}</div>
                    {row.name_amharic && <div className="text-xs text-gray-400">{row.name_amharic}</div>}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.type}
                      onChange={(e) => updateRow(row.id, { type: e.target.value as "food" | "drink" })}
                      className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="food">Food</option>
                      <option value="drink">Drink</option>
                    </select>
                  </td>
                </tr>
              ))}
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
