"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Input, Modal, Select, Textarea } from "@/components/ui";
import { RestaurantInfo, Branch, Contact, SocialLink, SocialPlatform } from "@/types";
import { Loading } from "@/components/common/Loading";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const infoSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  phone: z
    .string()
    .min(1, "Phone is required")
    .regex(/^\+251(?:\s?\d{3}\s?\d{3}\s?\d{3})$/, "Phone must start with +251 followed by 9 digits, e.g. +251 911 234 567"),
  opening_hours: z.string().min(1, "Opening hours is required"),
  latitude: z.coerce.number().refine((v) => !Number.isNaN(v) && v >= -90 && v <= 90, "Invalid latitude").optional(),
  longitude: z.coerce.number().refine((v) => !Number.isNaN(v) && v >= -180 && v <= 180, "Invalid longitude").optional(),
  contact_email: z
    .string()
    .min(1, "Email is required")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address, e.g. info@burgerhouse.com"),
});

type RestaurantForm = z.infer<typeof infoSchema>;

const aboutSchema = z.object({
  about: z.string(),
  about_amharic: z.string(),
});

type AboutForm = z.infer<typeof aboutSchema>;

const branchSchema = z.object({
  name: z.string().min(1, "Branch name is required"),
  latitude: z.coerce.number().refine((v) => !Number.isNaN(v) && v >= -90 && v <= 90, "Invalid latitude").optional(),
  longitude: z.coerce.number().refine((v) => !Number.isNaN(v) && v >= -180 && v <= 180, "Invalid longitude").optional(),
});

type BranchForm = z.infer<typeof branchSchema>;

const platformOptions: { value: SocialPlatform; label: string; icon: string }[] = [
  { value: "facebook", label: "Facebook", icon: "fab fa-facebook-f" },
  { value: "instagram", label: "Instagram", icon: "fab fa-instagram" },
  { value: "twitter", label: "Twitter / X", icon: "fab fa-twitter" },
  { value: "tiktok", label: "TikTok", icon: "fab fa-tiktok" },
  { value: "youtube", label: "YouTube", icon: "fab fa-youtube" },
  { value: "telegram", label: "Telegram", icon: "fab fa-telegram-plane" },
];

const socialLinkSchema = z.object({
  platform: z.enum(["facebook", "instagram", "twitter", "tiktok", "youtube", "telegram"]),
  url: z.string().url("Enter a valid URL"),
});

type SocialLinkForm = z.infer<typeof socialLinkSchema>;

function extractError(e: unknown): string {
  const err = e as { response?: { status?: number; data?: unknown }; message?: string };
  const data = err?.response?.data as Record<string, unknown> | string | undefined;
  if (data && typeof data === "object") {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(data)) {
      if (Array.isArray(v)) parts.push(`${k}: ${v.join(", ")}`);
      else if (v) parts.push(`${k}: ${String(v)}`);
    }
    if (parts.length) return parts.join("; ");
  } else if (data && typeof data === "string") {
    return data;
  }
  return err?.message || "Request failed";
}

