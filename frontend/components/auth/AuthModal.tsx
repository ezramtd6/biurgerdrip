"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import FormField from "@/components/ui/FormField";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";
import {
  Dialog,
  DialogClose,
  DialogPopup,
} from "@/components/ui/dialog";
import { AuthModalContext, useAuthModal, type AuthView } from "./auth-modal-context";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().regex(
    /^(\+251|0)(?:\s?\d{3}\s?\d{3}\s?\d{3})$/,
    "Phone must start with +251 or 0 and contain 9 digits, e.g. +251 911 234 567 or 0911 234 567"
  ),
});
type RegisterForm = z.infer<typeof registerSchema>;

const forgotSchema = z.object({
  email: z.string().email("Invalid email"),
});
type ForgotForm = z.infer<typeof forgotSchema>;

const roleRedirects: Record<string, string> = {
  ADMIN: "/dashboard",
  MANAGER: "/dashboard",
  CASHIER: "/cashier",
  CUSTOMER: "/",
};

const modalFieldClass = "bg-white text-black border-gray-300 placeholder:text-gray-400";
const modalLabelClass = "text-black";

const readRegistrationError = (err: unknown): string => {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    if (typeof rec.detail === "string") return rec.detail;
    if (typeof rec.message === "string") return rec.message;
    const first = rec.email ?? rec.phone ?? rec.first_name ?? rec.last_name;
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === "string") return first;
  }
  return "Registration failed. Please try again.";
};

export default function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AuthView>("login");

  useEffect(() => {
    if (sessionStorage.getItem("auth_pending") === "login") {
      sessionStorage.removeItem("auth_pending");
      setView("login");
      setOpen(true);
    }
  }, []);

  const openAuth = (nextView: AuthView = "login") => {
    setView(nextView);
    setOpen(true);
  };

  const closeAuth = () => {
    setOpen(false);
    setView("login");
  };

  return (
    <AuthModalContext.Provider value={{ openAuth, closeAuth }}>
      {children}
      <Dialog open={open} onOpenChange={(next) => setOpen(next)}>
        <DialogPopup className="max-w-md w-full p-6 bg-white! border-gray-200! text-black">
          <div className="absolute top-3 right-3">
            <DialogClose className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition cursor-pointer">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </DialogClose>
          </div>
          {view === "login" && <LoginView onSwitch={setView} onSuccess={closeAuth} />}
          {view === "register" && <RegisterView onSwitch={setView} />}
          {view === "forgot" && <ForgotView onSwitch={setView} />}
        </DialogPopup>
      </Dialog>
    </AuthModalContext.Provider>
  );
}

