"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import FormField from "@/components/ui/FormField";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const schema = z
  .object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email"),
    phone: z.string().optional(),
    password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, "Password must be at least 8 characters with an uppercase letter, lowercase letter, number, and special character"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type RegisterForm = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: RegisterForm) => {
    const { confirm_password, ...payload } = data;
    registerUser.mutate({ ...payload, phone: payload.phone || "" });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
      </div>

      {registerUser.isError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {(registerUser.error as any)?.response?.data?.email?.[0] ||
            "Registration failed. Please try again."}
        </div>
      )}

      {registerUser.isSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
          Account created! Redirecting to login...
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="First Name"
            placeholder="John"
            error={errors.first_name?.message}
            {...register("first_name")}
          />
          <FormField
            label="Last Name"
            placeholder="Doe"
            error={errors.last_name?.message}
            {...register("last_name")}
          />
        </div>

        <FormField
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <FormField
          label="Phone (optional)"
          type="tel"
          placeholder="+1234567890"
          error={errors.phone?.message}
          {...register("phone")}
        />

        <FormField
          label="Password"
          type="password"
          placeholder="Min 8 characters"
          error={errors.password?.message}
          {...register("password")}
        />

        <FormField
          label="Confirm Password"
          type="password"
          placeholder="Re-enter password"
          error={errors.confirm_password?.message}
          {...register("confirm_password")}
        />

        <Button type="submit" variant="brand" className="w-full" disabled={registerUser.isPending}>
          {registerUser.isPending && <Loader2 className="animate-spin" />}
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-brand hover:text-brand-dark font-medium">
          Sign In
        </Link>
      </p>
    </div>
  );
}
