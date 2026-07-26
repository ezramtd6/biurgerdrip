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
});

type RestaurantForm = z.infer<typeof schema>;

export default function RestaurantPage() {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);

  const { data: info, isLoading } = useQuery<RestaurantInfo>({
    queryKey: ["restaurant-info"],
    queryFn: async () => {
      const res = await api.get("/restaurant/");
      const results = res.data.results || res.data;
      return Array.isArray(results) ? results[0] : results;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: RestaurantForm) => {
      if (info) return api.put(`/restaurant/${info.id}/`, data);
      return api.post("/restaurant/", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-info"] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const { register, handleSubmit, formState: { errors } } = useForm<RestaurantForm>({
    resolver: zodResolver(schema),
    values: info
      ? { name: info.name, address: info.address, phone: info.phone, opening_hours: info.opening_hours }
      : undefined,
  });

  if (isLoading) return <Loading />;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Restaurant Information</h1>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
            Restaurant info updated successfully!
          </div>
        )}

        <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
          <Input label="Restaurant Name" error={errors.name?.message} {...register("name")} />
          <Input label="Address" error={errors.address?.message} {...register("address")} />
          <Input label="Phone" error={errors.phone?.message} {...register("phone")} />
          <Input label="Opening Hours" placeholder="e.g. 9:00 AM - 10:00 PM" error={errors.opening_hours?.message} {...register("opening_hours")} />

          <Button type="submit" loading={updateMutation.isPending}>
            Save Changes
          </Button>
        </form>
      </div>
    </div>
  );
}
