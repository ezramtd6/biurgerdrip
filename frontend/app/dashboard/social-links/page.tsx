"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Input, Modal, Select, Table } from "@/components/ui";
import { SocialLink, SocialPlatform } from "@/types";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const platformOptions: { value: SocialPlatform; label: string; icon: string }[] = [
  { value: "facebook", label: "Facebook", icon: "fab fa-facebook-f" },
  { value: "instagram", label: "Instagram", icon: "fab fa-instagram" },
  { value: "twitter", label: "Twitter / X", icon: "fab fa-twitter" },
  { value: "tiktok", label: "TikTok", icon: "fab fa-tiktok" },
  { value: "youtube", label: "YouTube", icon: "fab fa-youtube" },
  { value: "telegram", label: "Telegram", icon: "fab fa-telegram-plane" },
];

const iconMap: Record<string, string> = Object.fromEntries(
  platformOptions.map((p) => [p.value, p.icon])
);

const schema = z.object({
  platform: z.enum(["facebook", "instagram", "twitter", "tiktok", "youtube", "telegram"]),
  url: z.string().url("Enter a valid URL"),
});

type SocialLinkForm = z.infer<typeof schema>;

export default function SocialLinksPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<SocialLink | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SocialLink | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: socialLinks, isLoading } = useQuery<SocialLink[]>({
    queryKey: ["social-links"],
    queryFn: async () => {
      const res = await api.get("/social-links/");
      return res.data.results || res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: SocialLinkForm & { id?: number }) =>
      data.id
        ? api.patch(`/social-links/${data.id}/`, data)
        : api.post("/social-links/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-links"] });
      setIsOpen(false);
      setEditing(null);
      setFormError(null);
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: { platform?: string[]; detail?: string } } })?.response?.data;
      setFormError(data?.platform?.[0] || data?.detail || "Something went wrong. Please try again.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/social-links/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["social-links"] }),
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<SocialLinkForm>({
    resolver: zodResolver(schema),
    defaultValues: { platform: "facebook", url: "" },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ platform: "facebook", url: "" });
    setIsOpen(true);
  };

  const openEdit = (link: SocialLink) => {
    setEditing(link);
    reset({ platform: link.platform, url: link.url });
    setIsOpen(true);
  };

  const usedPlatforms = new Set(
    (socialLinks || [])
      .filter((l) => !editing || l.id !== editing.id)
      .map((l) => l.platform)
  );

  const availableOptions = platformOptions.map((p) => ({
    value: p.value,
    label: usedPlatforms.has(p.value) ? `${p.label} (already added)` : p.label,
    disabled: usedPlatforms.has(p.value),
  }));

  if (isLoading) return <Loading />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Social Media Links</h1>
        <Button onClick={openCreate}>Add Link</Button>
      </div>

      {!socialLinks || socialLinks.length === 0 ? (
        <EmptyState message="No social media links yet. Add your Facebook, Instagram, and other pages." />
      ) : (
        <Table
          columns={[
            { key: "id", header: "ID" },
            {
              key: "platform",
              header: "Platform",
              render: (item: Record<string, unknown>) => (
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
                    <i className={iconMap[String(item.platform)] || "fas fa-link"}></i>
                  </span>
                  <span className="capitalize">{String(item.platform).replace(/-/g, " ")}</span>
                </div>
              ),
            },
            {
              key: "url",
              header: "URL",
              render: (item: Record<string, unknown>) => (
                <a href={String(item.url)} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline text-sm">
                  {String(item.url)}
                </a>
              ),
            },
            {
              key: "actions",
              header: "",
              render: (item: Record<string, unknown>) => (
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(item as unknown as SocialLink)}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setDeleteTarget(item as unknown as SocialLink)}>
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
          data={socialLinks as unknown as Record<string, unknown>[]}
        />
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? "Edit Social Link" : "Add Social Link"}>
        <form
          onSubmit={handleSubmit((data) => saveMutation.mutate(editing ? { ...data, id: editing.id } : data))}
          className="space-y-4"
        >
          <Select
            label="Platform"
            error={errors.platform?.message}
            options={platformOptions.map((p) => ({ value: p.value, label: p.label }))}
            {...register("platform", {
              onChange: (e) => setValue("platform", e.target.value as SocialPlatform),
            })}
          />
          <Input label="URL" type="url" placeholder="https://facebook.com/yourpage" error={errors.url?.message} {...register("url")} />
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
        title="Delete social link"
        description={`Are you sure you want to delete the ${deleteTarget?.platform} link?`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
