import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useRecommendations } from "../hooks/useRecommendations";
import RecommendationsSection from "../components/customer/RecommendationsSection";

export default function CustomerMyPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [topK] = useState(10);
  const [inStockOnly] = useState(true);
  const [candidateLimit] = useState(500);
  
  const { recommendations, loading: recommendationsLoading, error: recommendationsError } = useRecommendations(topK, candidateLimit, inStockOnly);

  // Handle 401/403 errors globally
  useEffect(() => {
    const handleApiError = (event: CustomEvent) => {
      const status = (event.detail as { status?: number })?.status;
      if (status === 401 || status === 403) {
        logout();
      }
    };

    window.addEventListener("api-error" as any, handleApiError);
    return () => window.removeEventListener("api-error" as any, handleApiError);
  }, [logout]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563eb]"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  const recommendationsData = recommendations?.rows || {
    forYou: [],
    popular: [],
    offers: [],
  };

  return (
    <div className="pt-0">
      <section className="mt-4">
        <RecommendationsSection
          forYou={recommendationsData.forYou}
          popular={recommendationsData.popular}
          offers={recommendationsData.offers}
          loading={recommendationsLoading}
          meta={recommendations?.meta}
          error={recommendationsError}
          status={recommendations?.status}
        />
      </section>
    </div>
  );
}

