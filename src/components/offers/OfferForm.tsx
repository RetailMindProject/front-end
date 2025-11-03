import React, { useState } from "react";
import { X } from "lucide-react";

export type OfferType = "PRODUCT" | "CATEGORY" | "ORDER" | "BUNDLE";
export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface OfferFormData {
  title: string;
  description: string;
  offerType: OfferType;
  discountType: DiscountType;
  discountValue: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
  // Conditional fields
  productIds?: string[];
  categoryIds?: string[];
  minOrderAmount?: number;
  bundleItems?: { productId: string; requiredQty: number }[];
}

interface OfferFormProps {
  mode: "create" | "edit";
  initialData?: Partial<OfferFormData>;
  onSubmit: (data: OfferFormData) => void;
  onClose: () => void;
}

// Mock data for products and categories
const mockProducts = [
  { id: "p1", name: "iPhone 15 Pro", sku: "ELE-IPH15P" },
  { id: "p2", name: "Organic Olive Oil", sku: "GRC-OLV500" },
  { id: "p3", name: "Cotton Hoodie", sku: "CLT-HDY001" },
  { id: "p4", name: "Wireless Earbuds", sku: "ELE-EAR001" },
];

const mockCategories = [
  { id: "c1", name: "Electronics" },
  { id: "c2", name: "Groceries" },
  { id: "c3", name: "Clothes" },
  { id: "c4", name: "Accessories" },
];