function LoginView({ onSwitch, onSuccess }: { onSwitch: (v: AuthView) => void; onSuccess: () => void }) {
  const router = useRouter();
  const { login } = useAuth();
  const [resendState, setResendState] = useState<"idle" | "loading" | "done">("idle");
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const handleResendActivation = async () => {
    const email = getValues("email");
    if (!email) return;
    setResendState("loading");
    try {
      await api.post("/auth/resend-activation/", { email });
    } catch {
      // ignore - still show success to avoid leaking account existence
    }
    setResendState("done");
  };

  const role = login.data?.user?.role as string;

  useEffect(() => {
    if (login.isSuccess && role) {
      const timer = setTimeout(() => {
        onSuccess();
        router.replace(roleRedirects[role] || "/");
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [login.isSuccess, role, router, onSuccess]);

  const onSubmit = (data: LoginForm) => login.mutate(data);

  if (login.isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-black">Signed in successfully</h2>
        <p className="text-sm text-gray-400 mt-4">Redirecting...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-black">Sign in to your account</h1>
      </div>

      {login.isError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {(() => {
            const detail = (login.error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
            const isWrongCreds = detail === "No active account found with the given credentials" || detail === "User is not allowed to authenticate";
            const needsActivation = detail === "Please activate your account using the activation link sent to your email.";
            const message = isWrongCreds ? "Email or password is wrong" : (detail || "Email or password is wrong");
            return (
              <>
                <p>{message}</p>
                {needsActivation && (
                  <button
                    type="button"
                    onClick={handleResendActivation}
                    disabled={resendState === "loading"}
                    className="mt-2 underline font-medium cursor-pointer disabled:opacity-60"
                  >
                    {resendState === "loading"
                      ? "Sending activation link..."
                      : resendState === "done"
                        ? "Activation link sent. Please check your email."
                        : "Resend activation link"}
                  </button>
                )}
              </>
            );
          })()}
        </div>
      )}

      <div className="space-y-4">
        <FormField
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          labelClassName={modalLabelClass}
          className={modalFieldClass}
          {...register("email")}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(onSubmit)(); }}
        />
        <FormField
          label="Password"
          type="password"
          placeholder="Enter your password"
          error={errors.password?.message}
          labelClassName={modalLabelClass}
          className={modalFieldClass}
          {...register("password")}
          onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(onSubmit)(); }}
        />
        <div className="text-right">
          <button onClick={() => onSwitch("forgot")} className="text-sm text-brand hover:text-brand-dark cursor-pointer">
            Forgot password?
          </button>
        </div>
        <Button onClick={() => handleSubmit(onSubmit)()} variant="brand" className="w-full" disabled={login.isPending}>
          {login.isPending && <Loader2 className="animate-spin" />}
          Sign In
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <button onClick={() => onSwitch("register")} className="text-brand hover:text-brand-dark font-medium cursor-pointer">
          Register
        </button>
      </p>
    </div>
  );
}

function RegisterView({ onSwitch }: { onSwitch: (v: AuthView) => void }) {
  const { register: registerUser } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data: RegisterForm) => {
    registerUser.mutate({ ...data, phone: data.phone });
  };

  if (registerUser.isSuccess) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-black">Account created!</h2>
        <p className="text-sm text-gray-600 mt-2 mb-6">Check your email to set your password and activate your account.</p>
        <Button variant="brand" className="w-full" onClick={() => onSwitch("login")}>
          Go to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-black">Create your account</h1>
      </div>

      {registerUser.isError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {readRegistrationError(registerUser.error)}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="First Name" placeholder="John" error={errors.first_name?.message} labelClassName={modalLabelClass} className={modalFieldClass} {...register("first_name")} />
          <FormField label="Last Name" placeholder="Doe" error={errors.last_name?.message} labelClassName={modalLabelClass} className={modalFieldClass} {...register("last_name")} />
        </div>
        <FormField label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} labelClassName={modalLabelClass} className={modalFieldClass} {...register("email")} />
        <FormField label="Phone" type="tel" required placeholder="+251 911 234 567" error={errors.phone?.message} labelClassName={modalLabelClass} className={modalFieldClass} {...register("phone")} />
        <Button type="submit" variant="brand" className="w-full" disabled={registerUser.isPending}>
          {registerUser.isPending && <Loader2 className="animate-spin" />}
          Create Account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <button onClick={() => onSwitch("login")} className="text-brand hover:text-brand-dark font-medium cursor-pointer">
          Sign In
        </button>
      </p>
    </div>
  );
}

function ForgotView({ onSwitch }: { onSwitch: (v: AuthView) => void }) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotForm) => {
    setSubmitting(true);
    setError("");
    try {
      await api.post("/auth/forgot-password/", data);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="mb-4 text-green-600 font-medium">Check your email!</div>
        <p className="text-sm text-gray-600 mb-6">
          If an account exists with that email, we&apos;ve sent a password reset link.
        </p>
        <Button variant="brand" className="w-full" onClick={() => onSwitch("login")}>
          Back to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-black">Forgot Password</h1>
        <p className="text-sm text-gray-600 mt-1">Enter your email and we&apos;ll send you a reset link</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} labelClassName={modalLabelClass} className={modalFieldClass} {...register("email")} />
        <Button type="submit" variant="brand" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          Send Reset Link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Remember your password?{" "}
        <button onClick={() => onSwitch("login")} className="text-brand hover:text-brand-dark font-medium cursor-pointer">
          Sign In
        </button>
      </p>
    </div>
  );
}
