"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import FormField from "@/components/ui/FormField";
import { Loader2 } from "lucide-react";
import api from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Loading } from "@/components/common/Loading";

const schema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z
      .string()
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        "Password must be at least 8 characters with an uppercase letter, lowercase letter, number, and special character"
      ),
    confirm_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type ChangePasswordForm = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.replace("/login");
    }
  }, [mounted, user, isLoading, router]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ChangePasswordForm) => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post("/auth/change-password/", {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      setSuccess("Password changed successfully");
      reset();
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Failed to change password");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || isLoading) return <Loading />;
  if (!user) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
      </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
            {success}
          </div>
        )}

        <div className="space-y-4">
          <FormField
            label="Current Password"
            type="password"
            placeholder="Enter your current password"
            error={errors.current_password?.message}
            {...register("current_password")}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(onSubmit)(); }}
          />

          <FormField
            label="New Password"
            type="password"
            placeholder="Enter your new password"
            error={errors.new_password?.message}
            {...register("new_password")}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(onSubmit)(); }}
          />

          <FormField
            label="Confirm New Password"
            type="password"
            placeholder="Confirm your new password"
            error={errors.confirm_password?.message}
            {...register("confirm_password")}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(onSubmit)(); }}
          />

          <Button variant="brand" onClick={() => handleSubmit(onSubmit)()} className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="animate-spin" />}
            Change Password
          </Button>
        </div>
      </div>
  );
}
