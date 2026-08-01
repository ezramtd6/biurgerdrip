"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Input } from "@/components/ui";
import { RestaurantInfo } from "@/types";
import { Loading } from "@/components/common/Loading";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(1, "Phone is required"),
  opening_hours: z.string().min(1, "Opening hours is required"),
  latitude: z.coerce.number().refine((v) => !Number.isNaN(v) && v >= -90 && v <= 90, "Invalid latitude").optional(),
  longitude: z.coerce.number().refine((v) => !Number.isNaN(v) && v >= -180 && v <= 180, "Invalid longitude").optional(),
});

type RestaurantForm = z.infer<typeof schema>;

export default function RestaurantPage() {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const { data: info, isLoading } = useQuery<RestaurantInfo>({
    queryKey: ["restaurant-info"],
    queryFn: async () => {
      const res = await api.get("/restaurant/");
      const results = res.data.results || res.data;
      return (Array.isArray(results) ? results[0] : results) ?? null;
    },
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
      const err = e as { response?: { status?: number; data?: unknown }; message?: string };
      setSuccess(false);
      const data = err?.response?.data as Record<string, unknown> | string | undefined;
      let msg: string | null = null;
      if (data && typeof data === "object") {
        const parts: string[] = [];
        for (const [k, v] of Object.entries(data)) {
          if (Array.isArray(v)) parts.push(`${k}: ${v.join(", ")}`);
          else if (v) parts.push(`${k}: ${String(v)}`);
        }
        if (parts.length) msg = parts.join("; ");
      } else if (data && typeof data === "string") {
        msg = data;
      }
      setError(msg || err?.message || "Failed to save restaurant info");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/restaurant/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-info"] });
      setError(null);
      setEditing(false);
    },
    onError: (e: unknown) => {
      const err = e as { response?: { status?: number; data?: unknown }; message?: string };
      setError(
        (err?.response?.data as { detail?: string })?.detail ||
        err?.message ||
        "Failed to delete restaurant"
      );
    },
  });

  const { register, handleSubmit, formState: { errors } } = useForm<RestaurantForm>({
    resolver: zodResolver(schema),
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

  if (isLoading) return <Loading />;

  const handleDelete = () => {
    if (info && confirm("Delete this restaurant?")) deleteMutation.mutate(info.id);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Restaurant Information</h1>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
            Restaurant info saved successfully!
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

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
              <Button type="button" variant="danger" loading={deleteMutation.isPending} onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
            <Input label="Restaurant Name" error={errors.name?.message} {...register("name")} />
            <Input label="Address" error={errors.address?.message} {...register("address")} />
            <Input label="Phone" error={errors.phone?.message} {...register("phone")} />
            <Input label="Opening Hours" placeholder="e.g. 9:00 AM - 10:00 PM" error={errors.opening_hours?.message} {...register("opening_hours")} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Latitude" placeholder="e.g. 9.0054" error={errors.latitude?.message} {...register("latitude")} />
              <Input label="Longitude" placeholder="e.g. 38.7636" error={errors.longitude?.message} {...register("longitude")} />
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
    </div>
  );
}
