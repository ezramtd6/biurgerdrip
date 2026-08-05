"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Input, Modal, Table } from "@/components/ui";
import { Contact } from "@/types";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  phone: z
    .string()
    .min(1, "Phone is required")
    .regex(/^\+251(?:\s?\d{3}\s?\d{3}\s?\d{3})$/, "Phone must start with +251 followed by 9 digits, e.g. +251 911 234 567"),
  email: z
    .string()
    .min(1, "Email is required")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address, e.g. info@burgerhouse.com"),
  location: z.string().min(1, "Location is required"),
});

type ContactForm = z.infer<typeof schema>;

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: contacts, isLoading } = useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: async () => {
      const res = await api.get("/contacts/");
      return res.data.results || res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: ContactForm & { id?: number }) =>
      data.id
        ? api.patch(`/contacts/${data.id}/`, data)
        : api.post("/contacts/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setIsOpen(false);
      setEditing(null);
      setFormError(null);
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: { detail?: string; [key: string]: unknown } } })?.response?.data;
      const firstError = data && typeof data === "object"
        ? Object.entries(data).map(([k, v]) => Array.isArray(v) ? `${k}: ${v[0]}` : "").find(Boolean)
        : undefined;
      setFormError(firstError || "Something went wrong. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/contacts/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactForm>({
    resolver: zodResolver(schema),
  });

  const openCreate = () => {
    setEditing(null);
    reset({ phone: "", email: "", location: "" });
    setIsOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setEditing(contact);
    reset({ phone: contact.phone, email: contact.email, location: contact.location });
    setIsOpen(true);
  };

  if (isLoading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        {!contacts || contacts.length === 0 ? (
          <Button onClick={openCreate}>Add Contact</Button>
        ) : (
          <p className="text-sm text-gray-500">Only one contact is allowed. Edit the existing contact to update details.</p>
        )}
      </div>

      {!contacts || contacts.length === 0 ? (
        <EmptyState message="No contacts yet. Add phone, email, and location details." />
      ) : (
        <Table
          columns={[
            { key: "id", header: "ID" },
            {
              key: "phone",
              header: "Phone",
              render: (item: Record<string, unknown>) => (
                <span className="inline-flex items-center gap-2">
                  <i className="fas fa-phone-alt text-orange-500"></i>
                  {String(item.phone)}
                </span>
              ),
            },
            {
              key: "email",
              header: "Email",
              render: (item: Record<string, unknown>) => (
                <a href={`mailto:${String(item.email)}`} className="text-orange-600 hover:underline text-sm">
                  {String(item.email)}
                </a>
              ),
            },
            {
              key: "location",
              header: "General Location",
              render: (item: Record<string, unknown>) => (
                <span className="inline-flex items-center gap-2">
                  <i className="fas fa-map-marker-alt text-orange-500"></i>
                  {String(item.location)}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (item: Record<string, unknown>) => (
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(item as unknown as Contact)}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteTarget(item as unknown as Contact)}>
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
          data={contacts as unknown as Record<string, unknown>[]}
        />
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? "Edit Contact" : "Add Contact"}>
        <form
          onSubmit={handleSubmit((data) => saveMutation.mutate(editing ? { ...data, id: editing.id } : data))}
          className="space-y-4"
        >
          <Input label="Phone" type="tel" placeholder="+251 911 234 567" error={errors.phone?.message} {...register("phone")} />
          <Input label="Email" type="email" placeholder="info@burgerhouse.com" error={errors.email?.message} {...register("email")} />
          <Input label="General Location" placeholder="e.g. Addis Ababa, Ethiopia" error={errors.location?.message} {...register("location")} />
          {formError && (
            <p className="text-sm text-red-500">{formError}</p>
          )}
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saveMutation.isPending}>{editing ? "Save" : "Add"}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); }}
        title="Delete contact"
        description={`Are you sure you want to delete the contact for ${deleteTarget?.phone}?`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
