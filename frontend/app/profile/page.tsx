"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { Loading } from "@/components/common/Loading";
import api from "@/services/api";
import { useState, useEffect } from "react";

const schema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
});

type ProfileForm = z.infer<typeof schema>;

export default function ProfilePage() {
  const { user, isLoading } = useAuth();
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    values: user
      ? { first_name: user.first_name, last_name: user.last_name, phone: user.phone || "" }
      : undefined,
  });

  const onSubmit = async (data: ProfileForm) => {
    try {
      await api.put("/auth/profile/", data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      alert("Failed to update profile");
    }
  };

  if (!mounted || isLoading) return <Loading />;
  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
          <p className="text-gray-500">
            <strong>Email:</strong> {user.email}
          </p>
          <p className="text-gray-500">
            <strong>Role:</strong> {user.role}
          </p>
        </div>

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
            Profile updated successfully!
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              error={errors.first_name?.message}
              {...register("first_name")}
            />
            <Input
              label="Last Name"
              error={errors.last_name?.message}
              {...register("last_name")}
            />
          </div>

          <Input
            label="Phone"
            error={errors.phone?.message}
            {...register("phone")}
          />

          <Button type="submit" className="w-full">
            Save Changes
          </Button>
        </form>
      </div>
    </div>
  );
}
