"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import api from "@/services/api";
import { Button, Input } from "@/components/ui";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const schema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z
      .string()
      .regex(
        passwordRegex,
        "Password must be at least 8 characters with an uppercase letter, lowercase letter, number, and special character (@$!%*?&)."
      ),
    confirm_password: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  });

type ChangePasswordForm = z.infer<typeof schema>;

interface ChangePasswordDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ChangePasswordDialog({ open: openProp, onOpenChange }: ChangePasswordDialogProps = {}) {
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const setOpen = (value: boolean) => {
    if (isControlled) onOpenChange?.(value);
    else setOpenState(value);
  };
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      api.post("/auth/change-password/", data),
    onSuccess: (res) => {
      setSuccess(res.data.message || "Password changed successfully.");
      reset();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(schema),
  });

  const close = () => {
    setOpen(false);
    setSuccess(null);
    reset();
    mutation.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger
          className="text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
        >
          Change Password
        </DialogTrigger>
      )}
      <DialogPopup>
        <DialogTitle>Change Password</DialogTitle>

        {success ? (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {success}
            </div>
            <DialogClose
              className="w-full inline-flex items-center justify-center font-medium rounded-lg px-4 py-2 text-sm bg-orange-500 text-white hover:bg-orange-600 cursor-pointer"
              onClick={close}
            >
              Done
            </DialogClose>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit((data) =>
              mutation.mutate(
                {
                  current_password: data.current_password,
                  new_password: data.new_password,
                },
                {
                  onError: (err) => {
                    const status = (err as { response?: { data?: { error?: string } } }).response
                      ?.data?.error;
                    if (status) {
                      setError("current_password", { type: "server", message: status });
                    }
                  },
                }
              )
            )}
            className="space-y-4"
          >
            <Input
              label="Current Password"
              type="password"
              error={errors.current_password?.message}
              {...register("current_password")}
            />
            <Input
              label="New Password"
              type="password"
              error={errors.new_password?.message}
              {...register("new_password")}
            />
            <Input
              label="Confirm New Password"
              type="password"
              error={errors.confirm_password?.message}
              {...register("confirm_password")}
            />
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" type="button" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                Save
              </Button>
            </div>
          </form>
        )}
      </DialogPopup>
    </Dialog>
  );
}
