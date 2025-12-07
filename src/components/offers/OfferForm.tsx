import React, { useState, useRef, useEffect } from "react";
import { X, Search } from "lucide-react";
import { offersApi, type Product, type Category } from "../../services/offers.api";

export type OfferType = "PRODUCT" | "CATEGORY" | "ORDER" | "BUNDLE";
export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface OfferFormData {
  code: string;
  title: string;
  description: string;
  offerType: OfferType;
  discountType: DiscountType;
  discountValue: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
  // Conditional fields
  productIds?: number[];
  categoryIds?: number[];
  minOrderAmount?: number;
  applyOnce?: boolean;
  bundleItems?: { productId: number; requiredQty: number }[];
}

interface OfferFormProps {
  mode: "create" | "edit" | "view";
  initialData?: Partial<OfferFormData> & { id?: string | number };
  onSubmit: (data: OfferFormData) => void;
  onClose: () => void;
}

export default function OfferForm({ mode, initialData, onSubmit, onClose }: OfferFormProps) {
  const offerId = initialData?.id ? (typeof initialData.id === 'string' ? parseInt(initialData.id) : initialData.id) : undefined;
  
  const [formData, setFormData] = useState<OfferFormData>({
    code: initialData?.code || "",
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
    applyOnce: initialData?.applyOnce ?? true,
    bundleItems: initialData?.bundleItems || [],
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [errors, setErrors] = useState<Partial<Record<keyof OfferFormData, string>>>({});
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [bundleSearchTerms, setBundleSearchTerms] = useState<Record<number, string>>({});
  const [showBundleDropdowns, setShowBundleDropdowns] = useState<Record<number, boolean>>({});
  const productSearchRef = useRef<HTMLDivElement>(null);
  const categorySearchRef = useRef<HTMLDivElement>(null);
  const bundleSearchRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Fetch products from backend
  useEffect(() => {
    const loadProducts = async () => {
      if (formData.offerType === "PRODUCT" || formData.offerType === "BUNDLE") {
        setLoadingProducts(true);
        setError(null);
        try {
          const fetchedProducts = await offersApi.fetchProducts();
          if (fetchedProducts && fetchedProducts.length > 0) {
            setProducts(fetchedProducts);
          } else {
            // Set empty array if no products found, so form can still be used
            setProducts([]);
            console.warn("No products found or empty response");
          }
        } catch (error) {
          console.error("Error loading products:", error);
          // Set empty array if fetch fails, so form can still be used
          setProducts([]);
          setError("Failed to load products. You can still create the offer.");
        } finally {
          setLoadingProducts(false);
        }
      } else {
        // Reset products when offer type changes away from PRODUCT/BUNDLE
        setProducts([]);
      }
    };
    loadProducts();
  }, [formData.offerType]);

  // Fetch categories from backend
  useEffect(() => {
    const loadCategories = async () => {
      if (formData.offerType === "CATEGORY") {
        setLoadingCategories(true);
        setCategoryError(null);
        try {
          const fetchedCategories = await offersApi.fetchCategories();
          console.log("Fetched categories in form:", fetchedCategories);
          if (fetchedCategories) {
            setCategories(fetchedCategories);
            console.log("Categories set in state:", fetchedCategories);
            if (fetchedCategories.length === 0) {
              console.warn("Categories array is empty");
            }
          } else {
            // Set empty array if no categories found, so form can still be used
            setCategories([]);
            console.warn("No categories found or null response");
          }
        } catch (error) {
          console.error("Error loading categories:", error);
          // Set empty array if fetch fails, so form can still be used
          setCategories([]);
          setCategoryError("Failed to load categories. You can still create the offer.");
        } finally {
          setLoadingCategories(false);
        }
      } else {
        // Reset categories when offer type changes away from CATEGORY
        setCategories([]);
      }
    };
    loadCategories();
  }, [formData.offerType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If in view mode, just close the form
    if (mode === "view") {
      onClose();
      return;
    }

    // Basic validation
    const newErrors: Partial<Record<keyof OfferFormData, string>> = {};
    if (!formData.code.trim()) newErrors.code = "Code is required";
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
    // Validate bundle items have valid product IDs
    if (formData.offerType === "BUNDLE" && formData.bundleItems && formData.bundleItems.length > 0) {
      const invalidItems = formData.bundleItems.filter(item => !item.productId || item.productId <= 0);
      if (invalidItems.length > 0) {
        newErrors.bundleItems = "All bundle items must have a valid product selected";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Handle PRODUCT, CATEGORY, ORDER, and BUNDLE offer types
    if (formData.offerType === "PRODUCT" || formData.offerType === "CATEGORY" || formData.offerType === "ORDER" || formData.offerType === "BUNDLE") {
      setSubmitting(true);
      try {
        // Convert datetime-local format to ISO format with seconds
        const formatDateTime = (dateTime: string) => {
          if (!dateTime) return "";
          // If already in ISO format with seconds, return as is
          if (dateTime.includes(":") && dateTime.split(":").length === 3) {
            return dateTime;
          }
          // Convert from "YYYY-MM-DDTHH:mm" to "YYYY-MM-DDTHH:mm:ss"
          return dateTime + ":00";
        };

        const request: any = {
          code: formData.code,
          title: formData.title,
          description: formData.description,
          offerType: formData.offerType,
          discountType: formData.discountType,
          discountValue: formData.discountValue,
          startAt: formatDateTime(formData.startAt),
          endAt: formatDateTime(formData.endAt),
          isActive: formData.isActive,
        };

        // Add type-specific fields
        if (formData.offerType === "PRODUCT") {
          request.productIds = formData.productIds || [];
        } else if (formData.offerType === "CATEGORY") {
          request.categoryIds = formData.categoryIds || [];
        } else if (formData.offerType === "ORDER") {
          request.minOrderAmount = formData.minOrderAmount || 0;
          request.applyOnce = formData.applyOnce ?? true;
        } else if (formData.offerType === "BUNDLE") {
          // Filter out any invalid items and ensure requiredQty is at least 1
          request.bundleItems = (formData.bundleItems || [])
            .filter(item => item.productId && item.productId > 0)
            .map(item => ({
              productId: item.productId,
              requiredQty: item.requiredQty > 0 ? item.requiredQty : 1
            }));
        }

        // Use updateOffer if editing, createOffer if creating
        const result = mode === "edit" && offerId
          ? await offersApi.updateOffer(offerId, request)
          : await offersApi.createOffer(request);
          
        if (result.error) {
          alert(`Error ${mode === "edit" ? "updating" : "creating"} offer: ${result.error}`);
          setSubmitting(false);
          return;
        }

        // Call onSubmit callback with form data
        onSubmit(formData);
        setSubmitting(false);
        onClose(); // Close the form after successful submission
      } catch (error) {
        console.error(`Error ${mode === "edit" ? "updating" : "creating"} offer:`, error);
        alert(`An error occurred while ${mode === "edit" ? "updating" : "creating"} the offer`);
        setSubmitting(false);
      }
    }
  };

  const toggleProduct = (productId: number) => {
    const current = formData.productIds || [];
    const updated = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId];
    setFormData({ ...formData, productIds: updated });
    setErrors({ ...errors, productIds: undefined });
  };

  const toggleCategory = (categoryId: number) => {
    const current = formData.categoryIds || [];
    const updated = current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId];
    setFormData({ ...formData, categoryIds: updated });
    setErrors({ ...errors, categoryIds: undefined });
  };

  const addBundleItem = () => {
    const updated = [...(formData.bundleItems || []), { productId: 0, requiredQty: 1 }];
    setFormData({ ...formData, bundleItems: updated });
  };

  const updateBundleItem = (index: number, field: "productId" | "requiredQty", value: number) => {
    const updated = [...(formData.bundleItems || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, bundleItems: updated });
  };

  const removeBundleItem = (index: number) => {
    const updated = (formData.bundleItems || []).filter((_, i) => i !== index);
    setFormData({ ...formData, bundleItems: updated });
  };

  // Filter products and categories based on search
  const filteredProducts = products.filter((product) => {
    const isSelected = (formData.productIds || []).includes(product.id);
    const matchesSearch = !productSearchTerm || 
      product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(productSearchTerm.toLowerCase());
    return !isSelected && matchesSearch;
  });

  const filteredCategories = categories.filter((category) => {
    const isSelected = (formData.categoryIds || []).includes(category.id);
    const searchTerm = categorySearchTerm.trim().toLowerCase();
    const matchesSearch = !searchTerm || 
      category.name.toLowerCase().includes(searchTerm);
    return !isSelected && matchesSearch;
  });

  // Debug: Log filtered categories
  useEffect(() => {
    if (formData.offerType === "CATEGORY") {
      console.log("Categories in state:", categories);
      console.log("Category search term:", categorySearchTerm);
      console.log("Filtered categories:", filteredCategories);
    }
  }, [categories, categorySearchTerm, formData.offerType, filteredCategories]);

  // Filter products for bundle items (exclude already selected products in other bundle items)
  const getFilteredBundleProducts = (index: number, searchTerm: string) => {
    const currentProductId = (formData.bundleItems || [])[index]?.productId;
    const otherSelectedProductIds = (formData.bundleItems || [])
      .map((item, i) => i !== index ? item.productId : 0)
      .filter(id => id !== 0);
    
    return products.filter((product) => {
      const isSelectedInOther = otherSelectedProductIds.includes(product.id);
      const isCurrentProduct = product.id === currentProductId;
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      return (isCurrentProduct || !isSelectedInOther) && matchesSearch;
    });
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productSearchRef.current && !productSearchRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
      if (categorySearchRef.current && !categorySearchRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
      // Close bundle dropdowns
      Object.keys(bundleSearchRefs.current).forEach((key) => {
        const index = parseInt(key);
        const ref = bundleSearchRefs.current[index];
        if (ref && !ref.contains(event.target as Node)) {
          setShowBundleDropdowns(prev => ({ ...prev, [index]: false }));
        }
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleProductSelect = (productId: number) => {
    toggleProduct(productId);
    setProductSearchTerm("");
    setShowProductDropdown(false);
  };

  const handleCategorySelect = (categoryId: number) => {
    toggleCategory(categoryId);
    setCategorySearchTerm("");
    setShowCategoryDropdown(false);
  };

  const removeProduct = (productId: number) => {
    const current = formData.productIds || [];
    setFormData({ ...formData, productIds: current.filter((id) => id !== productId) });
  };

  const removeCategory = (categoryId: number) => {
    const current = formData.categoryIds || [];
    setFormData({ ...formData, categoryIds: current.filter((id) => id !== categoryId) });
  };

  const handleBundleProductSelect = (index: number, productId: number) => {
    updateBundleItem(index, "productId", productId);
    setBundleSearchTerms(prev => ({ ...prev, [index]: "" }));
    setShowBundleDropdowns(prev => ({ ...prev, [index]: false }));
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            {mode === "create" ? "New Offer" : mode === "edit" ? "Edit Offer" : "View Offer"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => {
                setFormData({ ...formData, code: e.target.value });
                setErrors({ ...errors, code: undefined });
              }}
              disabled={mode === "view"}
              className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
                errors.code ? "border-red-300" : "border-slate-300"
              } ${mode === "view" ? "bg-slate-50 cursor-not-allowed" : "focus:outline-none focus:ring-2 focus:ring-indigo-500"}`}
              placeholder="PRODUCT30"
            />
            {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code}</p>}
          </div>

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
              disabled={mode === "view"}
              className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
                errors.title ? "border-red-300" : "border-slate-300"
              } ${mode === "view" ? "bg-slate-50 cursor-not-allowed" : "focus:outline-none focus:ring-2 focus:ring-indigo-500"}`}
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
              disabled={mode === "view"}
              rows={3}
              className={`w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm resize-none ${
                mode === "view" ? "bg-slate-50 cursor-not-allowed" : "focus:outline-none focus:ring-2 focus:ring-indigo-500"
              }`}
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
              onChange={(e) => {
                setFormData({ ...formData, offerType: e.target.value as OfferType });
                // Reset search terms and dropdowns when changing offer type
                setProductSearchTerm("");
                setCategorySearchTerm("");
                setShowProductDropdown(false);
                setShowCategoryDropdown(false);
              }}
              disabled={mode === "view"}
              className={`w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm ${
                mode === "view" ? "bg-slate-50 cursor-not-allowed" : "focus:outline-none focus:ring-2 focus:ring-indigo-500"
              }`}
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
                disabled={mode === "view"}
                className={`w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm ${
                  mode === "view" ? "bg-slate-50 cursor-not-allowed" : "focus:outline-none focus:ring-2 focus:ring-indigo-500"
                }`}
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
                  disabled={mode === "view"}
                  className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
                    errors.discountValue ? "border-red-300" : "border-slate-300"
                  } ${mode === "view" ? "bg-slate-50 cursor-not-allowed" : "focus:outline-none focus:ring-2 focus:ring-indigo-500"}`}
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
              
              {error && (
                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">{error}</p>
                </div>
              )}
              
              {/* Selected Products Tags */}
              {(formData.productIds || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {(formData.productIds || []).map((productId) => {
                    const product = products.find((p) => p.id === productId);
                    if (!product) return null;
                    return (
                      <span
                        key={productId}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm"
                      >
                        <span>{product.name}</span>
                        {mode !== "view" && (
                          <button
                            type="button"
                            onClick={() => removeProduct(productId)}
                            className="hover:text-indigo-900"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Search Input with Dropdown for Products */}
              <div className="relative" ref={productSearchRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => {
                      setProductSearchTerm(e.target.value);
                      setShowProductDropdown(true);
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    disabled={mode === "view"}
                    placeholder="Search products by name or SKU..."
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm ${
                      mode === "view" ? "bg-slate-50 cursor-not-allowed" : "focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    }`}
                  />
                </div>
                
                {/* Dropdown Results */}
                {showProductDropdown && productSearchTerm && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {loadingProducts ? (
                      <div className="px-4 py-3 text-sm text-slate-500 text-center">Loading products...</div>
                    ) : filteredProducts.length > 0 ? (
                      filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleProductSelect(product.id)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between"
                        >
                          <span className="text-sm text-slate-700">{product.name}</span>
                          <span className="text-xs text-slate-500">({product.sku})</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500 text-center">No products found</div>
                    )}
                  </div>
                )}
              </div>
              {errors.productIds && <p className="mt-1 text-xs text-red-500">{errors.productIds}</p>}
            </div>
          )}

          {formData.offerType === "CATEGORY" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Categories <span className="text-red-500">*</span>
              </label>
              
              {categoryError && (
                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">{categoryError}</p>
                </div>
              )}
              
              {/* Selected Categories Tags */}
              {(formData.categoryIds || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {(formData.categoryIds || []).map((categoryId) => {
                    const category = categories.find((c) => c.id === categoryId);
                    if (!category) return null;
                    return (
                      <span
                        key={categoryId}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm"
                      >
                        <span>{category.name}</span>
                        {mode !== "view" && (
                          <button
                            type="button"
                            onClick={() => removeCategory(categoryId)}
                            className="hover:text-indigo-900"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Search Input with Dropdown for Categories */}
              <div className="relative" ref={categorySearchRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={categorySearchTerm}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCategorySearchTerm(value);
                      setShowCategoryDropdown(true);
                      console.log("Category search term changed:", value);
                      console.log("Available categories:", categories);
                      console.log("Filtered categories:", categories.filter((c) => {
                        const isSelected = (formData.categoryIds || []).includes(c.id);
                        const searchTerm = value.trim().toLowerCase();
                        const matchesSearch = !searchTerm || c.name.toLowerCase().includes(searchTerm);
                        return !isSelected && matchesSearch;
                      }));
                    }}
                    onFocus={() => {
                      setShowCategoryDropdown(true);
                      console.log("Category input focused. Categories:", categories);
                      console.log("Filtered categories:", filteredCategories);
                    }}
                    onClick={() => {
                      setShowCategoryDropdown(true);
                    }}
                    disabled={mode === "view"}
                    placeholder="Search categories by name or click to see all..."
                    className={`w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm ${
                      mode === "view" ? "bg-slate-50 cursor-not-allowed" : "focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    }`}
                  />
                </div>
                
                {/* Dropdown Results */}
                {showCategoryDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {loadingCategories ? (
                      <div className="px-4 py-3 text-sm text-slate-500 text-center">Loading categories...</div>
                    ) : categories.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500 text-center">
                        {categoryError || "No categories available"}
                      </div>
                    ) : filteredCategories.length > 0 ? (
                      filteredCategories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => handleCategorySelect(category.id)}
                          className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm text-slate-700"
                        >
                          {category.name}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-slate-500 text-center">
                        {categorySearchTerm ? `No categories found matching "${categorySearchTerm}"` : "Start typing to search categories"}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {errors.categoryIds && <p className="mt-1 text-xs text-red-500">{errors.categoryIds}</p>}
            </div>
          )}

          {formData.offerType === "ORDER" && (
            <>
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
                    disabled={mode === "view"}
                    className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
                      errors.minOrderAmount ? "border-red-300" : "border-slate-300"
                    } ${mode === "view" ? "bg-slate-50 cursor-not-allowed" : "focus:outline-none focus:ring-2 focus:ring-indigo-500"}`}
                    placeholder="100.00"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">$</span>
                </div>
                {errors.minOrderAmount && <p className="mt-1 text-xs text-red-500">{errors.minOrderAmount}</p>}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="applyOnce"
                  checked={formData.applyOnce ?? true}
                  onChange={(e) => setFormData({ ...formData, applyOnce: e.target.checked })}
                  disabled={mode === "view"}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label htmlFor="applyOnce" className="text-sm font-medium text-slate-700 cursor-pointer">
                  Apply Once (One-time use per customer)
                </label>
              </div>
            </>
          )}

          {formData.offerType === "BUNDLE" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Bundle Items <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {(formData.bundleItems || []).map((item, index) => {
                  const selectedProduct = item.productId ? products.find(p => p.id === item.productId) : null;
                  const searchTerm = bundleSearchTerms[index] || "";
                  const filteredBundleProducts = getFilteredBundleProducts(index, searchTerm);
                  const showDropdown = showBundleDropdowns[index] || false;

                  return (
                    <div key={index} className="flex gap-2 items-start p-3 border border-slate-200 rounded-lg">
                      <div className="flex-1 relative" ref={(el) => { bundleSearchRefs.current[index] = el; }}>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            value={selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku})` : searchTerm}
                            onChange={(e) => {
                              if (selectedProduct) {
                                // If product is selected, clear it first
                                updateBundleItem(index, "productId", 0);
                                setBundleSearchTerms(prev => ({ ...prev, [index]: e.target.value }));
                              } else {
                                setBundleSearchTerms(prev => ({ ...prev, [index]: e.target.value }));
                              }
                              setShowBundleDropdowns(prev => ({ ...prev, [index]: true }));
                            }}
                            onFocus={() => {
                              if (!selectedProduct) {
                                setShowBundleDropdowns(prev => ({ ...prev, [index]: true }));
                              }
                            }}
                            onClick={() => {
                              if (selectedProduct) {
                                // Clear selection when clicking on input
                                updateBundleItem(index, "productId", 0);
                                setBundleSearchTerms(prev => ({ ...prev, [index]: "" }));
                                setShowBundleDropdowns(prev => ({ ...prev, [index]: true }));
                              }
                            }}
                            disabled={mode === "view"}
                            placeholder="Search products by name or SKU..."
                            className={`w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm ${
                              mode === "view" ? "bg-slate-50 cursor-not-allowed" : "focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            }`}
                          />
                        </div>
                        
                        {/* Dropdown Results */}
                        {showDropdown && !selectedProduct && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredBundleProducts.length > 0 ? (
                              filteredBundleProducts.map((product) => (
                                <button
                                  key={product.id}
                                  type="button"
                                  onClick={() => handleBundleProductSelect(index, product.id)}
                                  className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between"
                                >
                                  <span className="text-sm text-slate-700">{product.name}</span>
                                  <span className="text-xs text-slate-500">({product.sku})</span>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-sm text-slate-500 text-center">No products found</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          min="1"
                          value={item.requiredQty}
                          onChange={(e) => updateBundleItem(index, "requiredQty", parseInt(e.target.value) || 1)}
                          disabled={mode === "view"}
                          className={`w-full px-3 py-2 rounded-lg border border-slate-300 text-sm ${
                            mode === "view" ? "bg-slate-50 cursor-not-allowed" : "focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          }`}
                          placeholder="Qty"
                        />
                      </div>
                      {mode !== "view" && (
                        <button
                          type="button"
                          onClick={() => removeBundleItem(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
                {mode !== "view" && (
                  <button
                    type="button"
                    onClick={() => {
                      const newIndex = (formData.bundleItems || []).length;
                      addBundleItem();
                      setBundleSearchTerms(prev => ({ ...prev, [newIndex]: "" }));
                      setShowBundleDropdowns(prev => ({ ...prev, [newIndex]: false }));
                    }}
                    className="w-full px-4 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                  >
                    + Add Bundle Item
                  </button>
                )}
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
                disabled={mode === "view"}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
                  errors.startAt ? "border-red-300" : "border-slate-300"
                } ${mode === "view" ? "bg-slate-50 cursor-not-allowed" : "focus:outline-none focus:ring-2 focus:ring-indigo-500"}`}
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
                disabled={mode === "view"}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm ${
                  errors.endAt ? "border-red-300" : "border-slate-300"
                } ${mode === "view" ? "bg-slate-50 cursor-not-allowed" : "focus:outline-none focus:ring-2 focus:ring-indigo-500"}`}
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
              disabled={mode === "view"}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-slate-700 cursor-pointer">
              Active
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            {mode === "view" ? (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
              >
                Close
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (mode === "create" ? "Creating..." : "Updating...") : mode === "create" ? "Create Offer" : "Save Changes"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

