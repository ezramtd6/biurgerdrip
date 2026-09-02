"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button, Input, Select, Textarea, Modal, Table } from "@/components/ui";
import { Promotion, Coupon, Product } from "@/types";
import { Loading } from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ErrorDialog from "@/components/common/ErrorDialog";
import { Search } from "lucide-react";
import { apiErrorMessage } from "@/lib/utils";

interface PromoForm {
  title: string;
  description: string;
  type: Promotion["type"];
  discount_percent: string;
  discount_amount: string;
  link: string;
  start_date: string;
  end_date: string;
  display_order: string;
  is_active: boolean;
}

interface CouponForm {
  code: string;
  discount_percent: string;
  discount_amount: string;
  min_subtotal: string;
  max_discount: string;
  valid_from: string;
  valid_until: string;
  usage_limit: string;
  per_person_limit: string;
  is_active: boolean;
}

const emptyPromoForm: PromoForm = {
  title: "",
  description: "",
  type: "DISCOUNT",
  discount_percent: "",
  discount_amount: "",
  link: "",
  start_date: "",
  end_date: "",
  display_order: "0",
  is_active: true,
};

const emptyCouponForm: CouponForm = {
  code: "",
  discount_percent: "",
  discount_amount: "",
  min_subtotal: "0",
  max_discount: "",
  valid_from: "",
  valid_until: "",
  usage_limit: "",
  per_person_limit: "",
  is_active: true,
};

function discountSummary(p: Promotion): string {
  if (p.discount_percent) return `${Number(p.discount_percent).toFixed(0)}% off`;
  if (p.discount_amount) return `ETB ${Number(p.discount_amount).toFixed(2)} off`;
  return "—";
}

