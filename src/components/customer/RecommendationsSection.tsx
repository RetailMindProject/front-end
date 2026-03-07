import React from "react";
import { AlertCircle, Clock, Flame, Percent, ShoppingCart, Sparkles, TrendingUp } from "lucide-react";
import type { RecommendationItem, RecommendationMeta } from "../../types/customer.api";
import { API_BASE_URL } from "../../services/api.client";
import SectionHeader from "./SectionHeader";

/** Section titles (API contract). For new/low-history users, first section uses TITLE_RECOMMENDED_NEW. */
const TITLE_RECOMMENDED = "Recommended For You";
const TITLE_RECOMMENDED_NEW = "Popular Picks For New Users";
const TITLE_POPULAR = "Popular Right Now";
const TITLE_OFFERS = "Special Offers";

const BADGE_NEW_USER = "New User Recommendations";
const TOOLTIP_NEW_USER =
  "We're still learning your preferences. These recommendations are based on general user trends.";
const EMPTY_RECOMMENDED = "Start shopping to get personalized recommendations.";
const ERROR_INLINE = "Recommendations are temporarily unavailable.";

/**
 * Inline SVG data-uri used as the image fallback.
 * Using a data-uri avoids any filesystem or network dependency so the
 * onError handler can never trigger a second request (no infinite loop).
 */
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='165' viewBox='0 0 220 165'%3E%3Crect width='220' height='165' fill='%23f3f4f6'/%3E%3Cg transform='translate(95 55)'%3E%3Crect x='0' y='10' width='30' height='22' rx='2' fill='none' stroke='%23d1d5db' stroke-width='2'/%3E%3Ccircle cx='15' cy='21' r='6' fill='none' stroke='%23d1d5db' stroke-width='2'/%3E%3Cpath d='M2 10 L6 4 L24 4 L28 10' fill='none' stroke='%23d1d5db' stroke-width='2'/%3E%3C/g%3E%3Ctext x='50%25' y='78%25' dominant-baseline='middle' text-anchor='middle' fill='%23d1d5db' font-size='12' font-family='sans-serif'%3ENo image%3C%2Ftext%3E%3C%2Fsvg%3E";

/**
 * Build the absolute image URL for a recommendation product.
 *
 * Rules (in order):
 *  1. null / undefined / empty → return null.
 *  2. Already absolute (starts with http/https) → use as-is.
 *  3. Relative path → prepend API_BASE_URL.
 */
function buildProductImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl || !imageUrl.trim()) return null;

  const trimmed = imageUrl.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;

  if (trimmed.startsWith("/")) {
    return `${API_BASE_URL}${trimmed}`;
  }

  return `${API_BASE_URL}/${trimmed}`;
}

// ---------------------------------------------------------------------------
// ProductCard — defined at MODULE LEVEL so React never treats it as a new
// component type between renders of RecommendationsSection.
// ---------------------------------------------------------------------------
interface ProductCardProps {
  product: RecommendationItem;
  showDiscount?: boolean;
}

