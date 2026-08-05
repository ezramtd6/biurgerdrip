"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Table } from "@/components/ui";
import { User } from "@/types";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import ConfirmDialog from "@/components/common/ConfirmDialog";

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const { data: customers, isLoading } = useQuery<User[]>({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const res = await api.get("/auth/customers/");
      return res.data.results || res.data;
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.patch(`/auth/customers/${id}/`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-customers"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/auth/customers/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-customers"] }),
  });

  if (isLoading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
      </div>

      {!customers || customers.length === 0 ? (
        <EmptyState message="No customers yet" />
      ) : (
        <Table
          columns={[
            { key: "id", header: "ID" },
            { key: "email", header: "Email" },
            { key: "first_name", header: "First Name" },
            { key: "last_name", header: "Last Name" },
            { key: "phone", header: "Phone" },
            {
              key: "is_active",
              header: "Status",
              render: (item: Record<string, unknown>) => (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {item.is_active ? "Active" : "Frozen"}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (item: Record<string, unknown>) => (
                <div className="flex gap-2 justify-end">
                  <Button
                    variant={item.is_active ? "danger" : "secondary"}
                    size="sm"
                    onClick={() =>
                      toggleActiveMutation.mutate({
                        id: item.id as number,
                        is_active: !item.is_active,
                      })
                    }
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
          data={customers as unknown as Record<string, unknown>[]}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
        title="Delete customer"
        description={`Are you sure you want to delete "${deleteTarget?.email}"?`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
