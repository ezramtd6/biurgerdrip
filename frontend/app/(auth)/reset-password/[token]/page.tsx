"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input } from "@/components/ui";
import api from "@/services/api";
import { Loading } from "@/components/common/Loading";
import { useAuthModal } from "@/components/auth/auth-modal-context";

const schema = z
  .object({
    new_password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, "Password must be at least 8 characters with an uppercase letter, lowercase letter, number, and special character"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });

type ResetPasswordForm = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const { openAuth } = useAuthModal();
  const token = params.token as string;

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validToken, setValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .get(`/auth/reset-password/${token}/`)
      .then(() => {
        setValidToken(true);
        setLoading(false);
      })
      .catch((err) => {
        setValidToken(false);
        setError(err.response?.data?.error || "Invalid or expired token.");
        setLoading(false);
      });
  }, [token]);

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
      sessionStorage.setItem("password_reset_success", "1");
      router.replace("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  if (validToken === false) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="mb-4 text-2xl font-bold text-gray-900">Reset link expired</div>
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error || "Invalid or expired token."}
        </div>
        <p className="mb-4 text-sm text-gray-500">Please request a new password reset link.</p>
        <button onClick={() => router.replace("/")} className="text-orange-500 hover:text-orange-600 font-medium text-sm cursor-pointer">
          Go to Login
        </button>
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
          className="bg-gray-50 border-gray-200 text-gray-900"
          {...register("new_password")}
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter your password"
          error={errors.confirm_password?.message}
          className="bg-gray-50 border-gray-200 text-gray-900"
          {...register("confirm_password")}
        />

        <Button type="submit" className="w-full" loading={submitting}>
          Reset Password
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Remember your password?{" "}
        <button onClick={() => openAuth("login")} className="text-orange-500 hover:text-orange-600 font-medium cursor-pointer">
          Sign In
        </button>
      </p>
    </div>
  );
}
