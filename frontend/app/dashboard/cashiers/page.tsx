"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Input, Modal, Table, Select } from "@/components/ui";
import { User, Branch } from "@/types";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z
  .object({
    email: z.string().email("Invalid email"),
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    phone: z.string().optional(),
    branch: z.number({ invalid_type_error: "Branch is required" }).nullable(),
  })
  .refine((data) => data.branch != null, {
    path: ["branch"],
    message: "Branch is required",
  });

type CashierForm = z.infer<typeof schema>;

export default function CashiersPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const { data: cashiers, isLoading } = useQuery<User[]>({
    queryKey: ["admin-cashiers"],
    queryFn: async () => {
      const res = await api.get("/auth/cashiers/");
      return res.data.results || res.data;
    },
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await api.get("/branches/");
      return res.data.results || res.data;
    },
  });

  const branchName = (id: number | null | undefined) =>
    branches?.find((b) => b.id === id)?.name || (id ? `Branch #${id}` : "—");

  const createMutation = useMutation({
    mutationFn: (data: CashierForm) => api.post("/auth/cashiers/", data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-cashiers"] });
      setCreatedToken(res.data.reset_token);
      setIsOpen(false);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.patch(`/auth/cashiers/${id}/`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-cashiers"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/auth/cashiers/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-cashiers"] }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CashierForm>({
    resolver: zodResolver(schema),
  });

  const openCreate = () => { reset({ email: "", first_name: "", last_name: "", phone: "", branch: null }); setCreatedToken(null); setIsOpen(true); };

  if (isLoading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cashiers</h1>
        <Button onClick={openCreate}>Add Cashier</Button>
      </div>

      {!cashiers || cashiers.length === 0 ? (
        <EmptyState message="No cashiers yet" />
      ) : (
        <Table
          columns={[
            { key: "id", header: "ID" },
            { key: "email", header: "Email" },
            { key: "first_name", header: "First Name" },
            { key: "last_name", header: "Last Name" },
            { key: "phone", header: "Phone" },
            { key: "branch", header: "Branch", render: (item: Record<string, unknown>) => (
              <span>{branchName(item.branch as number | null | undefined)}</span>
            ) },
            { key: "is_active", header: "Status", render: (item: Record<string, unknown>) => (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {item.is_active ? "Active" : "Inactive"}
              </span>
            )},
            {
              key: "actions",
              header: "",
              render: (item: Record<string, unknown>) => (
                <div className="flex gap-2 justify-end">
                  <Button
                    variant={item.is_active ? "danger" : "secondary"}
                    size="sm"
                    onClick={() => deactivateMutation.mutate({ id: item.id as number, is_active: !item.is_active })}
                  >
                    {item.is_active ? "Freeze" : "Unfreeze"}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteTarget(item as unknown as User)}
                  >
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
          data={cashiers as unknown as Record<string, unknown>[]}
        />
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add Cashier">
        {createdToken ? (
          <div className="space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              Cashier created! A set-password email has been sent.
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Setup link (if email fails):</p>
              <code className="text-xs break-all">
                http://localhost:3000/set-password/{createdToken}
              </code>
            </div>
            <Button className="w-full" onClick={() => setIsOpen(false)}>Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            {createMutation.isError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {(createMutation.error as { response?: { data?: Record<string, string[]> } })?.response?.data?.email?.[0] ||
                  (createMutation.error as Error)?.message ||
                  "Failed to create cashier. Please try again."}
              </div>
            )}
            <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" error={errors.first_name?.message} {...register("first_name")} />
              <Input label="Last Name" error={errors.last_name?.message} {...register("last_name")} />
            </div>
            <Input label="Phone" error={errors.phone?.message} {...register("phone")} />
            <Select
              label="Branch"
              placeholder="Select branch"
              error={errors.branch?.message}
              options={(branches ?? []).map((b) => ({ value: b.id, label: b.name || `Branch #${b.id}` }))}
              {...register("branch", { setValueAs: (v) => (v === "" || v === undefined ? null : Number(v)) })}
            />
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createMutation.isPending}>Create</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
        title="Delete cashier"
        description={`Are you sure you want to delete "${deleteTarget?.email}"?`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
