import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { productsApi, type ProductDTO } from "../services/products.api";
import ProductForecastPanel from "../components/Operations/ProductForecastPanel";

export default function ProductForecastDetailPage() {
  const navigate = useNavigate();
  const { productId } = useParams();

  const numericProductId = useMemo(() => Number(productId), [productId]);
  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!Number.isFinite(numericProductId) || numericProductId <= 0) {
        setProduct(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const res = await productsApi.getById(numericProductId);
      if (cancelled) return;
      setProduct(res.data ?? null);
      setLoading(false);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [numericProductId]);

  if (!Number.isFinite(numericProductId) || numericProductId <= 0) {
    return (
      <div className="p-6 sm:p-8">
        <button
          onClick={() => navigate("..")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="mt-6 text-slate-700 font-semibold">Invalid product id.</div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full bg-gradient-to-br from-slate-50 via-indigo-50/30 to-indigo-50/20">
      <div className="px-6 sm:px-8 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <button
              onClick={() => navigate("..")}
              className="mt-0.5 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-white/70 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                <span className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg">
                  <Package className="h-5 w-5" />
                </span>
                Product Forecast
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    Loading product...
                  </span>
                ) : product ? (
                  <>
                    <span className="font-semibold text-slate-900">{product.name}</span>
                    <span className="text-slate-500">
                      {" "}
                      • ID {numericProductId}
                      {product.sku ? ` • ${product.sku}` : ""}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-500">Product not found (ID {numericProductId})</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl overflow-hidden">
          <div className="p-6">
            <ProductForecastPanel productId={numericProductId} />
          </div>
        </div>
      </div>
    </div>
  );
}

