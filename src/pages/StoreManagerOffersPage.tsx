import React, { useState, useMemo, useEffect } from "react";
import { Plus } from "lucide-react";
import { Card, CardTitle, CardValue, CardHint } from "../components";
import OfferForm, { type OfferFormData } from "../components/offers/OfferForm";
import OffersTable, { type Offer } from "../components/offers/OffersTable";
import { offersApi, type OfferResponse } from "../services/offers.api";

export default function StoreManagerOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch offers from API on component mount
  useEffect(() => {
    const loadOffers = async () => {
      setLoading(true);
      try {
        const fetchedOffers = await offersApi.fetchOffers();
        if (fetchedOffers) {
          // Convert OfferResponse[] to Offer[]
          const convertedOffers: Offer[] = fetchedOffers.map((offer: OfferResponse) => ({
            id: offer.id.toString(),
            title: offer.title,
            offerType: offer.offerType,
            discountType: offer.discountType,
            discountValue: offer.discountValue,
            startAt: offer.startAt,
            endAt: offer.endAt,
            isActive: offer.isActive,
          }));
          setOffers(convertedOffers);
        }
      } catch (error) {
        console.error("Error loading offers:", error);
      } finally {
        setLoading(false);
      }
    };
    loadOffers();
  }, []);

  const stats = useMemo(() => {
    const active = offers.filter((o) => o.isActive).length;
    const expired = offers.filter((o) => {
      const endDate = new Date(o.endAt);
      return endDate < new Date();
    }).length;
    const draft = offers.filter((o) => !o.isActive && new Date(o.endAt) >= new Date()).length;
    return { active, expired, draft };
  }, [offers]);

  const handleCreate = () => {
    setEditingOffer(null);
    setShowForm(true);
  };

  const handleEdit = async (offer: Offer) => {
    // Fetch full offer details from API to get all data (products, categories, bundleItems, etc.)
    try {
      const fullOffer = await offersApi.fetchOfferById(parseInt(offer.id));
      if (fullOffer) {
        // Convert OfferResponse to Offer with all necessary data
        const editingOfferData: Offer & { 
          code?: string; 
          description?: string;
          productIds?: number[];
          categoryIds?: number[];
          minOrderAmount?: number;
          applyOnce?: boolean;
          bundleItems?: { productId: number; requiredQty: number }[];
        } = {
          ...offer,
          id: fullOffer.id.toString(),
          code: fullOffer.code,
          description: fullOffer.description || "",
          productIds: fullOffer.products?.map(p => p.id) || [],
          categoryIds: fullOffer.categories?.map((c: any) => c.id) || [],
          minOrderAmount: fullOffer.minOrderAmount || 0,
          applyOnce: fullOffer.applyOnce ?? true,
          bundleItems: fullOffer.bundleItems?.map((item: any) => ({
            productId: item.productId,
            requiredQty: item.requiredQty || 1
          })) || [],
        };
        setEditingOffer(editingOfferData as any);
        setShowForm(true);
      } else {
        // Fallback: use the offer from the list if API call fails
        setEditingOffer(offer);
        setShowForm(true);
      }
    } catch (error) {
      console.error("Error fetching offer details:", error);
      // Fallback: use the offer from the list if API call fails
      setEditingOffer(offer);
      setShowForm(true);
    }
  };

  const handleSave = async (data: OfferFormData) => {
    // Note: The actual API call is handled in OfferForm component
    // This function is called after successful creation
    // Reload offers from API to get the latest data
    try {
      const fetchedOffers = await offersApi.fetchOffers();
      if (fetchedOffers) {
        // Convert OfferResponse[] to Offer[]
        const convertedOffers: Offer[] = fetchedOffers.map((offer: OfferResponse) => ({
          id: offer.id.toString(),
          title: offer.title,
          offerType: offer.offerType,
          discountType: offer.discountType,
          discountValue: offer.discountValue,
          startAt: offer.startAt,
          endAt: offer.endAt,
          isActive: offer.isActive,
        }));
        setOffers(convertedOffers);
      }
    } catch (error) {
      console.error("Error reloading offers:", error);
    }
    setShowForm(false);
    setEditingOffer(null);
  };

  const handleToggleActive = async (id: string) => {
    const offer = offers.find((o) => o.id === id);
    if (!offer) return;

    const currentStatus = offer.isActive;
    const action = currentStatus ? "deactivate" : "activate";
    
    if (!confirm(`Are you sure you want to ${action} this offer?`)) {
      return;
    }

    try {
      const result = await offersApi.updateOfferStatus(parseInt(id));
      
      if (result.error) {
        alert(`Error ${action === "activate" ? "activating" : "deactivating"} offer: ${result.error}`);
        return;
      }

      // Update the offer in the list with the new status from the response
      if (result.data) {
        setOffers(offers.map((o) => (o.id === id ? { ...o, isActive: result.data!.isActive } : o)));
      } else {
        // Fallback: toggle the status if response doesn't have data
        setOffers(offers.map((o) => (o.id === id ? { ...o, isActive: !currentStatus } : o)));
      }
    } catch (error) {
      console.error(`Error ${action}ing offer:`, error);
      alert(`An error occurred while ${action}ing the offer`);
    }
  };

  const handleView = async (offer: Offer) => {
    // Fetch full offer details from API to get all data (products, categories, bundleItems, etc.)
    try {
      const fullOffer = await offersApi.fetchOfferById(parseInt(offer.id));
      if (fullOffer) {
        // Convert OfferResponse to Offer with all necessary data
        const viewingOfferData: Offer & { 
          code?: string; 
          description?: string;
          productIds?: number[];
          categoryIds?: number[];
          minOrderAmount?: number;
          applyOnce?: boolean;
          bundleItems?: { productId: number; requiredQty: number }[];
          viewMode?: boolean;
        } = {
          ...offer,
          id: fullOffer.id.toString(),
          code: fullOffer.code,
          description: fullOffer.description || "",
          productIds: fullOffer.products?.map(p => p.id) || [],
          categoryIds: fullOffer.categories?.map((c: any) => c.id) || [],
          minOrderAmount: fullOffer.minOrderAmount || 0,
          applyOnce: fullOffer.applyOnce ?? true,
          bundleItems: fullOffer.bundleItems?.map((item: any) => ({
            productId: item.productId,
            requiredQty: item.requiredQty || 1
          })) || [],
          viewMode: true, // Mark as view mode
        };
        setEditingOffer(viewingOfferData as any);
        setShowForm(true);
      } else {
        // Fallback: use the offer from the list if API call fails
        const viewingOfferData = { ...offer, viewMode: true } as any;
        setEditingOffer(viewingOfferData);
        setShowForm(true);
      }
    } catch (error) {
      console.error("Error fetching offer details:", error);
      // Fallback: use the offer from the list if API call fails
      const viewingOfferData = { ...offer, viewMode: true } as any;
      setEditingOffer(viewingOfferData);
      setShowForm(true);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">Offers & Discounts</h1>
          <p className="text-sm text-slate-600 mt-1">Manage promotional offers and discounts for your store</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
        >
          <Plus className="h-4 w-4" />
          New Offer
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardTitle>Active Offers</CardTitle>
          <CardValue>{stats.active}</CardValue>
          <CardHint>Currently running</CardHint>
        </Card>
        <Card>
          <CardTitle>Expired Offers</CardTitle>
          <CardValue>{stats.expired}</CardValue>
          <CardHint>Past end date</CardHint>
        </Card>
        <Card>
          <CardTitle>Draft Offers</CardTitle>
          <CardValue>{stats.draft}</CardValue>
          <CardHint>Inactive but not expired</CardHint>
        </Card>
      </div>

      {/* Offers Table */}
      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading offers...</div>
      ) : (
        <OffersTable offers={offers} onEdit={handleEdit} onToggleActive={handleToggleActive} onView={handleView} />
      )}

      {/* Offer Form Modal */}
      {showForm && (
        <OfferForm
          mode={editingOffer ? (editingOffer.viewMode ? "view" : "edit") : "create"}
          initialData={editingOffer || undefined}
          onSubmit={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditingOffer(null);
          }}
        />
      )}
    </div>
  );
}