function ProductCard({ product, showDiscount = false }: ProductCardProps) {
  const displayPrice = product.price ?? 0;
  const hasDiscount = Boolean(product.hasOffer && product.offer?.discountPercent);
  const isAvailable = product.available !== false;
  const resolvedImageUrl = buildProductImageUrl(product.imageUrl);
  const altText = product.imageAlt || product.name;

  return (
    <div className="flex-shrink-0 w-[220px] bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200">
      <div className="aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
        {resolvedImageUrl ? (
          <img
            src={resolvedImageUrl}
            alt={altText}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = PLACEHOLDER_IMAGE;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-gray-200 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-xs text-gray-400">No image</p>
            </div>
          </div>
        )}

        {showDiscount && hasDiscount && product.offer && (
          <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
            {product.offer.discountPercent}% OFF
          </div>
        )}

        {!isAvailable && (
          <div className="absolute top-3 left-3 bg-gray-900/80 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
            Out of Stock
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-medium text-sm text-gray-900 line-clamp-2 leading-snug mb-1">{product.name}</h3>
          <p className="text-xs text-gray-500">{product.categoryName}</p>
        </div>

        {displayPrice > 0 && (
          <p className="text-lg font-semibold text-gray-900 mb-3">${displayPrice.toFixed(2)}</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProductRow — also at module level for stability.
// ---------------------------------------------------------------------------
interface ProductRowProps {
  title: string;
  products: RecommendationItem[];
  icon: React.ReactNode;
  showNewUserBadge?: boolean;
  emptyMessage?: string;
}

function ProductRow({
  title,
  products,
  icon,
  showNewUserBadge = false,
  emptyMessage,
}: ProductRowProps) {
  const resolvedEmpty =
    emptyMessage ??
    (title === TITLE_OFFERS
      ? "No special offers available right now. Check back soon for exclusive deals!"
      : "No items available at the moment.");

  return (
    <div className="mb-8">
      <SectionHeader
        title={title}
        icon={icon}
        right={
          showNewUserBadge ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100 cursor-help"
              title={TOOLTIP_NEW_USER}
            >
              <TrendingUp className="h-3 w-3" />
              {BADGE_NEW_USER}
            </span>
          ) : null
        }
      />

      {products.length === 0 ? (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-7 text-center">
          <p className="text-gray-600 text-sm leading-relaxed">{resolvedEmpty}</p>
        </div>
      ) : (
        <div className="mt-4 flex gap-5 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {products.map((product) => (
            <ProductCard
              key={product.productId}
              product={product}
              showDiscount={title === TITLE_OFFERS}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Skeleton block for one section (used when loading). */
function SectionSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-gray-200 rounded w-48" />
      <div className="flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="w-[220px] h-[280px] bg-gray-200 rounded-xl shrink-0" />
        ))}
      </div>
    </div>
  );
}

/** Loading state: skeleton loaders for all three sections. */
function LoadingState() {
  return (
    <div className="space-y-8">
      <SectionSkeleton />
      <SectionSkeleton />
      <SectionSkeleton />
    </div>
  );
}

interface RecommendationsSectionProps {
  recommendedForYou: RecommendationItem[];
  popular: RecommendationItem[];
  offers: RecommendationItem[];
  loading?: boolean;
  meta?: RecommendationMeta;
  error?: string | null;
  status?: "success" | "error";
}

export default function RecommendationsSection({
  recommendedForYou,
  popular,
  offers,
  loading = false,
  meta,
  error,
  status,
}: RecommendationsSectionProps) {
  // Determine segment ONLY from meta.userSegment (do NOT infer from list lengths)
  const userSegment = meta?.userSegment ?? null;
  const isNewUser = userSegment === "new";
  const isError = status === "error";
  const titleRecommended = isNewUser ? TITLE_RECOMMENDED_NEW : TITLE_RECOMMENDED;

  // Optional diagnostics kept from one branch, but harmless.
  console.log("─── [RecommendationsSection][DIAG] ──────────────────────────────────");
  console.log("  status              :", status);
  console.log("  meta.userSegment    :", userSegment, " (raw meta.userSegment =", meta?.userSegment, ")");
  console.log("  meta.historyLen     :", meta?.historyLen);
  console.log('  isNewUser           :', isNewUser, '← ONLY from (meta.userSegment === "new")');
  console.log("  TITLE rendered      :", titleRecommended);
  console.log("  BADGE rendered      :", isNewUser ? `"${BADGE_NEW_USER}"` : "none");
  console.log(
    "  Condition triggered :",
    isNewUser
      ? 'meta.userSegment === "new" → NEW USER path'
      : userSegment === "existing"
        ? 'meta.userSegment === "existing" → EXISTING USER path'
        : `meta.userSegment = "${userSegment}" (unrecognised) → EXISTING USER path`
  );
  console.log(
    "  recommendedForYou.length:",
    recommendedForYou.length,
    "| popular.length:",
    popular.length,
    "| offers.length:",
    offers.length
  );
  console.log(
    "  allEmpty            :",
    recommendedForYou.length === 0 && popular.length === 0 && offers.length === 0
  );
  console.log("─────────────────────────────────────────────────────────────────────");

  if (loading) {
    return <LoadingState />;
  }

  const sections = (
    <>
      <ProductRow
        title={titleRecommended}
        products={recommendedForYou}
        icon={<Sparkles className="h-5 w-5 text-white" />}
        showNewUserBadge={isNewUser}
        emptyMessage={EMPTY_RECOMMENDED}
      />

      <ProductRow
        title={TITLE_POPULAR}
        products={popular}
        icon={<Flame className="h-5 w-5 text-white" />}
      />

      <ProductRow
        title={TITLE_OFFERS}
        products={offers}
        icon={<Percent className="h-5 w-5 text-white" />}
      />

      {meta?.isStale && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-2">
          <Clock className="h-3 w-3" />
          <span>Updating recommendations...</span>
        </div>
      )}
    </>
  );

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">{ERROR_INLINE}</p>
            {error && <p className="text-xs text-amber-700 mt-1">{error}</p>}
          </div>
        </div>
        <div className="space-y-6">{sections}</div>
      </div>
    );
  }

  // Show welcome/empty-state ONLY when ALL THREE arrays are empty
  const allEmpty = recommendedForYou.length === 0 && popular.length === 0 && offers.length === 0;

  if (status === "success" && allEmpty && !error) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
        <div className="max-w-md mx-auto">
          <p className="text-2xl mb-2">👋 Welcome to our store!</p>
          <p className="text-gray-600 mb-4">{EMPTY_RECOMMENDED}</p>

          {isNewUser && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
              title={TOOLTIP_NEW_USER}
            >
              <TrendingUp className="h-3 w-3" />
              {BADGE_NEW_USER}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (error && allEmpty) {
    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">{ERROR_INLINE}</p>
            <p className="text-xs text-amber-700 mt-1">{error}</p>
          </div>
        </div>

        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-gray-600">{EMPTY_RECOMMENDED}</p>
        </div>
      </div>
    );
  }

  return <div className="space-y-6">{sections}</div>;
}