"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof schema>;

const roleMessages: Record<string, string> = {
  ADMIN: "You are an admin",
  MANAGER: "You are a manager",
  CASHIER: "You are a cashier",
  CUSTOMER: "You are a customer",
};

const roleRedirects: Record<string, string> = {
  ADMIN: "/dashboard",
  MANAGER: "/dashboard",
  CASHIER: "/cashier",
  CUSTOMER: "/menu",
};

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
  });

  const role = login.data?.user?.role as string;
  const roleMessage = role ? roleMessages[role] || "" : "";

  useEffect(() => {
    if (login.isSuccess && role) {
      const timer = setTimeout(() => {
        router.push(roleRedirects[role] || "/menu");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [login.isSuccess, role, router]);

  const onSubmit = (data: LoginForm) => {
    login.mutate(data);
  };

  if (login.isSuccess) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Signed in successfully</h2>
          <p className="text-lg text-orange-500 font-semibold mt-2">{roleMessage}</p>
          <p className="text-sm text-gray-400 mt-4">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Burger House</h1>
        <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
      </div>

      {login.isError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {(login.error as any)?.response?.data?.detail ||
            "Invalid email or password"}
        </div>
      )}

      <div className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(onSubmit)(); }}
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...register("password")}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(onSubmit)(); }}
        />

        <div className="text-right">
          <Link href="/forgot-password" className="text-sm text-orange-500 hover:text-orange-600">
            Forgot password?
          </Link>
        </div>

        <Button onClick={() => handleSubmit(onSubmit)()} className="w-full" loading={login.isPending}>
          Sign In
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-orange-500 hover:text-orange-600 font-medium">
          Register
        </Link>
      </p>
    </div>
  );
}
