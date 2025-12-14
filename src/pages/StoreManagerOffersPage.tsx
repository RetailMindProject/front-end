import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { Card, CardTitle, CardValue, CardHint } from "../components";
import OfferForm, { type OfferFormData } from "../components/offers/OfferForm";
import OffersTable, { type Offer } from "../components/offers/OffersTable";

// Mock data
const mockOffers: Offer[] = [
  {
    id: "o1",
    title: "Summer Sale 2025",
    offerType: "PRODUCT",
    discountType: "PERCENTAGE",
    discountValue: 20,
    startAt: "2025-06-01T00:00:00",
    endAt: "2025-08-31T23:59:59",
    isActive: true,
  },
  {
    id: "o2",
    title: "Electronics Bundle",
    offerType: "BUNDLE",
    discountType: "FIXED_AMOUNT",
    discountValue: 50,
    startAt: "2025-10-01T00:00:00",
    endAt: "2025-10-31T23:59:59",
    isActive: true,
  },
  {
    id: "o3",
    title: "Free Shipping Over $100",
    offerType: "ORDER",
    discountType: "FIXED_AMOUNT",
    discountValue: 10,
    startAt: "2025-09-01T00:00:00",
    endAt: "2025-12-31T23:59:59",
    isActive: true,
  },
  {
    id: "o4",
    title: "Groceries Discount",
    offerType: "CATEGORY",
    discountType: "PERCENTAGE",
    discountValue: 15,
    startAt: "2025-01-01T00:00:00",
    endAt: "2025-01-31T23:59:59",
    isActive: false,
  },
];

export default function StoreManagerOffersPage() {
  const [offers, setOffers] = useState<Offer[]>(mockOffers);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

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

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setShowForm(true);
  };

  const handleSave = (data: OfferFormData) => {
    if (editingOffer) {
      // Update existing
      setOffers(
        offers.map((o) =>
          o.id === editingOffer.id
            ? {
                ...o,
                ...data,
                id: o.id,
              }
            : o
        )
      );
    } else {
      // Create new
      const newOffer: Offer = {
        id: `o${Date.now()}`,
        ...data,
      };
      setOffers([...offers, newOffer]);
    }
    setShowForm(false);
    setEditingOffer(null);
  };

  const handleDeactivate = (id: string) => {
    if (confirm("Are you sure you want to deactivate this offer?")) {
      setOffers(offers.map((o) => (o.id === id ? { ...o, isActive: false } : o)));
    }
  };

  const handleView = (offer: Offer) => {
    alert(`Viewing offer: ${offer.title}\nType: ${offer.offerType}\nDiscount: ${offer.discountType === "PERCENTAGE" ? `${offer.discountValue}%` : `$${offer.discountValue}`}`);
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
      <OffersTable offers={offers} onEdit={handleEdit} onDeactivate={handleDeactivate} onView={handleView} />

      {/* Offer Form Modal */}
      {showForm && (
        <OfferForm
          mode={editingOffer ? "edit" : "create"}
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

