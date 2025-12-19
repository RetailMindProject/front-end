import React from "react";
import ProductForecastPanel from "./ProductForecastPanel";

interface Product {
  id?: string | number;
  sku?: string;
  name: string;
  brand?: string;
  description?: string;
  category?: string;
  cost?: number;
  price?: number;
  wholesalePrice?: number;
  unit?: string;
  image?: string | null;
  views?: number;
  orders?: number;
  sales?: number;
  subscribers?: number;
}

interface ProductViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "details" | "forecast";

const formatValue = (value: string | number | null | undefined, fallback: string = '—'): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string' && value.trim() === '') return fallback;
  return String(value);
};

const parseNumericValue = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
};

const formatCurrency = (value: number | string | null | undefined): string => {
  const numericValue = parseNumericValue(value);
  if (numericValue === null) return '—';
  return `$${numericValue.toFixed(2)}`;
};

const formatNumber = (value: number | string | null | undefined): number | null => {
  const numericValue = parseNumericValue(value);
  if (numericValue === null) return null;
  return numericValue;
};

const ProductViewModal = ({ product, isOpen, onClose }: ProductViewModalProps) => {
  const [activeTab, setActiveTab] = React.useState<TabType>("details");

  // Reset to details tab when product changes
  // IMPORTANT: All hooks must be called before any conditional returns
  React.useEffect(() => {
    if (product?.id) {
      setActiveTab("details");
    }
  }, [product?.id]);

  // Early return after all hooks
  if (!isOpen || !product) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-2xl font-bold text-slate-800">{product.name}</h2>
          <button 
            className="text-slate-400 hover:text-slate-600 transition-colors text-2xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("details")}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === "details"
                  ? "text-blue-600"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Details
              {activeTab === "details" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("forecast")}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === "forecast"
                  ? "text-blue-600"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              Forecast / التنبؤ
              {activeTab === "forecast" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
              )}
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto flex-1 px-6 py-6">
          {activeTab === "details" ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Product Image */}
              <div className="md:col-span-1">
                {product.image ? (
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-64 object-cover rounded-xl border-2 border-slate-200"
                  />
                ) : (
                  <div className="w-full h-64 bg-slate-100 border-2 border-slate-200 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-6xl mb-2">📦</span>
                    <p className="text-slate-500 text-sm">No image available</p>
                  </div>
                )}
              </div>
              
              {/* Product Details */}
              <div className="md:col-span-2 space-y-6">
              {/* Product Information */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Product Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Name</label>
                    <p className="text-sm text-slate-800 mt-1">{formatValue(product.name)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Category</label>
                    <p className="text-sm text-slate-800 mt-1">{formatValue(product.category)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">ID</label>
                    <p className="text-sm text-slate-800 mt-1">{formatValue(product.id)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">SKU</label>
                    <p className="text-sm text-slate-800 mt-1">{formatValue(product.sku)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Brand</label>
                    <p className="text-sm text-slate-800 mt-1">{formatValue(product.brand)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Unit</label>
                    <p className="text-sm text-slate-800 mt-1">{formatValue(product.unit)}</p>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Pricing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Cost</label>
                    <p className="text-sm text-slate-800 mt-1">{formatCurrency(product.cost)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Price</label>
                    <p className="text-lg font-semibold text-blue-600 mt-1">{formatCurrency(product.price)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Wholesale Price</label>
                    <p className="text-sm text-slate-800 mt-1">{formatCurrency(product.wholesalePrice)}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Description</h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {formatValue(product.description, 'No description provided')}
                </p>
              </div>

              {/* Statistics */}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Statistics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(['views', 'orders', 'sales', 'subscribers'] as const).map((key) => {
                    const labels: Record<string, string> = {
                      views: 'Views',
                      orders: 'Orders',
                      sales: 'Sales',
                      subscribers: 'Subscribers'
                    };

                    const value = key === 'sales'
                      ? formatCurrency(product[key])
                      : formatNumber(product[key]);

                    if (value === null || value === '—') return null;

                    return (
                      <div key={key} className="bg-slate-50 rounded-lg p-3 text-center">
                        <div className="text-lg font-semibold text-slate-800">
                          {key === 'sales' ? value : String(value)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{labels[key]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          ) : (
            /* Forecast Tab */
            product.id ? (
              <ProductForecastPanel productId={product.id} />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-slate-600 mb-2">Product ID is missing</p>
                <p className="text-sm text-slate-500">
                  Cannot load forecast data without a valid product ID
                </p>
              </div>
            )
          )}
        </div>
        
        <div className="flex items-center justify-end px-6 py-4 border-t bg-slate-50/50">
          <button 
            className="px-6 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-lg transition-colors"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductViewModal;
