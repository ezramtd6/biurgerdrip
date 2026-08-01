"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import FormField from "@/components/ui/FormField";
import { Loader2 } from "lucide-react";
import api from "@/services/api";

const schema = z.object({
  email: z.string().email("Invalid email"),
});

type ForgotPasswordForm = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setSubmitting(true);
    setError("");
    try {
      await api.post("/auth/forgot-password/", data);
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="mb-4 text-green-600 font-medium">Check your email!</div>
        <p className="text-sm text-gray-500 mb-6">
          If an account exists with that email, we&apos;ve sent a password reset link.
        </p>
        <Link href="/login">
          <Button variant="brand" className="w-full">Back to Login</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <Button type="submit" variant="brand" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          Send Reset Link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Remember your password?{" "}
        <Link href="/login" className="text-brand hover:text-brand-dark font-medium">
          Sign In
        </Link>
      </p>
    </div>
  );
}
