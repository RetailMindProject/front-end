import { useState, useEffect } from "react";
import { MessageSquare, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useRecommendations } from "../hooks/useRecommendations";
import { useOrders } from "../hooks/useOrders";
import RecommendationsSection from "../components/customer/RecommendationsSection";
import RecommendationsControls from "../components/customer/RecommendationsControls";
import ChatPanel from "../components/customer/ChatPanel";
import OrderHistorySection from "../components/customer/OrderHistorySection";
import MessageManagerForm from "../components/customer/MessageManagerForm";

export default function CustomerMyPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);
  const [topK, setTopK] = useState(10);
  const [inStockOnly, setInStockOnly] = useState(true);
  const [candidateLimit, setCandidateLimit] = useState(500);
  
  const { recommendations, loading: recommendationsLoading, isAvailable: recommendationsAvailable, error: recommendationsError } = useRecommendations(topK, candidateLimit, inStockOnly);
  const { orders, loading: ordersLoading } = useOrders();

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

  const ordersData = orders?.orders || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome, {user.name || user.email}
              </h1>
              <p className="text-sm text-gray-500 mt-1">Customer Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setChatOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] text-white rounded-lg hover:bg-[#1d4ed8] transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
                <span className="hidden sm:inline">AI Assistant</span>
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Recommendations Section - Always show, even if endpoint is unavailable */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Recommendations</h2>
              {recommendationsAvailable && (
                <RecommendationsControls
                  topK={topK}
                  inStockOnly={inStockOnly}
                  candidateLimit={candidateLimit}
                  onTopKChange={setTopK}
                  onInStockOnlyChange={setInStockOnly}
                  onCandidateLimitChange={setCandidateLimit}
                />
              )}
            </div>
            <RecommendationsSection
              forYou={recommendationsData.forYou}
              popular={recommendationsData.popular}
              offers={recommendationsData.offers}
              loading={recommendationsLoading}
              meta={recommendations?.meta}
              error={recommendationsError}
              status={recommendations?.status}
            />
            {/* Debug info - remove in production */}
            {import.meta.env.DEV && (
              <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
                <p><strong>Debug Info:</strong></p>
                <p>isAvailable: {recommendationsAvailable ? 'true' : 'false'}</p>
                <p>loading: {recommendationsLoading ? 'true' : 'false'}</p>
                <p>error: {recommendationsError || 'null'}</p>
                <p>status: {recommendations?.status || 'null'}</p>
                <p>hasData: {recommendations ? 'true' : 'false'}</p>
                <p>forYou count: {recommendationsData.forYou.length}</p>
                <p>popular count: {recommendationsData.popular.length}</p>
                <p>offers count: {recommendationsData.offers.length}</p>
              </div>
            )}
          </section>

          {/* Order History Section */}
          <section>
            <OrderHistorySection orders={ordersData} loading={ordersLoading} />
          </section>

          {/* Message Manager Form */}
          <section>
            <MessageManagerForm />
          </section>
        </div>
      </main>

      {/* Chat Panel */}
      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}

