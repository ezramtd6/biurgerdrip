"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Input, Modal } from "@/components/ui";
import { RestaurantInfo, Branch } from "@/types";
import { Loading } from "@/components/common/Loading";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const infoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(1, "Phone is required"),
  opening_hours: z.string().min(1, "Opening hours is required"),
  latitude: z.coerce.number().refine((v) => !Number.isNaN(v) && v >= -90 && v <= 90, "Invalid latitude").optional(),
  longitude: z.coerce.number().refine((v) => !Number.isNaN(v) && v >= -180 && v <= 180, "Invalid longitude").optional(),
});

type RestaurantForm = z.infer<typeof infoSchema>;

const branchSchema = z.object({
  latitude: z.coerce.number().refine((v) => !Number.isNaN(v) && v >= -90 && v <= 90, "Invalid latitude").optional(),
  longitude: z.coerce.number().refine((v) => !Number.isNaN(v) && v >= -180 && v <= 180, "Invalid longitude").optional(),
});

type BranchForm = z.infer<typeof branchSchema>;

function extractError(e: unknown): string {
  const err = e as { response?: { status?: number; data?: unknown }; message?: string };
  const data = err?.response?.data as Record<string, unknown> | string | undefined;
  if (data && typeof data === "object") {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v)) parts.push(`${k}: ${v.join(", ")}`);
      else if (v) parts.push(`${k}: ${String(v)}`);
    }
    if (parts.length) return parts.join("; ");
  } else if (data && typeof data === "string") {
    return data;
  }
  return err?.message || "Request failed";
}

