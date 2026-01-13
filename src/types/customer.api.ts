// API Types matching backend contracts

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: number;
  role: string;
  email: string;
}

// Customer Registration Types
export interface RegisterRequest {
  firstName: string; // required, max 60
  lastName?: string; // optional, max 60
  email: string; // required, valid email, max 120
  phone?: string; // optional, max 20, regex ^[0-9+\-\s()]*$
  address?: string; // optional
  role: "CUSTOMER"; // required, but backend forces to CUSTOMER
  password: string; // required, min 8, must include digit, lowercase, uppercase, special char
  confirmPassword: string; // required, must match password
  isSelfRegistration?: boolean; // optional, backend sets to true
}

export interface RegisterResponse {
  id: number; // user id
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  role: "CUSTOMER"; // always CUSTOMER
  isActive: boolean;
  createdAt: string; // ISO datetime
  token: string; // JWT
  message: string | null; // optional
}

export interface AuthIntrospectResponse {
  valid: boolean;
  userId: number;
  role: string;
  email: string;
}

export interface UserProfileResponse {
  id: number;
  email: string;
  name: string;
  role: string;
}

// Product Types
export interface Product {
  id: number;
  name: string;
  price: number;
  description?: string;
  category?: string;
  imageUrl?: string;
}

export interface ProductSearchResponse {
  products: Product[];
}

export interface ProductAvailabilityResponse {
  productId: number;
  available: boolean;
  quantity: number;
}

// Recommendation Types
// Matches POS Backend response (camelCase normalized from Recommendation Service)

export interface OfferInfo {
  discountPercent: number;
  offerStrength: number;
}

export interface RecommendationItem {
  productId: number;
  name: string;
  categoryName: string;
  score: number; // Relevance score
  hasOffer: boolean;
  offer: OfferInfo | null;
  // Additional fields for offers row only
  baseScore?: number | null; // Pure recommendation strength (offers row only)
  offerBoost?: number | null; // Offer effect boost (offers row only)
  // Frontend-only fields (from product catalog if needed)
  price?: number; // Current price (from product catalog)
  available?: boolean; // Availability (from product catalog)
  imageUrl?: string; // Product image URL (from product catalog)
}

export interface RecommendationRows {
  forYou: RecommendationItem[]; // Personalized recommendations (camelCase)
  popular: RecommendationItem[]; // Trending / popular items (camelCase)
  offers: RecommendationItem[]; // Items with strong offers (camelCase)
}

export interface RecommendationMeta {
  topK: number;
  numForYou: number;
  numPopular: number;
  numOffers: number;
  isColdStart: boolean;
  isStale: boolean;
  userSegment: string | null; // e.g., "frequent_buyer", "cold_start", "warm", etc.
}

export interface RecommendationsResponse {
  status: "success" | "error";
  userId: number;
  rows: RecommendationRows;
  meta: RecommendationMeta;
  message: string | null; // Error message when status is "error"
}

// RAG Chatbot Types
export type DataSource = "POS_LIVE" | "RAG_DOCS" | "LLM_GENERAL";

export interface RagChatRequest {
  message: string;                    // User's question (required)
  projectId?: string;                 // Optional RAG project identifier
  conversationId?: string;            // Reserved for future multi-turn support
  language?: string;                   // Optional language hint (e.g., "ar", "en")
  channel?: string;                   // Optional channel identifier (e.g., "web-pos", "kiosk")
  metadata?: Record<string, unknown>;  // Optional free-form JSON map
}

export interface RagChatResponse {
  answer: string;                     // Assistant's reply text, ready to render
  dataSource: DataSource | null;      // Origin of answer: "POS_LIVE", "RAG_DOCS", "LLM_GENERAL", or null
  conversationId: string | null;      // Reserved for future use
  extra: Record<string, unknown> | null; // Reserved for future extensions
}

// Order Types
export type OrderStatus = "PAID" | "DRAFT" | "CANCELLED" | "REFUNDED" | "HELD" | "completed" | "pending" | "cancelled";

export interface CustomerOrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  discountAmount: number;
}

export interface CustomerOrder {
  id: number;
  orderNumber: string;
  status: string; // "PAID", "DRAFT", "CANCELLED", etc.
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  itemCount: number;
  createdAt: string; // ISO 8601
  paidAt: string | null; // ISO 8601 or null
  items: CustomerOrderItem[];
}

export interface OrdersResponse {
  orders: CustomerOrder[];
  total: number;
  limit: number;
  hasMore: boolean;
}

// Legacy types for backward compatibility (if needed elsewhere)
export interface OrderItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  orderDate: string;
  totalAmount: number;
  status: OrderStatus;
  items: OrderItem[];
}

// Messaging Types
export interface UnreadCountResponse {
  count: number;
}

export interface SendMessageRequest {
  subject: string;
  message: string;
}

export interface SendMessageResponse {
  id: number;
  status: "sent";
}

