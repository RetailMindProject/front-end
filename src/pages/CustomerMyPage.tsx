import { useState, useEffect } from "react";
import { MessageSquare, LogOut, User } from "lucide-react";
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

  const displayName = user.name || user.email?.split('@')[0] || 'Customer';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {displayName}
                </h1>
                <p className="text-sm text-gray-500">My Account</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setChatOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                aria-label="Open AI Assistant"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline text-sm font-medium">Help</span>
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-12">
          {/* Recommendations Section */}
          <section>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">For You</h2>
                <p className="text-sm text-gray-500 mt-1">Personalized recommendations based on your preferences</p>
              </div>
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
          </section>

          {/* Order History Section */}
          <section>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Order History</h2>
              <p className="text-sm text-gray-500 mt-1">View your recent purchases</p>
            </div>
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