export default function RestaurantPage() {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deleteRestaurant, setDeleteRestaurant] = useState(false);
  const [deleteBranch, setDeleteBranch] = useState<Branch | null>(null);

  const { data: info, isLoading } = useQuery<RestaurantInfo | null>({
    queryKey: ["restaurant-info"],
    queryFn: async () => {
      const res = await api.get("/restaurant/");
      const results = res.data.results || res.data;
      return (Array.isArray(results) ? results[0] : results) ?? null;
    },
  });

  const { data: branches, isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await api.get("/branches/");
      const results = res.data.results || res.data;
      return Array.isArray(results) ? results : [];
    },
    enabled: !!info,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: RestaurantForm) => {
      if (info) return api.put(`/restaurant/${info.id}/`, data);
      return api.post("/restaurant/", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-info"] });
      setError(null);
      setSuccess(true);
      setEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (e: unknown) => {
      setSuccess(false);
      setError(extractError(e));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/restaurant/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-info"] });
      setError(null);
      setEditing(false);
    },
    onError: (e: unknown) => setError(extractError(e)),
  });

  const toggleMutation = useMutation({
    mutationFn: () => api.patch(`/restaurant/${info!.id}/`, { is_active: !info!.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-info"] });
      setError(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (e: unknown) => setError(extractError(e)),
  });

  const branchMutation = useMutation({
    mutationFn: async (data: BranchForm) => {
      const payload = { ...data, restaurant: info!.id };
      if (editingBranch) return api.put(`/branches/${editingBranch.id}/`, payload);
      return api.post("/branches/", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setError(null);
      setBranchOpen(false);
      setEditingBranch(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (e: unknown) => {
      setSuccess(false);
      setError(extractError(e));
    },
  });

  const branchDeleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/branches/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setError(null);
    },
    onError: (e: unknown) => setError(extractError(e)),
  });

  const infoForm = useForm<RestaurantForm>({
    resolver: zodResolver(infoSchema),
    values: info
      ? {
          name: info.name,
          address: info.address,
          phone: info.phone,
          opening_hours: info.opening_hours,
          latitude: info.latitude ?? undefined,
          longitude: info.longitude ?? undefined,
        }
      : undefined,
  });

  const branchForm = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
    values: editingBranch
      ? {
          latitude: editingBranch.latitude ?? undefined,
          longitude: editingBranch.longitude ?? undefined,
        }
      : undefined,
  });

  const openAddBranch = () => {
    setEditingBranch(null);
    branchForm.reset();
    setError(null);
    setBranchOpen(true);
  };

  const openEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    branchForm.reset({
      latitude: branch.latitude ?? undefined,
      longitude: branch.longitude ?? undefined,
    });
    setError(null);
    setBranchOpen(true);
  };

  if (isLoading) return <Loading />;

  const handleDelete = () => {
    if (info) deleteMutation.mutate(info.id);
    setDeleteRestaurant(false);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Restaurant Information</h1>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
          Saved successfully!
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        {info && !editing ? (
          <div className="space-y-4">
            <dl className="grid grid-cols-1 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-gray-900">{info.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-gray-900">{info.address}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-gray-900">{info.phone}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Opening Hours</dt>
                <dd className="mt-1 text-gray-900">{info.opening_hours}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${info.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {info.is_active ? "Active" : "Frozen"}
                  </span>
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Latitude</dt>
                  <dd className="mt-1 text-gray-900">{info.latitude ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Longitude</dt>
                  <dd className="mt-1 text-gray-900">{info.longitude ?? "—"}</dd>
                </div>
              </div>
            </dl>
            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button type="button" variant={info.is_active ? "secondary" : "brand"} loading={toggleMutation.isPending} onClick={() => toggleMutation.mutate()}>
                {info.is_active ? "Freeze" : "Unfreeze"}
              </Button>
              <Button type="button" variant="danger" loading={deleteMutation.isPending} onClick={() => setDeleteRestaurant(true)}>
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={infoForm.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
            <Input label="Restaurant Name" error={infoForm.formState.errors.name?.message} {...infoForm.register("name")} />
            <Input label="Address" error={infoForm.formState.errors.address?.message} {...infoForm.register("address")} />
            <Input label="Phone" error={infoForm.formState.errors.phone?.message} {...infoForm.register("phone")} />
            <Input label="Opening Hours" placeholder="e.g. 9:00 AM - 10:00 PM" error={infoForm.formState.errors.opening_hours?.message} {...infoForm.register("opening_hours")} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Latitude" placeholder="e.g. 9.0054" error={infoForm.formState.errors.latitude?.message} {...infoForm.register("latitude")} />
              <Input label="Longitude" placeholder="e.g. 38.7636" error={infoForm.formState.errors.longitude?.message} {...infoForm.register("longitude")} />
            </div>

            <div className="flex gap-3">
              <Button type="submit" loading={updateMutation.isPending}>
                {info ? "Save Changes" : "Create Restaurant"}
              </Button>
              {info && editing && (
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Branches</h2>
          <Button onClick={openAddBranch} disabled={!info}>
            <span className="text-lg leading-none mr-1">+</span> Add Branch
          </Button>
        </div>

        {!info ? (
          <p className="text-sm text-gray-500">Save the restaurant information first to add branches.</p>
        ) : branchesLoading ? (
          <Loading />
        ) : (branches ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No branches added yet.</p>
        ) : (
          <div className="space-y-3">
            {(branches ?? []).map((branch) => (
              <div key={branch.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                <div className="text-sm text-gray-900">
                  <span className="font-medium text-gray-500">Lat:</span> {branch.latitude ?? "—"}
                  <span className="mx-3 font-medium text-gray-500">Lng:</span> {branch.longitude ?? "—"}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditBranch(branch)}>
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={branchDeleteMutation.isPending && branchDeleteMutation.variables === branch.id}
                    onClick={() => setDeleteBranch(branch)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={branchOpen}
        onClose={() => { setBranchOpen(false); setEditingBranch(null); }}
        title={editingBranch ? "Edit Branch" : "Add Branch"}
      >
        <form onSubmit={branchForm.handleSubmit((data) => branchMutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Latitude" placeholder="e.g. 9.0054" error={branchForm.formState.errors.latitude?.message} {...branchForm.register("latitude")} />
            <Input label="Longitude" placeholder="e.g. 38.7636" error={branchForm.formState.errors.longitude?.message} {...branchForm.register("longitude")} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setBranchOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={branchMutation.isPending}>
              {editingBranch ? "Save Changes" : "Add Branch"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteRestaurant}
        onClose={() => setDeleteRestaurant(false)}
        onConfirm={handleDelete}
        title="Delete restaurant"
        description="Are you sure you want to delete this restaurant? All its branches will also be deleted."
        confirmLabel="Delete"
        destructive
      />
      <ConfirmDialog
        open={!!deleteBranch}
        onClose={() => setDeleteBranch(null)}
        onConfirm={() => { if (deleteBranch) branchDeleteMutation.mutate(deleteBranch.id); setDeleteBranch(null); }}
        title="Delete branch"
        description="Are you sure you want to delete this branch?"
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