export default function RestaurantPage() {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [aboutEditing, setAboutEditing] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deleteRestaurant, setDeleteRestaurant] = useState(false);
  const [deleteBranch, setDeleteBranch] = useState<Branch | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [socialOpen, setSocialOpen] = useState(false);
  const [editingSocial, setEditingSocial] = useState<SocialLink | null>(null);
  const [deleteSocial, setDeleteSocial] = useState<SocialLink | null>(null);

  const { data: info, isLoading } = useQuery<RestaurantInfo | null>({
    queryKey: ["restaurant-info"],
    queryFn: async () => {
      const res = await api.get("/restaurant/");
      const results = res.data.results || res.data;
      return (Array.isArray(results) ? results[0] : results) ?? null;
    },
  });

  const { data: branches, isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await api.get("/branches/");
      const results = res.data.results || res.data;
      return Array.isArray(results) ? results : [];
    },
    enabled: !!info,
  });

  const { data: contact, isLoading: contactLoading } = useQuery<Contact | null>({
    queryKey: ["restaurant-contact"],
    queryFn: async () => {
      const res = await api.get("/contacts/");
      const results = res.data.results || res.data;
      return (Array.isArray(results) ? results[0] : results) ?? null;
    },
  });

  const { data: socialLinks, isLoading: socialLoading } = useQuery<SocialLink[]>({
    queryKey: ["restaurant-social-links"],
    queryFn: async () => {
      const res = await api.get("/social-links/");
      return res.data.results || res.data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: RestaurantForm) => {
      const fd = new FormData();
      fd.append("name", data.name);
      fd.append("address", data.address);
      fd.append("phone", data.phone);
      fd.append("opening_hours", data.opening_hours);
      if (data.latitude !== undefined) fd.append("latitude", String(data.latitude));
      if (data.longitude !== undefined) fd.append("longitude", String(data.longitude));
      if (logoFile) fd.append("logo", logoFile);
      const req = info
        ? api.put(`/restaurant/${info.id}/`, fd, { headers: { "Content-Type": "multipart/form-data" } })
        : api.post("/restaurant/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await req;

      const contactPayload = {
        email: data.contact_email,
        phone: data.phone,
        location: data.address,
      };
      if (contact) return api.patch(`/contacts/${contact.id}/`, contactPayload);
      return api.post("/contacts/", contactPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-info"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-contact"] });
      setError(null);
      setSuccess(true);
      setEditing(false);
      setLogoFile(null);
      setLogoPreview(null);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (e: unknown) => {
      setSuccess(false);
      setError(extractError(e));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/restaurant/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-info"] });
      setError(null);
      setEditing(false);
    },
    onError: (e: unknown) => setError(extractError(e)),
  });

  const toggleMutation = useMutation({
    mutationFn: () => api.patch(`/restaurant/${info!.id}/`, { is_active: !info!.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-info"] });
      setError(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (e: unknown) => setError(extractError(e)),
  });

  const aboutMutation = useMutation({
    mutationFn: (data: AboutForm) => api.patch(`/restaurant/${info!.id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-info"] });
      setError(null);
      setAboutEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (e: unknown) => {
      setSuccess(false);
      setError(extractError(e));
    },
  });

  const branchMutation = useMutation({
    mutationFn: async (data: BranchForm) => {
      const payload = { ...data, restaurant: info!.id };
      if (editingBranch) return api.put(`/branches/${editingBranch.id}/`, payload);
      return api.post("/branches/", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setError(null);
      setBranchOpen(false);
      setEditingBranch(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (e: unknown) => {
      setSuccess(false);
      setError(extractError(e));
    },
  });

  const branchDeleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/branches/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setError(null);
    },
    onError: (e: unknown) => setError(extractError(e)),
  });

  const setMainMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/branches/${id}/`, { is_main: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setError(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (e: unknown) => setError(extractError(e)),
  });

  const socialSaveMutation = useMutation({
    mutationFn: (data: SocialLinkForm & { id?: number }) =>
      data.id
        ? api.patch(`/social-links/${data.id}/`, data)
        : api.post("/social-links/", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-social-links"] });
      setError(null);
      setSocialOpen(false);
      setEditingSocial(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (e: unknown) => {
      setSuccess(false);
      setError(extractError(e));
    },
  });

  const socialDeleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/social-links/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-social-links"] });
      setError(null);
    },
    onError: (e: unknown) => setError(extractError(e)),
  });

  const infoForm = useForm<RestaurantForm>({
    resolver: zodResolver(infoSchema),
    values: info
      ? {
          name: info.name,
          address: info.address,
          phone: info.phone,
          opening_hours: info.opening_hours,
          latitude: info.latitude ?? undefined,
          longitude: info.longitude ?? undefined,
          contact_email: contact?.email ?? "",
        }
      : undefined,
  });

  const aboutForm = useForm<AboutForm>({
    resolver: zodResolver(aboutSchema),
    values: info
      ? {
          about: info.about,
          about_amharic: info.about_amharic,
        }
      : undefined,
  });

  const branchForm = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
    values: editingBranch
      ? {
          name: editingBranch.name,
          latitude: editingBranch.latitude ?? undefined,
          longitude: editingBranch.longitude ?? undefined,
        }
      : undefined,
  });

  const openAddBranch = () => {
    setEditingBranch(null);
    branchForm.reset();
    setError(null);
    setBranchOpen(true);
  };

  const openEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    branchForm.reset({
      name: branch.name,
      latitude: branch.latitude ?? undefined,
      longitude: branch.longitude ?? undefined,
    });
    setError(null);
    setBranchOpen(true);
  };

  const socialForm = useForm<SocialLinkForm>({
    resolver: zodResolver(socialLinkSchema),
    defaultValues: { platform: "facebook", url: "" },
    values: editingSocial
      ? { platform: editingSocial.platform, url: editingSocial.url }
      : undefined,
  });

  const openAddSocial = () => {
    setEditingSocial(null);
    socialForm.reset({ platform: "facebook", url: "" });
    setError(null);
    setSocialOpen(true);
  };

  const openEditSocial = (link: SocialLink) => {
    setEditingSocial(link);
    socialForm.reset({ platform: link.platform, url: link.url });
    setError(null);
    setSocialOpen(true);
  };

  const usedPlatforms = new Set(
    (socialLinks || [])
      .filter((l) => !editingSocial || l.id !== editingSocial.id)
      .map((l) => l.platform)
  );

  const availablePlatforms = platformOptions.map((p) => ({
    value: p.value,
    label: usedPlatforms.has(p.value) ? `${p.label} (already added)` : p.label,
    disabled: usedPlatforms.has(p.value),
  }));

  const openEdit = () => {
    setLogoFile(null);
    setLogoPreview(info?.logo || null);
    setEditing(true);
  };

  if (isLoading) return <Loading />;

  const handleDelete = () => {
    if (info) deleteMutation.mutate(info.id);
    setDeleteRestaurant(false);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Restaurant Information</h1>

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
          Saved successfully!
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 p-6">
        {info && !editing ? (
          <div className="space-y-4">
            {info.logo && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Logo</dt>
                <dd className="mt-1">
                  <img src={info.logo} alt={`${info.name} logo`} className="w-20 h-20 rounded-full object-cover" />
                </dd>
              </div>
            )}
            <dl className="grid grid-cols-1 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-gray-900">{info.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-gray-900">{info.address}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-gray-900">{info.phone}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Opening Hours</dt>
                <dd className="mt-1 text-gray-900">{info.opening_hours}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${info.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {info.is_active ? "Active" : "Frozen"}
                  </span>
                </dd>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Latitude</dt>
                  <dd className="mt-1 text-gray-900">{info.latitude ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Longitude</dt>
                  <dd className="mt-1 text-gray-900">{info.longitude ?? "—"}</dd>
                </div>
              </div>
              {contact && (
                <div className="border-t border-gray-100 pt-4">
                  <dt className="text-sm font-medium text-gray-500">Contact Email</dt>
                  <dd className="mt-1 text-gray-900">{contact.email}</dd>
                </div>
              )}
            </dl>
            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" onClick={openEdit}>
                Edit
              </Button>
              <Button type="button" variant={info.is_active ? "secondary" : "brand"} loading={toggleMutation.isPending} onClick={() => toggleMutation.mutate()}>
                {info.is_active ? "Freeze" : "Unfreeze"}
              </Button>
              <Button type="button" variant="danger" loading={deleteMutation.isPending} onClick={() => setDeleteRestaurant(true)}>
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={infoForm.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
            <Input label="Restaurant Name" error={infoForm.formState.errors.name?.message} {...infoForm.register("name")} />
            <Input label="Address" error={infoForm.formState.errors.address?.message} {...infoForm.register("address")} />
            <Input label="Phone" error={infoForm.formState.errors.phone?.message} {...infoForm.register("phone")} />
            <Input label="Contact Email" type="email" placeholder="info@burgerhouse.com" error={infoForm.formState.errors.contact_email?.message} {...infoForm.register("contact_email")} />
            <Input label="Opening Hours" placeholder="e.g. 9:00 AM - 10:00 PM" error={infoForm.formState.errors.opening_hours?.message} {...infoForm.register("opening_hours")} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Latitude" placeholder="e.g. 9.0054" error={infoForm.formState.errors.latitude?.message} {...infoForm.register("latitude")} />
              <Input label="Longitude" placeholder="e.g. 38.7636" error={infoForm.formState.errors.longitude?.message} {...infoForm.register("longitude")} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLogoFile(file);
                    setLogoPreview(URL.createObjectURL(file));
                  }
                }}
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-400 transition-colors cursor-pointer"
              >
                {logoPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={logoPreview} alt="Logo preview" className="w-20 h-20 rounded-full object-cover" />
                    <span className="text-sm text-gray-500">Click to change</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-2xl">+</span>
                    <span className="text-sm text-gray-500">Click to upload logo</span>
                  </div>
                )}
              </button>
            </div>

            <div className="flex gap-3">
              <Button type="submit" loading={updateMutation.isPending}>
                {info ? "Save Changes" : "Create Restaurant"}
              </Button>
              {info && editing && (
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">About Us</h2>
          {info && !aboutEditing && (
            <Button variant="secondary" onClick={() => setAboutEditing(true)}>
              Edit
            </Button>
          )}
        </div>

        {!info ? (
          <p className="text-sm text-gray-500">Save the restaurant information first to add the About Us section.</p>
        ) : aboutEditing ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <form onSubmit={aboutForm.handleSubmit((data) => aboutMutation.mutate(data))} className="space-y-4">
              <Textarea label="About Us (English)" placeholder="Tell customers about your restaurant, its story, and what makes it special..." error={aboutForm.formState.errors.about?.message} {...aboutForm.register("about")} />
              <Textarea label="About Us (አማርኛ)" placeholder="ስለ ቤት ቤት ምግብ ቤትዎ ይጻፉ..." error={aboutForm.formState.errors.about_amharic?.message} {...aboutForm.register("about_amharic")} />
              <div className="flex gap-3">
                <Button type="submit" loading={aboutMutation.isPending}>
                  Save About Us
                </Button>
                <Button type="button" variant="secondary" onClick={() => setAboutEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        ) : (info.about || info.about_amharic) ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            {info.about_amharic && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-500 mb-1">አማርኛ</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{info.about_amharic}</p>
              </div>
            )}
            {info.about && <p className="text-sm text-gray-700 whitespace-pre-line">{info.about}</p>}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No About Us text yet. Click Edit to add it.</p>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Branches</h2>
          <Button onClick={openAddBranch} disabled={!info}>
            <span className="text-lg leading-none mr-1">+</span> Add Branch
          </Button>
        </div>

        {!info ? (
          <p className="text-sm text-gray-500">Save the restaurant information first to add branches.</p>
        ) : branchesLoading ? (
          <Loading />
        ) : (branches ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No branches added yet.</p>
        ) : (
          <div className="space-y-3">
            {(branches ?? []).map((branch) => (
              <div key={branch.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                <div className="text-sm text-gray-900 flex items-center gap-3">
                  <span className="font-semibold text-gray-900">{branch.name || `Branch #${branch.id}`}</span>
                  {branch.is_main && (
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Main</span>
                  )}
                  <span className="text-gray-500">
                    <span className="font-medium">Lat:</span> {branch.latitude ?? "—"}
                    <span className="mx-3 font-medium">Lng:</span> {branch.longitude ?? "—"}
                  </span>
                </div>
                <div className="flex gap-2">
                  {!branch.is_main && (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={setMainMutation.isPending && setMainMutation.variables === branch.id}
                      onClick={() => setMainMutation.mutate(branch.id)}
                    >
                      Set as Main
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => openEditBranch(branch)}>
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={branchDeleteMutation.isPending && branchDeleteMutation.variables === branch.id}
                    onClick={() => setDeleteBranch(branch)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Social Media Links</h2>
          <Button onClick={openAddSocial} disabled={!info}>
            <span className="text-lg leading-none mr-1">+</span> Add Link
          </Button>
        </div>

        {!info ? (
          <p className="text-sm text-gray-500">Save the restaurant information first to add social media links.</p>
        ) : socialLoading ? (
          <Loading />
        ) : (socialLinks ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No social media links yet.</p>
        ) : (
          <div className="space-y-3">
            {(socialLinks ?? []).map((link) => (
              <div key={link.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
                    <i className={platformOptions.find((p) => p.value === link.platform)?.icon || "fas fa-link"}></i>
                  </span>
                  <span className="text-sm text-gray-900 font-medium capitalize">{link.platform.replace(/-/g, " ")}</span>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-600 hover:underline truncate max-w-[300px]">
                    {link.url}
                  </a>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditSocial(link)}>
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={socialDeleteMutation.isPending && socialDeleteMutation.variables === link.id}
                    onClick={() => setDeleteSocial(link)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={socialOpen}
        onClose={() => { setSocialOpen(false); setEditingSocial(null); }}
        title={editingSocial ? "Edit Social Link" : "Add Social Link"}
      >
        <form onSubmit={socialForm.handleSubmit((data) => socialSaveMutation.mutate(editingSocial ? { ...data, id: editingSocial.id } : data))} className="space-y-4">
          <Select
            label="Platform"
            error={socialForm.formState.errors.platform?.message}
            options={availablePlatforms}
            {...socialForm.register("platform")}
          />
          <Input label="URL" type="url" placeholder="https://facebook.com/yourpage" error={socialForm.formState.errors.url?.message} {...socialForm.register("url")} />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setSocialOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={socialSaveMutation.isPending}>
              {editingSocial ? "Save Changes" : "Add Link"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={branchOpen}
        onClose={() => { setBranchOpen(false); setEditingBranch(null); }}
        title={editingBranch ? "Edit Branch" : "Add Branch"}
      >
        <form onSubmit={branchForm.handleSubmit((data) => branchMutation.mutate(data))} className="space-y-4">
          <Input label="Branch Name" placeholder="e.g. Bole, Piassa, Bishoftu" error={branchForm.formState.errors.name?.message} {...branchForm.register("name")} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Latitude" placeholder="e.g. 9.0054" error={branchForm.formState.errors.latitude?.message} {...branchForm.register("latitude")} />
            <Input label="Longitude" placeholder="e.g. 38.7636" error={branchForm.formState.errors.longitude?.message} {...branchForm.register("longitude")} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setBranchOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={branchMutation.isPending}>
              {editingBranch ? "Save Changes" : "Add Branch"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteRestaurant}
        onClose={() => setDeleteRestaurant(false)}
        onConfirm={handleDelete}
        title="Delete restaurant"
        description="Are you sure you want to delete this restaurant? All its branches will also be deleted."
        confirmLabel="Delete"
        destructive
      />
      <ConfirmDialog
        open={!!deleteBranch}
        onClose={() => setDeleteBranch(null)}
        onConfirm={() => { if (deleteBranch) branchDeleteMutation.mutate(deleteBranch.id); setDeleteBranch(null); }}
        title="Delete branch"
        description="Are you sure you want to delete this branch?"
        confirmLabel="Delete"
        destructive
      />
      <ConfirmDialog
        open={!!deleteSocial}
        onClose={() => setDeleteSocial(null)}
        onConfirm={() => { if (deleteSocial) socialDeleteMutation.mutate(deleteSocial.id); setDeleteSocial(null); }}
        title="Delete social link"
        description={`Are you sure you want to delete the ${deleteSocial?.platform} link?`}
        confirmLabel="Delete"
        destructive
      />
    </div>
  );
}
