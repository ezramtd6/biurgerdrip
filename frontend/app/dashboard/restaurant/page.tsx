"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Input, Modal, Select, Textarea } from "@/components/ui";
import { RestaurantInfo, Contact, SocialLink, SocialPlatform } from "@/types";
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

const availabilitySchema = z.object({
  available_from: z.string().optional(),
  available_to: z.string().optional(),
});

type AvailabilityForm = z.infer<typeof availabilitySchema>;

const aboutSchema = z.object({
  about: z.string(),
  about_amharic: z.string(),
});

type AboutForm = z.infer<typeof aboutSchema>;

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
  const [availEditing, setAvailEditing] = useState(false);
  const [aboutEditing, setAboutEditing] = useState(false);
  const [deleteRestaurant, setDeleteRestaurant] = useState(false);
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
      fd.append("is_active", "true");
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

  const availabilityMutation = useMutation({
    mutationFn: (data: AvailabilityForm) =>
      api.patch(`/restaurant/${info!.id}/`, {
        available_from: data.available_from || null,
        available_to: data.available_to || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-info"] });
      setError(null);
      setAvailEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (e: unknown) => {
      setSuccess(false);
      setError(extractError(e));
    },
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

  const availForm = useForm<AvailabilityForm>({
    resolver: zodResolver(availabilitySchema),
    values: info
      ? {
          available_from: info.available_from ? info.available_from.slice(0, 5) : "",
          available_to: info.available_to ? info.available_to.slice(0, 5) : "",
        }
      : undefined,
  });

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

  const availabilityState =
    !info || !info.is_active
      ? { label: "Frozen", cls: "bg-gray-100 text-gray-500 border-gray-200", dot: "bg-gray-400", hint: "This restaurant is currently frozen and not accepting orders." }
      : info.is_available_now
        ? { label: "Open now", cls: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500", hint: "Customers can browse and place orders right now." }
        : info.available_from && info.available_to
          ? { label: "Closed", cls: "bg-red-100 text-red-600 border-red-200", dot: "bg-red-500", hint: "Outside the daily available window." }
          : { label: "Always available", cls: "bg-green-100 text-green-700 border-green-200", dot: "bg-green-500", hint: "No time restrictions set." };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurant</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your restaurant profile, hours, story, and links.</p>
        </div>
        {info && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-200 bg-white shadow-sm">
            <span className={`w-2 h-2 rounded-full ${info.is_active ? "bg-green-500" : "bg-gray-400"}`}></span>
            {info.is_active ? "Active" : "Frozen"}
          </span>
        )}
      </div>

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2 animate-pulse">
          <i className="fas fa-check-circle"></i> Saved successfully!
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {info && !editing ? (
          <>
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-8 text-white relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-40 h-40 rounded-full bg-white/10"></div>
              <div className="absolute right-16 -bottom-10 w-28 h-28 rounded-full bg-white/10"></div>
              <div className="flex items-center gap-5 relative">
                {info.logo ? (
                  <img src={info.logo} alt={`${info.name} logo`} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white/30 shadow-lg" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
                    🍔
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-black">{info.name}</h2>
                  <p className="text-orange-100 text-sm mt-1 flex items-center gap-1.5">
                    <i className="fas fa-map-marker-alt"></i> {info.address}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <i className="fas fa-phone text-orange-400"></i> Phone
                </p>
                <p className="mt-1 font-semibold text-gray-900">{info.phone}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <i className="fas fa-clock text-orange-400"></i> Opening Hours
                </p>
                <p className="mt-1 font-semibold text-gray-900">{info.opening_hours}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <i className="fas fa-envelope text-orange-400"></i> Email
                </p>
                <p className="mt-1 font-semibold text-gray-900 break-all">{contact?.email || "—"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <i className="fas fa-map-pin text-orange-400"></i> Coordinates
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {info.latitude ?? "—"}, {info.longitude ?? "—"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <i className="fas fa-store text-orange-400"></i> Status
                </p>
                <p className="mt-1">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${info.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${info.is_active ? "bg-green-500" : "bg-gray-400"}`}></span>
                    {info.is_active ? "Active" : "Frozen"}
                  </span>
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                  <i className="fas fa-hourglass-half text-orange-400"></i> Availability
                </p>
                <p className="mt-1 font-semibold text-gray-900">
                  {info.available_from && info.available_to
                    ? `${info.available_from.slice(0, 5)} – ${info.available_to.slice(0, 5)}`
                    : "Always"}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap gap-2">
              <Button type="button" onClick={openEdit}>
                <i className="fas fa-pen"></i> Edit
              </Button>
              <Button type="button" variant={info.is_active ? "secondary" : "brand"} loading={toggleMutation.isPending} onClick={() => toggleMutation.mutate()}>
                <i className={info.is_active ? "fas fa-pause" : "fas fa-play"}></i> {info.is_active ? "Freeze" : "Unfreeze"}
              </Button>
              <Button type="button" variant="danger" loading={deleteMutation.isPending} onClick={() => setDeleteRestaurant(true)}>
                <i className="fas fa-trash"></i> Delete
              </Button>
            </div>
          </>
        ) : (
          <div className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <i className="fas fa-building text-orange-500"></i> {info ? "Edit Restaurant Information" : "Create Restaurant"}
            </h3>
            <form onSubmit={infoForm.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Restaurant Name" error={infoForm.formState.errors.name?.message} {...infoForm.register("name")} />
                <Input label="Phone" error={infoForm.formState.errors.phone?.message} {...infoForm.register("phone")} />
                <Input label="Address" error={infoForm.formState.errors.address?.message} {...infoForm.register("address")} />
                <Input label="Contact Email" type="email" placeholder="info@burgerhouse.com" error={infoForm.formState.errors.contact_email?.message} {...infoForm.register("contact_email")} />
              </div>
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
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-orange-400 transition-colors cursor-pointer bg-gray-50/50"
                >
                  {logoPreview ? (
                    <div className="flex flex-col items-center gap-3">
                      <img src={logoPreview} alt="Logo preview" className="w-20 h-20 rounded-2xl object-cover ring-2 ring-orange-200" />
                      <span className="text-sm text-gray-500 font-medium">Click to change</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <span className="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center text-2xl">+</span>
                      <span className="text-sm text-gray-500">Click to upload logo</span>
                    </div>
                  )}
                </button>
              </div>

              <div className="flex gap-3 pt-2">
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
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <i className="fas fa-hourglass-half text-orange-500"></i> Availability Time
            </h2>
            {info && !availEditing && (
              <Button variant="ghost" size="sm" onClick={() => setAvailEditing(true)}>
                <i className="fas fa-pen mr-1"></i> Edit
              </Button>
            )}
          </div>
          <div className="p-6">
            {!info ? (
              <p className="text-sm text-gray-500">Save the restaurant information first to set availability time.</p>
            ) : availEditing ? (
              <form onSubmit={availForm.handleSubmit((data) => availabilityMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Available From" type="time" error={availForm.formState.errors.available_from?.message} {...availForm.register("available_from")} />
                  <Input label="Available To" type="time" error={availForm.formState.errors.available_to?.message} {...availForm.register("available_to")} />
                </div>
                <p className="text-xs text-gray-500">
                  Leave both empty for always available. Overnight ranges like 22:00 – 02:00 are supported.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button type="submit" loading={availabilityMutation.isPending}>
                    Save Availability
                  </Button>
                  {(!!info.available_from || !!info.available_to) && (
                    <Button type="button" variant="secondary" loading={availabilityMutation.isPending} onClick={() => availabilityMutation.mutate({ available_from: "", available_to: "" })}>
                      Clear
                    </Button>
                  )}
                  <Button type="button" variant="secondary" onClick={() => setAvailEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center text-lg">
                    <i className="fas fa-clock"></i>
                  </span>
                  <div>
                    <p className="text-lg font-bold text-gray-900">
                      {info.available_from && info.available_to
                        ? `${info.available_from.slice(0, 5)} – ${info.available_to.slice(0, 5)}`
                        : "Always available"}
                    </p>
                    <p className="text-xs text-gray-500">East Africa Time (Addis Ababa)</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${availabilityState.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${availabilityState.dot}`}></span>
                  {availabilityState.label}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <i className="fas fa-book-open text-orange-500"></i> About Us
            </h2>
            {info && !aboutEditing && (info.about || info.about_amharic) && (
              <Button variant="ghost" size="sm" onClick={() => setAboutEditing(true)}>
                <i className="fas fa-pen mr-1"></i> Edit
              </Button>
            )}
          </div>
          <div className="p-6">
            {!info ? (
              <p className="text-sm text-gray-500">Save the restaurant information first to add the About Us section.</p>
            ) : aboutEditing ? (
              <form onSubmit={aboutForm.handleSubmit((data) => aboutMutation.mutate(data))} className="space-y-4">
                <Textarea label="About Us (English)" placeholder="Tell customers about your restaurant, its story, and what makes it special..." error={aboutForm.formState.errors.about?.message} {...aboutForm.register("about")} />
                <Textarea label="About Us (አማርኛ)" placeholder="ስለ ቤት ቤት ምግብ ቤትዎ ይጻፉ..." error={aboutForm.formState.errors.about_amharic?.message} {...aboutForm.register("about_amharic")} />
                <div className="flex gap-2">
                  <Button type="submit" loading={aboutMutation.isPending}>
                    Save About Us
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setAboutEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (info.about || info.about_amharic) ? (
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {info.about && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">English</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{info.about}</p>
                  </div>
                )}
                {info.about_amharic && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">አማርኛ</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{info.about_amharic}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-2">No About Us text yet.</p>
                <Button variant="secondary" size="sm" onClick={() => setAboutEditing(true)}>
                  <i className="fas fa-plus mr-1"></i> Add About Us
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <i className="fas fa-share-nodes text-orange-500"></i> Social Media Links
          </h2>
          <Button onClick={openAddSocial} disabled={!info}>
            <i className="fas fa-plus text-xs"></i> Add Link
          </Button>
        </div>
        <div className="p-6">
          {!info ? (
            <p className="text-sm text-gray-500">Save the restaurant information first to add social media links.</p>
          ) : socialLoading ? (
            <Loading />
          ) : (socialLinks ?? []).length === 0 ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-orange-50 text-orange-400 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">
                <i className="fas fa-share-nodes"></i>
              </div>
              <p className="text-sm text-gray-500">No social media links yet. Add your pages to connect with customers.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(socialLinks ?? []).map((link) => {
                const platform = platformOptions.find((p) => p.value === link.platform);
                return (
                  <div key={link.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-10 h-10 bg-white text-orange-600 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center shrink-0">
                        <i className={platform?.icon || "fas fa-link"}></i>
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 capitalize">{link.platform.replace(/-/g, " ")}</p>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 hover:underline truncate block max-w-[280px]">
                          {link.url}
                        </a>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openEditSocial(link)}>
                        <i className="fas fa-pen mr-1"></i> Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={socialDeleteMutation.isPending && socialDeleteMutation.variables === link.id}
                        onClick={() => setDeleteSocial(link)}
                      >
                        <i className="fas fa-trash"></i>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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

      <ConfirmDialog
        open={deleteRestaurant}
        onClose={() => setDeleteRestaurant(false)}
        onConfirm={handleDelete}
        title="Delete restaurant"
        description="Are you sure you want to delete this restaurant?"
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
