import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
import { productsApi, type ProductDTO } from "../services/products.api";
import ProductForecastPanel from "../components/Operations/ProductForecastPanel";
import PageHeader from "../components/PageHeader";

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
      <PageHeader
        title={loading ? "Loading forecast..." : product ? `Forecast: ${product.name}` : `Forecast: Product ${numericProductId}`}
        icon={<Package className="h-6 w-6 text-white" />}
        right={
          <button
            onClick={() => navigate("..")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-white/70 transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        }
      />

      <div className="px-6 sm:px-8 py-6">
        <div className="rounded-2xl bg-white/80 backdrop-blur-xl border border-white/20 shadow-xl overflow-hidden">
          <div className="p-6">
            <ProductForecastPanel productId={numericProductId} />
          </div>
        </div>
      </div>
    </div>
  );
}