export default function OfferForm({ mode, initialData, onSubmit, onClose }: OfferFormProps) {
  const [formData, setFormData] = useState<OfferFormData>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    offerType: initialData?.offerType || "PRODUCT",
    discountType: initialData?.discountType || "PERCENTAGE",
    discountValue: initialData?.discountValue || 0,
    startAt: initialData?.startAt || "",
    endAt: initialData?.endAt || "",
    isActive: initialData?.isActive ?? true,
    productIds: initialData?.productIds || [],
    categoryIds: initialData?.categoryIds || [],
    minOrderAmount: initialData?.minOrderAmount || 0,
    bundleItems: initialData?.bundleItems || [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof OfferFormData, string>>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const newErrors: Partial<Record<keyof OfferFormData, string>> = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (formData.discountValue <= 0) newErrors.discountValue = "Discount value must be greater than 0";
    if (!formData.startAt) newErrors.startAt = "Start date is required";
    if (!formData.endAt) newErrors.endAt = "End date is required";
    if (formData.startAt >= formData.endAt) newErrors.endAt = "End date must be after start date";

    if (formData.offerType === "PRODUCT" && (!formData.productIds || formData.productIds.length === 0)) {
      newErrors.productIds = "At least one product must be selected";
    }
    if (formData.offerType === "CATEGORY" && (!formData.categoryIds || formData.categoryIds.length === 0)) {
      newErrors.categoryIds = "At least one category must be selected";
    }
    if (formData.offerType === "ORDER" && (!formData.minOrderAmount || formData.minOrderAmount <= 0)) {
      newErrors.minOrderAmount = "Minimum order amount is required";
    }
    if (formData.offerType === "BUNDLE" && (!formData.bundleItems || formData.bundleItems.length === 0)) {
      newErrors.bundleItems = "At least one bundle item is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  const toggleProduct = (productId: string) => {
    const current = formData.productIds || [];
    const updated = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId];
    setFormData({ ...formData, productIds: updated });
    setErrors({ ...errors, productIds: undefined });
  };

  const toggleCategory = (categoryId: string) => {
    const current = formData.categoryIds || [];
    const updated = current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId];
    setFormData({ ...formData, categoryIds: updated });
    setErrors({ ...errors, categoryIds: undefined });
  };

  const addBundleItem = () => {
    const updated = [...(formData.bundleItems || []), { productId: "", requiredQty: 1 }];
    setFormData({ ...formData, bundleItems: updated });
  };

  const updateBundleItem = (index: number, field: "productId" | "requiredQty", value: string | number) => {
    const updated = [...(formData.bundleItems || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, bundleItems: updated });
  };

  const removeBundleItem = (index: number) => {
    const updated = (formData.bundleItems || []).filter((_, i) => i !== index);
    setFormData({ ...formData, bundleItems: updated });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">{mode === "create" ? "New Offer" : "Edit Offer"}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                setErrors({ ...errors, title: undefined });
              }}
              className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
                errors.title ? "border-red-300" : "border-slate-300"
              } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              placeholder="Summer Sale 2025"
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Offer description..."
            />
          </div>

          {/* Offer Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Offer Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.offerType}
              onChange={(e) => setFormData({ ...formData, offerType: e.target.value as OfferType })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="PRODUCT">Product</option>
              <option value="CATEGORY">Category</option>
              <option value="ORDER">Order</option>
              <option value="BUNDLE">Bundle</option>
            </select>
          </div>

          {/* Discount Type & Value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Discount Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value as DiscountType })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED_AMOUNT">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Discount Value <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step={formData.discountType === "PERCENTAGE" ? "0.1" : "1"}
                  value={formData.discountValue}
                  onChange={(e) => {
                    setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 });
                    setErrors({ ...errors, discountValue: undefined });
                  }}
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
                    errors.discountValue ? "border-red-300" : "border-slate-300"
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  placeholder={formData.discountType === "PERCENTAGE" ? "10" : "50"}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  {formData.discountType === "PERCENTAGE" ? "%" : "$"}
                </span>
              </div>
              {errors.discountValue && <p className="mt-1 text-xs text-red-500">{errors.discountValue}</p>}
            </div>
          </div>

          {/* Conditional Fields based on Offer Type */}
          {formData.offerType === "PRODUCT" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Products <span className="text-red-500">*</span>
              </label>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-300 p-3 space-y-2">
                {mockProducts.map((product) => (
                  <label key={product.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={(formData.productIds || []).includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">{product.name}</span>
                    <span className="text-xs text-slate-500 ml-auto">({product.sku})</span>
                  </label>
                ))}
              </div>
              {errors.productIds && <p className="mt-1 text-xs text-red-500">{errors.productIds}</p>}
            </div>
          )}

          {formData.offerType === "CATEGORY" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Categories <span className="text-red-500">*</span>
              </label>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-300 p-3 space-y-2">
                {mockCategories.map((category) => (
                  <label key={category.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={(formData.categoryIds || []).includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">{category.name}</span>
                  </label>
                ))}
              </div>
              {errors.categoryIds && <p className="mt-1 text-xs text-red-500">{errors.categoryIds}</p>}
            </div>
          )}

          {formData.offerType === "ORDER" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Minimum Order Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.minOrderAmount || 0}
                  onChange={(e) => {
                    setFormData({ ...formData, minOrderAmount: parseFloat(e.target.value) || 0 });
                    setErrors({ ...errors, minOrderAmount: undefined });
                  }}
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
                    errors.minOrderAmount ? "border-red-300" : "border-slate-300"
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                  placeholder="100.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">$</span>
              </div>
              {errors.minOrderAmount && <p className="mt-1 text-xs text-red-500">{errors.minOrderAmount}</p>}
            </div>
          )}

          {formData.offerType === "BUNDLE" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Bundle Items <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {(formData.bundleItems || []).map((item, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 border border-slate-200 rounded-lg">
                    <div className="flex-1">
                      <select
                        value={item.productId}
                        onChange={(e) => updateBundleItem(index, "productId", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select product</option>
                        {mockProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        value={item.requiredQty}
                        onChange={(e) => updateBundleItem(index, "requiredQty", parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Qty"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBundleItem(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addBundleItem}
                  className="w-full px-4 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                >
                  + Add Bundle Item
                </button>
              </div>
              {errors.bundleItems && <p className="mt-1 text-xs text-red-500">{errors.bundleItems}</p>}
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.startAt}
                onChange={(e) => {
                  setFormData({ ...formData, startAt: e.target.value });
                  setErrors({ ...errors, startAt: undefined });
                }}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
                  errors.startAt ? "border-red-300" : "border-slate-300"
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.startAt && <p className="mt-1 text-xs text-red-500">{errors.startAt}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.endAt}
                onChange={(e) => {
                  setFormData({ ...formData, endAt: e.target.value });
                  setErrors({ ...errors, endAt: undefined });
                }}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
                  errors.endAt ? "border-red-300" : "border-slate-300"
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.endAt && <p className="mt-1 text-xs text-red-500">{errors.endAt}</p>}
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">
              Active
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              {mode === "create" ? "Create Offer" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