export default function PromotionsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"promotions" | "coupons">("promotions");

  const [promoOpen, setPromoOpen] = useState(false);
  const [promoEditing, setPromoEditing] = useState<Promotion | null>(null);
  const [promoForm, setPromoForm] = useState<PromoForm>(emptyPromoForm);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoDelete, setPromoDelete] = useState<Promotion | null>(null);
  const [typeFilter, setTypeFilter] = useState<"ALL" | Promotion["type"]>("ALL");
  const [promoSearch, setPromoSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [couponOpen, setCouponOpen] = useState(false);
  const [couponEditing, setCouponEditing] = useState<Coupon | null>(null);
  const [couponForm, setCouponForm] = useState<CouponForm>(emptyCouponForm);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponDelete, setCouponDelete] = useState<Coupon | null>(null);
  const [couponSearch, setCouponSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: promotions, isLoading: loadingPromotions } = useQuery<Promotion[]>({
    queryKey: ["admin-promotions"],
    queryFn: async () => {
      const res = await api.get("/promotions/");
      return res.data.results || res.data;
    },
  });

  const { data: coupons } = useQuery<Coupon[]>({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const res = await api.get("/coupons/");
      return res.data.results || res.data;
    },
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["admin-promo-products"],
    queryFn: async () => {
      const res = await api.get("/products/");
      return res.data.results || res.data;
    },
  });

  const invalidatePromotions = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-promotions"] });
    queryClient.invalidateQueries({ queryKey: ["promotions"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["cashier-products"] });
  };

  const promoCreate = useMutation({
    mutationFn: (body: FormData | Record<string, unknown>) => api.post("/promotions/", body),
    onSuccess: () => { invalidatePromotions(); setPromoOpen(false); },
    onError: (e: unknown) => setPromoError(apiErrorMessage(e, "Failed to create promotion")),
  });

  const promoUpdate = useMutation({
    mutationFn: ({ id, body }: { id: number; body: FormData | Record<string, unknown> }) =>
      api.put(`/promotions/${id}/`, body),
    onSuccess: () => { invalidatePromotions(); setPromoOpen(false); setPromoEditing(null); },
    onError: (e: unknown) => setPromoError(apiErrorMessage(e, "Failed to update promotion")),
  });

  const promoDeleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/promotions/${id}/`),
    onSuccess: () => invalidatePromotions(),
  });

  const promoToggle = useMutation({
    mutationFn: (p: Promotion) => api.patch(`/promotions/${p.id}/`, { is_active: !p.is_active }),
    onSuccess: () => invalidatePromotions(),
    onError: (e: unknown) => setErrorMessage((e as { response?: { data?: unknown } }).response?.data as string || "Failed to update promotion"),
  });

  const couponCreate = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post("/coupons/", body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }); setCouponOpen(false); setCouponForm(emptyCouponForm); },
    onError: (e: unknown) => setCouponError(apiErrorMessage(e, "Failed to create coupon")),
  });

  const couponUpdate = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) =>
      api.put(`/coupons/${id}/`, body),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }); setCouponOpen(false); setCouponEditing(null); setCouponForm(emptyCouponForm); },
    onError: (e: unknown) => setCouponError(apiErrorMessage(e, "Failed to update coupon")),
  });

  const couponDeleteMut = useMutation({
    mutationFn: (id: number) => api.delete(`/coupons/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  const couponToggle = useMutation({
    mutationFn: (c: Coupon) => api.patch(`/coupons/${c.id}/`, { is_active: !c.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
    onError: (e: unknown) => setErrorMessage(apiErrorMessage(e, "Failed to update coupon")),
  });

  const toggleProduct = (id: number) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const resetPromoForm = () => {
    setPromoForm(emptyPromoForm);
    setSelectedProducts([]);
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
    setPromoError(null);
  };

  const openPromoCreate = () => { setPromoEditing(null); resetPromoForm(); setPromoOpen(true); };

  const openPromoEdit = (p: Promotion) => {
    setPromoEditing(p);
    setPromoForm({
      title: p.title,
      description: p.description,
      type: p.type,
      discount_percent: p.discount_percent != null ? String(p.discount_percent) : "",
      discount_amount: p.discount_amount != null ? String(p.discount_amount) : "",
      link: p.link,
      start_date: p.start_date || "",
      end_date: p.end_date || "",
      display_order: String(p.display_order),
      is_active: p.is_active,
    });
    setSelectedProducts(p.products);
    setImageFile(null);
    setImagePreview(p.image || null);
    setImageError(null);
    setPromoError(null);
    setPromoOpen(true);
  };

  const buildPromoBody = (): FormData | Record<string, unknown> => {
    const json: Record<string, unknown> = {
      title: promoForm.title.trim(),
      description: promoForm.description,
      type: promoForm.type,
      link: promoForm.link.trim(),
      start_date: promoForm.start_date || null,
      end_date: promoForm.end_date || null,
      display_order: Number(promoForm.display_order) || 0,
      is_active: promoForm.is_active,
    };
    if (promoForm.type === "DISCOUNT") {
      json.discount_percent = promoForm.discount_percent ? Number(promoForm.discount_percent) : null;
      json.discount_amount = promoForm.discount_amount ? Number(promoForm.discount_amount) : null;
      json.products = selectedProducts;
    } else {
      json.discount_percent = null;
      json.discount_amount = null;
      json.products = [];
    }
    if (imageFile) {
      const fd = new FormData();
      Object.entries(json).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => fd.append(key, String(v)));
        } else if (value !== null && value !== undefined) {
          fd.append(key, String(value));
        }
      });
      fd.append("image", imageFile);
      return fd;
    }
    return json;
  };

  const submitPromo = () => {
    setPromoError(null);
    if (!promoForm.title.trim()) { setPromoError("Title is required"); return; }
    if (promoForm.type === "DISCOUNT") {
      if (!promoForm.discount_percent && !promoForm.discount_amount) {
        setPromoError("A discount needs discount_percent or discount_amount.");
        return;
      }
      if (promoForm.discount_percent && promoForm.discount_amount) {
        setPromoError("Set either discount percent or amount, not both.");
        return;
      }
    } else if (!promoEditing && !imageFile) {
      setImageError("Banner image is required");
      return;
    }
    if (promoForm.start_date && promoForm.end_date && promoForm.end_date < promoForm.start_date) {
      setPromoError("End date cannot be before start date.");
      return;
    }
    const body = buildPromoBody();
    if (promoEditing) promoUpdate.mutate({ id: promoEditing.id, body });
    else promoCreate.mutate(body);
  };

  const buildCouponBody = (): Record<string, unknown> | null => {
    const percent = couponForm.discount_percent ? Number(couponForm.discount_percent) : null;
    const amount = couponForm.discount_amount ? Number(couponForm.discount_amount) : null;
    if (!percent && !amount) {
      setCouponError("A coupon needs discount_percent or discount_amount.");
      return null;
    }
    if (percent && amount) {
      setCouponError("Set either discount percent or amount, not both.");
      return null;
    }
    return {
      code: couponForm.code.trim().toUpperCase(),
      discount_percent: percent,
      discount_amount: amount,
      min_subtotal: Number(couponForm.min_subtotal) || 0,
      max_discount: couponForm.max_discount ? Number(couponForm.max_discount) : null,
      valid_from: couponForm.valid_from || null,
      valid_until: couponForm.valid_until || null,
      usage_limit: couponForm.usage_limit ? Number(couponForm.usage_limit) : null,
      per_person_limit: couponForm.per_person_limit ? Number(couponForm.per_person_limit) : null,
      is_active: couponForm.is_active,
    };
  };

  const submitCoupon = () => {
    setCouponError(null);
    if (!couponForm.code.trim()) { setCouponError("Code is required"); return; }
    if (couponForm.valid_from && couponForm.valid_until && couponForm.valid_until < couponForm.valid_from) {
      setCouponError("End date cannot be before start date.");
      return;
    }
    const body = buildCouponBody();
    if (!body) return;
    if (couponEditing) couponUpdate.mutate({ id: couponEditing.id, body });
    else couponCreate.mutate(body);
  };

  const openCouponCreate = () => { setCouponEditing(null); setCouponForm(emptyCouponForm); setCouponError(null); setCouponOpen(true); };

  const openCouponEdit = (c: Coupon) => {
    setCouponEditing(c);
    setCouponForm({
      code: c.code,
      discount_percent: c.discount_percent != null ? String(c.discount_percent) : "",
      discount_amount: c.discount_amount != null ? String(c.discount_amount) : "",
      min_subtotal: String(c.min_subtotal),
      max_discount: c.max_discount != null ? String(c.max_discount) : "",
      valid_from: c.valid_from || "",
      valid_until: c.valid_until || "",
      usage_limit: c.usage_limit != null ? String(c.usage_limit) : "",
      per_person_limit: c.per_person_limit != null ? String(c.per_person_limit) : "",
      is_active: c.is_active,
    });
    setCouponError(null);
    setCouponOpen(true);
  };

  if (loadingPromotions) return <Loading />;

  const promoQuery = promoSearch.trim().toLowerCase();
  const filteredPromos = (promotions ?? []).filter((p) => {
    if (typeFilter !== "ALL" && p.type !== typeFilter) return false;
    if (!promoQuery) return true;
    return p.title.toLowerCase().includes(promoQuery) || p.description.toLowerCase().includes(promoQuery);
  });

  const couponQuery = couponSearch.trim().toLowerCase();
  const filteredCoupons = (coupons ?? []).filter((c) =>
    !couponQuery || c.code.toLowerCase().includes(couponQuery)
  );

  const typeBadge = (p: Promotion) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.type === "DISCOUNT" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
      {p.type === "DISCOUNT" ? "Discount" : "Banner"}
    </span>
  );

  const statusBadge = (active: boolean) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
      {active ? "Active" : "Frozen"}
    </span>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
        <Button onClick={() => (tab === "promotions" ? openPromoCreate() : openCouponCreate())}>
          {tab === "promotions" ? "Add Promotion" : "Add Coupon"}
        </Button>
      </div>

      <div className="flex gap-2 mb-6">
        {([
          { key: "promotions", label: "Promotions" },
          { key: "coupons", label: "Coupons" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              tab === t.key ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "promotions" ? (
        <>
          {promotions && promotions.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={promoSearch}
                  onChange={(e) => setPromoSearch(e.target.value)}
                  placeholder="Search promotions..."
                  className="pl-9 pr-3 h-9"
                />
              </div>
              <div className="flex gap-2">
                {(["ALL", "DISCOUNT", "BANNER"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setTypeFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      typeFilter === f ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f === "ALL" ? "All" : f === "DISCOUNT" ? "Discount" : "Banner"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!promotions || promotions.length === 0 ? (
            <EmptyState message="No promotions yet" />
          ) : (
            <Table<Promotion>
              columns={[
                { key: "id", header: "ID" },
                { key: "title", header: "Title" },
                { key: "type", header: "Type", render: typeBadge },
                {
                  key: "discount",
                  header: "Discount",
                  render: (p) => (p.type === "DISCOUNT" ? discountSummary(p) : <span className="text-gray-400">—</span>),
                },
                {
                  key: "details",
                  header: "Applied To",
                  render: (p) => (
                    <span className="text-gray-600">
                      {p.type === "DISCOUNT"
                        ? p.products.length > 0
                          ? `${p.products.length} product${p.products.length > 1 ? "s" : ""}`
                          : "All products"
                        : p.link
                          ? <span className="text-blue-600 truncate max-w-xs block">{p.link}</span>
                          : <span className="text-gray-400">—</span>}
                    </span>
                  ),
                },
                {
                  key: "dates",
                  header: "Valid",
                  render: (p) => (
                    <span className="text-gray-500 text-xs">
                      {p.start_date ? p.start_date : "Open"} → {p.end_date ? p.end_date : "Open"}
                    </span>
                  ),
                },
                { key: "is_active", header: "Status", render: (p) => statusBadge(p.is_active) },
                {
                  key: "actions",
                  header: "",
                  render: (p) => (
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openPromoEdit(p)}>Edit</Button>
                      <Button variant={p.is_active ? "secondary" : "brand"} size="sm" loading={promoToggle.isPending && promoToggle.variables === p} onClick={() => promoToggle.mutate(p)}>
                        {p.is_active ? "Freeze" : "Unfreeze"}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setPromoDelete(p)}>Delete</Button>
                    </div>
                  ),
                },
              ]}
              data={filteredPromos}
              emptyMessage="No promotions match your search"
            />
          )}

          <Modal isOpen={promoOpen} onClose={() => { setPromoOpen(false); setPromoEditing(null); }} title={promoEditing ? "Edit Promotion" : "Add Promotion"} maxWidth="2xl">
            <form
              onSubmit={(e) => { e.preventDefault(); submitPromo(); }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Select
                    label="Type"
                    value={promoForm.type}
                    onChange={(e) => setPromoForm({ ...promoForm, type: e.target.value as Promotion["type"] })}
                    options={[
                      { value: "DISCOUNT", label: "Product discount" },
                      { value: "BANNER", label: "Marketing banner" },
                    ]}
                  />
                  <Input
                    label="Title"
                    required
                    value={promoForm.title}
                    onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })}
                  />
                  <Textarea
                    label="Description"
                    value={promoForm.description}
                    onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Start date"
                      type="date"
                      value={promoForm.start_date}
                      onChange={(e) => setPromoForm({ ...promoForm, start_date: e.target.value })}
                    />
                    <Input
                      label="End date"
                      type="date"
                      value={promoForm.end_date}
                      onChange={(e) => setPromoForm({ ...promoForm, end_date: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Display order"
                      type="number"
                      min={0}
                      value={promoForm.display_order}
                      onChange={(e) => setPromoForm({ ...promoForm, display_order: e.target.value })}
                    />
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={promoForm.is_active}
                          onChange={(e) => setPromoForm({ ...promoForm, is_active: e.target.checked })}
                        />
                        Active
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {promoForm.type === "DISCOUNT" ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Discount %"
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          placeholder="e.g. 20"
                          value={promoForm.discount_percent}
                          onChange={(e) => setPromoForm({ ...promoForm, discount_percent: e.target.value })}
                        />
                        <Input
                          label="Discount Amount (ETB)"
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="e.g. 50"
                          value={promoForm.discount_amount}
                          onChange={(e) => setPromoForm({ ...promoForm, discount_amount: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Apply to products</label>
                        <div className="max-h-[16rem] overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-1">
                          {!products || products.length === 0 ? (
                            <p className="text-sm text-gray-400">No products available</p>
                          ) : (
                            products.map((prod) => (
                              <label key={prod.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="rounded"
                                  checked={selectedProducts.includes(prod.id)}
                                  onChange={() => toggleProduct(prod.id)}
                                />
                                <span className="truncate">{prod.name}</span>
                                <span className="text-gray-400 text-xs ml-auto whitespace-nowrap">
                                  {Number(prod.price).toFixed(2)}
                                </span>
                              </label>
                            ))
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-400">Leave unchecked to apply to all products.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setImageFile(file);
                              setImagePreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-400 transition-colors cursor-pointer"
                        >
                          {imagePreview ? (
                            <div className="flex flex-col items-center gap-2">
                              <img src={imagePreview} alt="Preview" className="w-40 h-24 object-cover rounded-lg" />
                              <span className="text-sm text-gray-500">Click to change</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-2xl">+</span>
                              <span className="text-sm text-gray-500">Click to upload banner image</span>
                            </div>
                          )}
                        </button>
                        {imageError && <p className="mt-1 text-sm text-red-500">{imageError}</p>}
                      </div>
                      <Input
                        label="Link (optional)"
                        value={promoForm.link}
                        onChange={(e) => setPromoForm({ ...promoForm, link: e.target.value })}
                      />
                    </>
                  )}
                </div>
              </div>

              {promoError && <p className="text-sm text-red-500">{promoError}</p>}

              <div className="flex gap-3 justify-end">
                <Button variant="secondary" type="button" onClick={() => setPromoOpen(false)}>Cancel</Button>
                <Button type="submit" loading={promoCreate.isPending || promoUpdate.isPending}>
                  {promoEditing ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Modal>

          <ConfirmDialog
            open={!!promoDelete}
            onClose={() => setPromoDelete(null)}
            onConfirm={() => { if (promoDelete) promoDeleteMut.mutate(promoDelete.id); setPromoDelete(null); }}
            title="Delete promotion"
            description={`Are you sure you want to delete "${promoDelete?.title}"?`}
            confirmLabel="Delete"
            destructive
          />
        </>
      ) : (
        <>
          {coupons && coupons.length > 0 && (
            <div className="relative max-w-sm mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={couponSearch}
                onChange={(e) => setCouponSearch(e.target.value)}
                placeholder="Search coupons..."
                className="pl-9 pr-3 h-9"
              />
            </div>
          )}

          {!coupons || coupons.length === 0 ? (
            <EmptyState message="No coupons yet" />
          ) : (
            <Table<Coupon>
              columns={[
                { key: "code", header: "Code" },
                {
                  key: "discount",
                  header: "Discount",
                  render: (c) => (
                    <span className="font-medium">
                      {c.discount_percent ? `${Number(c.discount_percent).toFixed(0)}%` : `ETB ${Number(c.discount_amount).toFixed(2)}`}
                      {c.max_discount ? ` (max ETB ${Number(c.max_discount).toFixed(2)})` : ""}
                    </span>
                  ),
                },
                { key: "min_subtotal", header: "Min Subtotal", render: (c) => `ETB ${Number(c.min_subtotal).toFixed(2)}` },
                {
                  key: "usage",
                  header: "Usage",
                  render: (c) => (
                    <span>
                      {c.times_used}{c.usage_limit != null ? ` / ${c.usage_limit}` : ""}
                      {c.per_person_limit != null ? ` (${c.per_person_limit}/person)` : ""}
                    </span>
                  ),
                },
                {
                  key: "valid",
                  header: "Valid",
                  render: (c) => (
                    <span className="text-gray-500 text-xs">
                      {c.valid_from ? c.valid_from : "Open"} → {c.valid_until ? c.valid_until : "Open"}
                    </span>
                  ),
                },
                { key: "is_active", header: "Status", render: (c) => statusBadge(c.is_active) },
                {
                  key: "actions",
                  header: "",
                  render: (c) => (
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => openCouponEdit(c)}>Edit</Button>
                      <Button variant={c.is_active ? "secondary" : "brand"} size="sm" loading={couponToggle.isPending && couponToggle.variables === c} onClick={() => couponToggle.mutate(c)}>
                        {c.is_active ? "Freeze" : "Unfreeze"}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setCouponDelete(c)}>Delete</Button>
                    </div>
                  ),
                },
              ]}
              data={filteredCoupons}
              emptyMessage="No coupons match your search"
            />
          )}

          <Modal isOpen={couponOpen} onClose={() => { setCouponOpen(false); setCouponEditing(null); }} title={couponEditing ? "Edit Coupon" : "Add Coupon"}>
            <form onSubmit={(e) => { e.preventDefault(); submitCoupon(); }} className="space-y-4">
              <Input
                label="Code"
                required
                placeholder="e.g. SAVE20"
                value={couponForm.code}
                onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Discount %"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  placeholder="e.g. 10"
                  value={couponForm.discount_percent}
                  onChange={(e) => setCouponForm({ ...couponForm, discount_percent: e.target.value })}
                />
                <Input
                  label="Discount Amount (ETB)"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 50"
                  value={couponForm.discount_amount}
                  onChange={(e) => setCouponForm({ ...couponForm, discount_amount: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Min Subtotal (ETB)"
                  type="number"
                  min={0}
                  step="0.01"
                  value={couponForm.min_subtotal}
                  onChange={(e) => setCouponForm({ ...couponForm, min_subtotal: e.target.value })}
                />
                <Input
                  label="Max Discount (ETB)"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Optional"
                  value={couponForm.max_discount}
                  onChange={(e) => setCouponForm({ ...couponForm, max_discount: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Valid from"
                  type="date"
                  value={couponForm.valid_from}
                  onChange={(e) => setCouponForm({ ...couponForm, valid_from: e.target.value })}
                />
                <Input
                  label="Valid until"
                  type="date"
                  value={couponForm.valid_until}
                  onChange={(e) => setCouponForm({ ...couponForm, valid_until: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Usage limit"
                  type="number"
                  min={1}
                  placeholder="Optional"
                  value={couponForm.usage_limit}
                  onChange={(e) => setCouponForm({ ...couponForm, usage_limit: e.target.value })}
                />
                <Input
                  label="Per person limit"
                  type="number"
                  min={1}
                  placeholder="Optional"
                  value={couponForm.per_person_limit}
                  onChange={(e) => setCouponForm({ ...couponForm, per_person_limit: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={couponForm.is_active}
                  onChange={(e) => setCouponForm({ ...couponForm, is_active: e.target.checked })}
                />
                Active
              </label>

              {couponError && <p className="text-sm text-red-500">{couponError}</p>}

              <div className="flex gap-3 justify-end">
                <Button variant="secondary" type="button" onClick={() => setCouponOpen(false)}>Cancel</Button>
                <Button type="submit" loading={couponCreate.isPending || couponUpdate.isPending}>
                  {couponEditing ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Modal>

          <ConfirmDialog
            open={!!couponDelete}
            onClose={() => setCouponDelete(null)}
            onConfirm={() => { if (couponDelete) couponDeleteMut.mutate(couponDelete.id); setCouponDelete(null); }}
            title="Delete coupon"
            description={`Are you sure you want to delete coupon "${couponDelete?.code}"?`}
            confirmLabel="Delete"
            destructive
          />
        </>
      )}

      <ErrorDialog open={!!errorMessage} onClose={() => setErrorMessage(null)} message={errorMessage || ""} />
    </div>
  );
}