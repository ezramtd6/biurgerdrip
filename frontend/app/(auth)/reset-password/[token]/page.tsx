"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import api from "@/services/api";

const schema = z.object({
  new_password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, "Password must be at least 8 characters with an uppercase letter, lowercase letter, number, and special character"),
});

type ResetPasswordForm = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    setSubmitting(true);
    setError("");
    try {
      await api.post("/auth/reset-password/", {
        token,
        new_password: data.new_password,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="mb-4 text-green-600 font-medium">Password reset successful!</div>
        <p className="text-sm text-gray-500 mb-6">You can now sign in with your new password.</p>
        <Link href="/login">
          <Button className="w-full">Go to Login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
        <p className="text-sm text-gray-500 mt-1">Enter your new password</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="New Password"
          type="password"
          placeholder="Min 8 characters"
          error={errors.new_password?.message}
          {...register("new_password")}
        />

        <Button type="submit" className="w-full" loading={submitting}>
          Reset Password
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Remember your password?{" "}
        <Link href="/login" className="text-orange-500 hover:text-orange-600 font-medium">
          Sign In
        </Link>
      </p>
    </div>
  );
}
