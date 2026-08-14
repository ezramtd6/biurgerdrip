"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input } from "@/components/ui";
import api from "@/services/api";
import { Loading } from "@/components/common/Loading";
import SiteBrand from "@/components/layout/SiteBrand";

const schema = z
  .object({
    password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, "Password must be at least 8 characters with an uppercase letter, lowercase letter, number, and special character"),
    confirm_password: z.string(),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type SetPasswordForm = z.infer<typeof schema>;

interface UserInfo {
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export default function SetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordForm>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    api
      .get(`/auth/set-password/${token}/`)
      .then((res) => {
        setUserInfo(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Invalid or expired token");
        setLoading(false);
      });
  }, [token]);

  const onSubmit = async (data: SetPasswordForm) => {
    setSubmitting(true);
    setError("");
    try {
      await api.post(`/auth/set-password/${token}/confirm/`, {
        password: data.password,
        confirm_password: data.confirm_password,
      });
      sessionStorage.setItem("password_set_success", "1");
      router.replace("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to set password");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  if (error && !userInfo) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-red-500 text-sm mb-4">{error}</div>
        <button onClick={() => router.replace("/")} className="text-orange-500 hover:text-orange-600 font-medium text-sm cursor-pointer">
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900"><SiteBrand /></h1>
        <p className="text-sm text-gray-500 mt-1">Set your password</p>
      </div>

      {userInfo && (
        <div className="mb-6 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p><strong>Name:</strong> {userInfo.first_name} {userInfo.last_name}</p>
          <p><strong>Email:</strong> {userInfo.email}</p>
          <p><strong>Role:</strong> {userInfo.role}</p>
        </div>
      )}

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
          error={errors.password?.message}
          {...register("password")}
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Re-enter password"
          error={errors.confirm_password?.message}
          {...register("confirm_password")}
        />

        <Button type="submit" className="w-full" loading={submitting}>
          Set Password
        </Button>
      </form>
    </div>
  );
}
