import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LogOut,
  ShoppingBag,
  Pause,
  DollarSign,
  CreditCard,
  Wallet,
  User,
  X,
  Loader2,
} from "lucide-react";
import { getUserDisplayName, getUserInfo } from "../services/tokens";
import { logout } from "../services/auth.api";
import { sessionsApi } from "../services/sessions.api";
import { offersApi } from "../services/offers.api";
import { ordersApi, type Order, type OrderHistoryItem } from "../services/orders.api";
import { categoriesApi, type CategoryHierarchy } from "../services/categories.api";

interface Product {
  id: string | number;
  name: string;
  sku?: string;
  price: number;
  category?: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
  discountAmount?: number;
}

const fmt = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const fmtMoney = (n: number) => fmt.format(n);

export default function CashierTerminal() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryHierarchy[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<number | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitCashAmount, setSplitCashAmount] = useState("");
  const [splitCardAmount, setSplitCardAmount] = useState("");
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [sessionOrders, setSessionOrders] = useState<OrderHistoryItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [sessionStats, setSessionStats] = useState<{
    totalCash: number;
    totalCard: number;
    totalOrders: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [heldOrders, setHeldOrders] = useState<Order[]>([]);
  const [heldOrdersExpanded, setHeldOrdersExpanded] = useState(false);

  const cashierName = getUserDisplayName();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Get current cashier's active session
      const activeSessions = await sessionsApi.fetchActiveSessions();
      if (activeSessions) {
        const userInfo = getUserInfo();
        const currentSession = activeSessions.find(
          (s) =>
            s.email === userInfo?.email ||
          `${s.firstName} ${s.lastName}` === cashierName
        );
        if (currentSession?.sessionId) {
          setCurrentSessionId(currentSession.sessionId);
        }
        // Load held orders from all cashier's sessions
        loadHeldOrders(currentSession?.sessionId || undefined);
      }

      // Load categories hierarchy from database
      const categoriesResult = await categoriesApi.getHierarchy();
      if (categoriesResult.data && categoriesResult.data.length > 0) {
        setCategories(categoriesResult.data);
      } else if (categoriesResult.error) {
        console.error("Failed to load categories:", categoriesResult.error);
      }

      // Load all products initially
      const fetchedProducts = await offersApi.fetchProducts();
      if (fetchedProducts) {
        // Map to local Product interface
        setProducts(fetchedProducts.map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          category: p.category ?? undefined,
        })));
      }
      
      setLoading(false);
    };

    loadData();
  }, [cashierName]);

  // Load products when subcategory is selected
  useEffect(() => {
    const loadProductsBySubCategory = async () => {
      if (selectedSubCategory) {
        setLoadingProducts(true);
        const fetchedProducts = await offersApi.fetchProductsBySubCategory(
          selectedSubCategory
        );
        if (fetchedProducts) {
          // Map to local Product interface
          setProducts(fetchedProducts.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: p.price,
            category: p.category ?? undefined,
          })));
        } else {
          // If no products found, set empty array
          setProducts([]);
        }
        setLoadingProducts(false);
      } else if (selectedCategory && !selectedSubCategory) {
        // If only parent category is selected, load all products and filter by category name
        setLoadingProducts(true);
        const fetchedProducts = await offersApi.fetchProducts();
        if (fetchedProducts) {
          // Map to local Product interface
          setProducts(fetchedProducts.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: p.price,
            category: p.category ?? undefined,
          })));
        }
        setLoadingProducts(false);
      } else if (!selectedCategory && !selectedSubCategory) {
        // If no category selected, load all products
        setLoadingProducts(true);
        const fetchedProducts = await offersApi.fetchProducts();
        if (fetchedProducts) {
          // Map to local Product interface
          setProducts(fetchedProducts.map(p => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            price: p.price,
            category: p.category ?? undefined,
          })));
        }
        setLoadingProducts(false);
      }
    };

    loadProductsBySubCategory();
  }, [selectedSubCategory, selectedCategory]);

  // Sync cart with order items
  useEffect(() => {
    if (currentOrder && products.length > 0) {
      const cartItems: CartItem[] = [];
      for (const orderItem of currentOrder.items) {
        const product = products.find((p) => p.id === orderItem.productId);
        if (product) {
          cartItems.push({
            product,
            quantity: orderItem.quantity,
            discountAmount: orderItem.discountAmount,
          });
        }
      }
      setCart(cartItems);
    } else if (!currentOrder) {
      setCart([]);
    }
  }, [currentOrder, products]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !searchTerm ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku &&
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Match category: if no category selected, show all products
    if (!selectedCategory && !selectedSubCategory) {
      return matchesSearch;
    }
    
    // Match product category (can be string name or object with name property)
    const productCategoryName =
      typeof product.category === "string"
      ? product.category 
      : (product.category as any)?.name;
    
    // If subcategory is selected, match by subcategory name
    if (selectedSubCategory) {
      const subCategory = categories
        .flatMap((c) => c.subCategories)
        .find((sc) => sc.id === selectedSubCategory);
      if (subCategory) {
        const matchesSubCategory = productCategoryName === subCategory.name;
        return matchesSearch && matchesSubCategory;
      }
    }
    
    // If only parent category is selected, match by parent category name
    if (selectedCategory) {
      const selectedCategoryName = categories.find(
        (c) => c.id === selectedCategory
      )?.name;
      if (selectedCategoryName) {
        const matchesCategory = productCategoryName === selectedCategoryName;
    return matchesSearch && matchesCategory;
      }
    }
    
    return matchesSearch;
  });

  const addToCart = async (product: Product) => {
    if (!currentSessionId) {
      alert("No active session. Please start a session first.");
      return;
    }

    setProcessing(true);
    try {
      // Create order if it doesn't exist
      let orderId = currentOrder?.id;
      if (!orderId) {
        const createResult = await ordersApi.createOrder({
          sessionId: currentSessionId,
        });
        if (createResult.error) {
          alert(`Failed to create order: ${createResult.error}`);
          setProcessing(false);
          return;
        }
        if (createResult.data) {
          setCurrentOrder(createResult.data);
          orderId = createResult.data.id;
        }
      }

      if (!orderId) {
        alert("Failed to get order ID");
        setProcessing(false);
        return;
      }

      // Check if product already exists in order
      const existingItem = currentOrder?.items.find(
        (item) => item.productId === Number(product.id)
      );

      if (existingItem) {
        // Update quantity: نرسل delta = 1 فقط
        const newQuantity = existingItem.quantity + 1;
        const updateResult = await ordersApi.updateItem({
          orderId,
          productId: Number(product.id),
          quantity: 1, // 👈 زيادة واحدة فقط (delta)
        });

        if (updateResult.error) {
          alert(`Failed to update item: ${updateResult.error}`);
        } else if (updateResult.data) {
          setCurrentOrder(updateResult.data);
          // Update local cart
          setCart((prev) => {
            const existing = prev.find(
              (item) => item.product.id === product.id
            );
            if (existing) {
              return prev.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: newQuantity }
                  : item
              );
            }
            return [...prev, { product, quantity: 1 }];
          });
        }
      } else {
        // Add new item
        const addResult = await ordersApi.addItem({
          orderId,
          productId: Number(product.id),
          quantity: 1,
          discountAmount: 0,
        });

        if (addResult.error) {
          alert(`Failed to add item: ${addResult.error}`);
        } else if (addResult.data) {
          setCurrentOrder(addResult.data);
          // Update local cart
          setCart((prev) => {
            const existing = prev.find(
              (item) => item.product.id === product.id
            );
            if (existing) {
              return prev.map((item) =>
                item.product.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              );
            }
            return [...prev, { product, quantity: 1 }];
          });
        }
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("An error occurred while adding item to cart");
    } finally {
      setProcessing(false);
    }
  };

  const updateQuantity = async (productId: string | number, delta: number) => {
    if (!currentOrder) return;

    const orderItem = currentOrder.items.find(
      (item) => item.productId === Number(productId)
    );
    if (!orderItem) return;

    const newQuantity = orderItem.quantity + delta;
    if (newQuantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    setProcessing(true);
    try {
      const updateResult = await ordersApi.updateItem({
        orderId: currentOrder.id,
        productId: Number(productId),
        quantity: delta, // 👈 نرسل delta فقط، مش الكمية الجديدة
      });

      if (updateResult.error) {
        alert(`Failed to update quantity: ${updateResult.error}`);
      } else if (updateResult.data) {
        setCurrentOrder(updateResult.data);
        // Update local cart
        setCart((prev) => {
          const item = prev.find((i) => i.product.id === productId);
          if (!item) return prev;
          return prev.map((i) =>
            i.product.id === productId ? { ...i, quantity: newQuantity } : i
          );
        });
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      alert("An error occurred while updating quantity");
    } finally {
      setProcessing(false);
    }
  };

  const removeFromCart = async (productId: string | number) => {
    if (!currentOrder) return;

    const orderItem = currentOrder.items.find(
      (item) => item.productId === Number(productId)
    );
    if (!orderItem) return;

    setProcessing(true);
    try {
      // نستخدم DELETE /api/orders/items/{itemId}
      const removeResult = await ordersApi.removeItem(orderItem.id);

      if (removeResult.error) {
        alert(`Failed to remove item: ${removeResult.error}`);
      } else if (removeResult.data) {
        setCurrentOrder(removeResult.data);
        // Update local cart
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
      }
    } catch (error) {
      console.error("Error removing item:", error);
      alert("An error occurred while removing item");
    } finally {
      setProcessing(false);
    }
  };


  const applyItemDiscount = async (
    productId: string | number,
    discountAmount: number
  ) => {
    if (!currentOrder) return;

    const orderItem = currentOrder.items.find(
      (item) => item.productId === Number(productId)
    );
    if (!orderItem) return;

    setProcessing(true);
    try {
      // Note: updateItem doesn't support discountAmount
      // We need to use addItem to update discount, or use a separate endpoint
      // For now, we'll use addItem with quantity 0 to update discount
      // This is a workaround - ideally we need a separate endpoint for updating discount
      const updateResult = await ordersApi.addItem({
        orderId: currentOrder.id,
        productId: Number(productId),
        quantity: orderItem.quantity,
        discountAmount: discountAmount,
      });

      if (updateResult.error) {
        alert(`Failed to apply discount: ${updateResult.error}`);
      } else if (updateResult.data) {
        setCurrentOrder(updateResult.data);
        // Update local cart
        setCart((prev) => {
          return prev.map((item) =>
            item.product.id === productId
              ? { ...item, discountAmount }
              : item
          );
        });
      }
    } catch (error) {
      console.error("Error applying discount:", error);
      alert("An error occurred while applying discount");
    } finally {
      setProcessing(false);
    }
  };

  // Use order data from backend if available, otherwise calculate from cart
  const subtotal =
    currentOrder?.subtotal ||
    cart.reduce((sum, item) => {
      const itemTotal =
        item.product.price * item.quantity - (item.discountAmount || 0);
    return sum + itemTotal;
  }, 0);
  const discount = currentOrder?.discountAmount || 0;
  const tax = currentOrder?.taxAmount || subtotal * 0.1;
  const total = currentOrder?.grandTotal || subtotal + tax;

  const handlePayment = async (method: "cash" | "card" | "both") => {
    if (!currentOrder || currentOrder.items.length === 0) {
      alert("Order is empty");
      return;
    }

    if (currentOrder.status === "PAID") {
      alert("This order is already paid");
      return;
    }

    setProcessing(true);
    try {
      let result;

      if (method === "both") {
        // Show split payment modal
        setSplitCashAmount("");
        setSplitCardAmount("");
        setShowSplitModal(true);
        setProcessing(false);
        return;
      }

      // Process single payment method
      result = await ordersApi.processPayment({
        orderId: currentOrder.id,
        paymentMethod: method.toUpperCase() as "CASH" | "CARD",
        amount: total,
      });

      if (result.error) {
        alert(`Payment failed: ${result.error}`);
      } else if (result.data) {
        setCurrentOrder(result.data);
        // Clear cart and reset order
        setCart([]);
        setCurrentOrder(null);
        alert("Payment successful!");
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("An error occurred while processing payment");
    } finally {
      setProcessing(false);
    }
  };

  const handleSplitPayment = async () => {
    if (!currentOrder) return;

    const cashAmount = parseFloat(splitCashAmount);
    const cardAmount = parseFloat(splitCardAmount);

    if (
      isNaN(cashAmount) ||
      isNaN(cardAmount) ||
      cashAmount < 0 ||
      cardAmount < 0
    ) {
      alert("Please enter valid amounts");
      return;
    }

    if (Math.abs(cashAmount + cardAmount - total) > 0.01) {
      alert(
        `Total must equal ${fmtMoney(total)}. Current: ${fmtMoney(
          cashAmount + cardAmount
        )}`
      );
      return;
    }

    setProcessing(true);
    try {
      const result = await ordersApi.processPayment({
        orderId: currentOrder.id,
        paymentMethod: "SPLIT",
        cashAmount: cashAmount,
        cardAmount: cardAmount,
      });

      if (result.error) {
        alert(`Payment failed: ${result.error}`);
      } else if (result.data) {
        setCurrentOrder(result.data);
        setShowSplitModal(false);
        // Clear cart and reset order
        setCart([]);
        setCurrentOrder(null);
        alert("Payment successful!");
      }
    } catch (error) {
      console.error("Error processing split payment:", error);
      alert("An error occurred while processing payment");
    } finally {
      setProcessing(false);
    }
  };

  const handleViewOrders = async () => {
    if (!currentSessionId) {
      alert("No active session found");
      return;
    }

    setShowOrdersModal(true);
    setLoadingOrders(true);
    setSelectedOrder(null);

    try {
      const result = await ordersApi.getSessionHistory(currentSessionId);
      if (result.error) {
        alert(`Failed to load orders: ${result.error}`);
        setSessionOrders([]);
    } else {
        setSessionOrders(result.data || []);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      alert("An error occurred while loading orders");
      setSessionOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleViewOrderDetails = async (orderId: number) => {
    setLoadingOrders(true);
    try {
      const result = await ordersApi.getOrder(orderId);
      if (result.error) {
        alert(`Failed to load order details: ${result.error}`);
      } else {
        setSelectedOrder(result.data || null);
      }
    } catch (error) {
      console.error("Error loading order details:", error);
      alert("An error occurred while loading order details");
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleLogoutClick = async () => {
    if (!currentSessionId) {
      // No active session, just logout
      logout();
      return;
    }

    // Show confirmation dialog and load session stats
    setShowLogoutConfirm(true);
    setLoadingStats(true);
    setSessionStats(null);

    try {
      // Fetch session details to get statistics
      const sessionDetail = await sessionsApi.fetchCashierDetail(currentSessionId);
      if (sessionDetail?.performance) {
        setSessionStats({
          totalCash: sessionDetail.performance.cashIn || 0,
          totalCard: sessionDetail.performance.cardIn || 0,
          totalOrders: sessionDetail.performance.totalOrders || 0,
        });
      } else {
        // Fallback: try to get from orders history
        const ordersResult = await ordersApi.getSessionHistory(currentSessionId);
        if (ordersResult.data) {
          let cashTotal = 0;
          let cardTotal = 0;
          ordersResult.data.forEach((order) => {
            if (order.paymentMethod === "CASH") {
              cashTotal += order.grandTotal;
            } else if (order.paymentMethod === "CARD") {
              cardTotal += order.grandTotal;
            } else if (order.paymentMethod === "SPLIT") {
              // For split payments, we'd need order details, so we'll estimate
              // or just count it as half cash, half card
              cashTotal += order.grandTotal / 2;
              cardTotal += order.grandTotal / 2;
            }
          });
          setSessionStats({
            totalCash: cashTotal,
            totalCard: cardTotal,
            totalOrders: ordersResult.data.length,
          });
        }
      }
    } catch (error) {
      console.error("Error loading session stats:", error);
      // Still show dialog with default values
      setSessionStats({
        totalCash: 0,
        totalCard: 0,
        totalOrders: 0,
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const handleConfirmLogout = async () => {
    setShowLogoutConfirm(false);
    setLoadingStats(true);

    try {
      // If there's an unpaid order, hold it first
      if (currentOrder && currentOrder.status !== "PAID" && currentOrder.items.length > 0) {
        console.log("Holding order before logout:", currentOrder.id, currentOrder.status);
        try {
          const holdResult = await ordersApi.holdOrder(currentOrder.id);
          if (holdResult.error) {
            console.error("Failed to hold order before logout:", holdResult.error);
            alert("Warning: Failed to hold current order. Please hold it manually before logging out.");
          } else {
            console.log("Order held successfully before logout");
            setCurrentOrder(null);
            setCart([]);
            // Reload held orders to show the newly held order
            if (currentSessionId) {
              await loadHeldOrders(currentSessionId);
            }
          }
        } catch (error) {
          console.error("Error holding order before logout:", error);
          alert("Warning: Failed to hold current order. Please hold it manually before logging out.");
        }
      } else {
        console.log("No unpaid order to hold:", {
          hasOrder: !!currentOrder,
          status: currentOrder?.status,
          itemsLength: currentOrder?.items.length
        });
      }

      if (currentSessionId) {
        try {
          // Close the session before logging out
          const closeResult = await sessionsApi.closeSession(currentSessionId);
          if (closeResult.error) {
            console.error("Failed to close session:", closeResult.error);
            // Still proceed with logout even if closing fails
            alert("Warning: Failed to close session, but proceeding with logout.");
          }
        } catch (error) {
          console.error("Error closing session:", error);
          // Still proceed with logout even if closing fails
        }
      }
    } finally {
      setLoadingStats(false);
    }
    
    logout();
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
    setSessionStats(null);
  };

  const loadHeldOrders = async (sessionId?: number) => {
    try {
      const userInfo = getUserInfo();
      const allHeldOrders: Order[] = [];

      // Get all sessions for this cashier
      const allSessions = await sessionsApi.fetchSessions();
      if (allSessions) {
        // Filter sessions for current cashier
        const cashierSessions = allSessions.filter(
          (s) =>
            s.email === userInfo?.email ||
            `${s.firstName} ${s.lastName}` === cashierName
        );

        // Get held orders from all cashier's sessions
        for (const session of cashierSessions) {
          if (session.sessionId) {
            try {
              const historyResult = await ordersApi.getSessionHistory(session.sessionId);
              if (historyResult.data) {
                const held = historyResult.data.filter((o) => o.status === "HELD");
                // Convert OrderHistoryItem to Order by fetching full order details
                for (const heldOrder of held) {
                  const fullOrder = await ordersApi.getOrder(heldOrder.id);
                  if (fullOrder.data) {
                    // Check if order is not already in the list (avoid duplicates)
                    if (!allHeldOrders.find((o) => o.id === fullOrder.data!.id)) {
                      allHeldOrders.push(fullOrder.data);
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`Error loading held orders for session ${session.sessionId}:`, error);
            }
          }
        }
      }

      // Also check current session if provided
      if (sessionId) {
        try {
          const historyResult = await ordersApi.getSessionHistory(sessionId);
          if (historyResult.data) {
            const held = historyResult.data.filter((o) => o.status === "HELD");
            for (const heldOrder of held) {
              const fullOrder = await ordersApi.getOrder(heldOrder.id);
              if (fullOrder.data) {
                // Check if order is not already in the list (avoid duplicates)
                if (!allHeldOrders.find((o) => o.id === fullOrder.data!.id)) {
                  allHeldOrders.push(fullOrder.data);
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error loading held orders for current session ${sessionId}:`, error);
        }
      }

      setHeldOrders(allHeldOrders);
    } catch (error) {
      console.error("Error loading held orders:", error);
      setHeldOrders([]);
    }
  };

  const handleHoldOrder = async () => {
    if (!currentOrder || currentOrder.items.length === 0) {
      alert("Order is empty");
      return;
    }

    if (currentOrder.status === "PAID") {
      alert("Cannot hold a paid order");
      return;
    }

    if (currentOrder.status === "HELD") {
      alert("Order is already held");
      return;
    }

    setProcessing(true);
    try {
      const result = await ordersApi.holdOrder(currentOrder.id);
      if (result.error) {
        alert(`Failed to hold order: ${result.error}`);
      } else if (result.data) {
        // Clear current order and reload held orders
        setCurrentOrder(null);
        setCart([]);
        if (currentSessionId) {
          await loadHeldOrders(currentSessionId);
        }
        alert("Order held successfully");
      }
    } catch (error) {
      console.error("Error holding order:", error);
      alert("An error occurred while holding order");
    } finally {
      setProcessing(false);
    }
  };

  const handleRetrieveOrder = async (orderId: number) => {
    setProcessing(true);
    try {
      const result = await ordersApi.retrieveOrder(orderId);
      if (result.error) {
        alert(`Failed to retrieve order: ${result.error}`);
      } else if (result.data) {
        // Set as current order
        setCurrentOrder(result.data);
        // Reload held orders
        if (currentSessionId) {
          await loadHeldOrders(currentSessionId);
        }
      }
    } catch (error) {
      console.error("Error retrieving order:", error);
      alert("An error occurred while retrieving order");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-800">{cashierName}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleViewOrders}
            className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="View Orders"
          >
            <ShoppingBag className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigate("/cashier/profile")}
            className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Profile"
          >
            <User className="h-5 w-5" />
          </button>
          <button
            onClick={handleLogoutClick}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Section - Three Columns */}
        <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Products */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by product name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Categories
            </h2>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedSubCategory(null);
                  setExpandedCategory(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === null && selectedSubCategory === null
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span>All</span>
                <ChevronRight className="h-4 w-4" />
              </button>
              {categories.map((category) => (
                <div key={category.id}>
                <button
                    onClick={() => {
                      if (expandedCategory === category.id) {
                        setExpandedCategory(null);
                        setSelectedCategory(null);
                        setSelectedSubCategory(null);
                      } else {
                        setExpandedCategory(category.id);
                        setSelectedCategory(category.id);
                        setSelectedSubCategory(null);
                      }
                    }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === category.id && selectedSubCategory === null
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span>{category.name}</span>
                    <ChevronRight
                      className={`h-4 w-4 transition-transform ${
                        expandedCategory === category.id ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  {expandedCategory === category.id &&
                    category.subCategories &&
                    category.subCategories.length > 0 && (
                      <div className="ml-4 mt-1 space-y-1">
                        {category.subCategories.map((subCategory) => (
                          <button
                            key={subCategory.id}
                            onClick={() => {
                              setSelectedSubCategory(subCategory.id);
                              setSelectedCategory(category.id);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                              selectedSubCategory === subCategory.id
                                ? "bg-blue-100 text-blue-700"
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            <span>
                              {subCategory.name}
                              {subCategory.productCount !== undefined && (
                                <span className="ml-2 text-gray-500">
                                  ({subCategory.productCount})
                                </span>
                              )}
                            </span>
                </button>
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </div>
          </div>

          {/* Products List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingProducts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                    <div className="font-medium text-gray-900">
                      {product.name}
                    </div>
                  {product.sku && (
                      <div className="text-xs text-gray-500 mt-1">
                        SKU: {product.sku}
                      </div>
                  )}
                  <div className="text-sm font-semibold text-blue-600 mt-1">
                    {fmtMoney(product.price)}
                  </div>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No products found
                  </p>
              )}
            </div>
            )}
          </div>
        </div>

        {/* Center - Current Order */}
        <div className="flex-1 flex flex-col overflow-hidden flex">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              Current Order
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {(!currentOrder || currentOrder.items.length === 0) &&
            cart.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">No items in order</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(currentOrder?.items.length ? currentOrder.items : cart).map(
                  (item, index) => {
                  const orderItem = currentOrder?.items[index];
                  const cartItem = cart[index] as CartItem | undefined;
                  const product = orderItem 
                      ? products.find((p) => p.id === orderItem.productId) || {
                          id: orderItem.productId,
                          name: `Product ${orderItem.productId}`,
                          price: orderItem.unitPrice,
                        }
                      : cartItem?.product || (item as CartItem).product;
                    const quantity =
                      orderItem?.quantity ||
                      cartItem?.quantity ||
                      (item as CartItem).quantity;
                    const discount =
                      orderItem?.discountAmount ||
                      cartItem?.discountAmount ||
                      0;
                    const lineTotal =
                      orderItem?.lineTotal ||
                      product.price * quantity - discount;
                  
                  return (
                    <div
                      key={orderItem?.id || `cart-${product.id}-${index}`}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {product.name}
                          </div>
                        <div className="text-sm text-gray-500">
                          {fmtMoney(product.price)} × {quantity}
                          {discount > 0 && (
                              <span className="text-red-600 ml-2">
                                -{fmtMoney(discount)} discount
                              </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-semibold text-gray-900">
                          {fmtMoney(lineTotal)}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(product.id, -1)}
                            disabled={processing}
                            className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                          >
                            -
                          </button>
                            <span className="w-8 text-center">
                              {quantity}
                            </span>
                          <button
                            onClick={() => updateQuantity(product.id, 1)}
                            disabled={processing}
                            className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => {
                              const discountAmount = prompt(
                                "Enter discount amount:",
                                "0"
                              );
                            if (discountAmount !== null) {
                                applyItemDiscount(
                                  product.id,
                                  parseFloat(discountAmount) || 0
                                );
                            }
                          }}
                          className="text-blue-600 hover:text-blue-700 px-2 text-sm"
                          title="Apply Discount"
                        >
                          Discount
                        </button>
                        <button
                          onClick={() => removeFromCart(product.id)}
                          disabled={processing}
                          className="text-red-600 hover:text-red-700 px-2 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                  }
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Payment */}
        <div className="w-96 border-l border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Payment</h2>
          </div>

          <div className="p-6 space-y-6">
            {currentOrder && (
              <div className="text-xs text-gray-500 mb-2">
                Order: {currentOrder.orderNumber}
              </div>
            )}

            {/* Order Summary */}
            <div className="space-y-2 border-t border-gray-200 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900">{fmtMoney(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount:</span>
                  <span className="text-red-600">
                    -{fmtMoney(discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (10%):</span>
                <span className="text-gray-900">{fmtMoney(tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-2 mt-2">
                <span className="text-gray-900">Total:</span>
                <span className="text-gray-900">{fmtMoney(total)}</span>
              </div>
            </div>

            {/* Hold Order */}
            <button
              onClick={handleHoldOrder}
              disabled={
                processing || !currentOrder || currentOrder.items.length === 0 || currentOrder.status === "PAID" || currentOrder.status === "HELD"
              }
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Pause className="h-4 w-4" />
              Hold Order
            </button>

            {/* Payment Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => handlePayment("cash")}
                disabled={
                  processing || !currentOrder || currentOrder.items.length === 0
                }
                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <DollarSign className="h-5 w-5" />
                    Cash
                  </>
                )}
              </button>
              <button
                onClick={() => handlePayment("card")}
                disabled={
                  processing || !currentOrder || currentOrder.items.length === 0
                }
                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    Card
                  </>
                )}
              </button>
              <button
                onClick={() => handlePayment("both")}
                disabled={
                  processing || !currentOrder || currentOrder.items.length === 0
                }
                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-blue-50 text-blue-600 rounded-lg font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Wallet className="h-5 w-5" />
                    Cash & Card
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        </div>

        {/* Held Orders Section */}
        {heldOrders.length > 0 && (
          <div className="border-t border-gray-200 bg-yellow-50">
            <button
              onClick={() => setHeldOrdersExpanded(!heldOrdersExpanded)}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-yellow-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Pause className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-semibold text-gray-800">
                  Held Orders ({heldOrders.length})
                </span>
              </div>
              {heldOrdersExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              )}
            </button>
            {heldOrdersExpanded && (
              <div className="px-4 pb-4 max-h-48 overflow-y-auto">
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {heldOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex-shrink-0 w-56 p-3 bg-white border border-yellow-300 rounded-lg shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">
                          {order.orderNumber}
                        </span>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium flex-shrink-0">
                          HELD
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1 mb-3">
                        <div className="flex justify-between">
                          <span>Items:</span>
                          <span className="font-medium">{order.itemCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total:</span>
                          <span className="font-semibold text-gray-900">
                            {fmtMoney(order.grandTotal)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(order.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRetrieveOrder(order.id)}
                        disabled={processing || currentOrder !== null}
                        className="w-full py-1.5 px-3 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing ? (
                          <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                        ) : (
                          "Retrieve"
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Split Payment Modal */}
      {showSplitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                Split Payment
              </h2>
              <button
                onClick={() => setShowSplitModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Total Amount</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {fmtMoney(total)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cash Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={splitCashAmount}
                  onChange={(e) => setSplitCashAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={splitCardAmount}
                  onChange={(e) => setSplitCardAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowSplitModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSplitPayment}
                  disabled={processing}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm Payment"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders Modal */}
      {showOrdersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">
                Session Orders
              </h2>
              <button
                onClick={() => {
                  setShowOrdersModal(false);
                  setSelectedOrder(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
    </div>

            <div className="flex-1 overflow-hidden flex">
              {/* Orders List */}
              <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
                <div className="p-4">
                  {loadingOrders ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : sessionOrders.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No orders found for this session
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessionOrders.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => handleViewOrderDetails(order.id)}
                          className={`w-full text-left p-4 rounded-lg border transition-colors ${
                            selectedOrder?.id === order.id
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-900">
                              {order.orderNumber}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                order.status === "PAID"
                                  ? "bg-green-100 text-green-700"
                                  : order.status === "CANCELLED"
                                  ? "bg-red-100 text-red-700"
                                  : order.status === "HELD"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex justify-between">
                              <span>Items:</span>
                              <span className="font-medium">{order.itemCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total:</span>
                              <span className="font-semibold text-gray-900">
                                {fmtMoney(order.grandTotal)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Payment:</span>
                              <span className="font-medium">{order.paymentMethod}</span>
                            </div>
                            {order.paidAt && (
                              <div className="text-xs text-gray-500 mt-1">
                                Paid: {new Date(order.paidAt).toLocaleString()}
                              </div>
                            )}
                            {order.customerName && (
                              <div className="text-xs text-gray-500">
                                Customer: {order.customerName}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Details */}
              <div className="w-1/2 overflow-y-auto">
                {selectedOrder ? (
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Order Details: {selectedOrder.orderNumber}
                    </h3>

                    {/* Order Info */}
                    <div className="mb-6 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Status:</span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            selectedOrder.status === "PAID"
                              ? "bg-green-100 text-green-700"
                              : selectedOrder.status === "CANCELLED"
                              ? "bg-red-100 text-red-700"
                              : selectedOrder.status === "HELD"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {selectedOrder.status}
                        </span>
                      </div>
                      {selectedOrder.customerName && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Customer:</span>
                          <span className="text-gray-900">
                            {selectedOrder.customerName}
                          </span>
                        </div>
                      )}
                      {selectedOrder.customerPhone && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Phone:</span>
                          <span className="text-gray-900">
                            {selectedOrder.customerPhone}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Created:</span>
                        <span className="text-gray-900">
                          {new Date(selectedOrder.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {selectedOrder.paidAt && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Paid At:</span>
                          <span className="text-gray-900">
                            {new Date(selectedOrder.paidAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Items */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 mb-3">Items</h4>
                      <div className="space-y-2">
                        {selectedOrder.items.map((item) => {
                          const product = products.find(
                            (p) => p.id === item.productId
                          );
                          return (
                            <div
                              key={item.id}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-gray-900">
                                  {product?.name || `Product #${item.productId}`}
                                </span>
                                <span className="font-semibold text-gray-900">
                                  {fmtMoney(item.lineTotal)}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div className="flex justify-between">
                                  <span>
                                    {fmtMoney(item.unitPrice)} × {item.quantity}
                                  </span>
                                  {item.discountAmount > 0 && (
                                    <span className="text-red-600">
                                      -{fmtMoney(item.discountAmount)} discount
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Payments */}
                    {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-800 mb-3">
                          Payments
                        </h4>
                        <div className="space-y-2">
                          {selectedOrder.payments.map((payment) => (
                            <div
                              key={payment.id}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center"
                            >
                              <div>
                                <span className="font-medium text-gray-900">
                                  {payment.paymentMethod}
                                </span>
                                <div className="text-xs text-gray-500 mt-1">
                                  {new Date(payment.paidAt).toLocaleString()}
                                </div>
                              </div>
                              <span className="font-semibold text-gray-900">
                                {fmtMoney(payment.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    <div className="border-t border-gray-200 pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="text-gray-900">
                          {fmtMoney(selectedOrder.subtotal)}
                        </span>
                      </div>
                      {selectedOrder.discountAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Discount:</span>
                          <span className="text-red-600">
                            -{fmtMoney(selectedOrder.discountAmount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Tax:</span>
                        <span className="text-gray-900">
                          {fmtMoney(selectedOrder.taxAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold border-t border-gray-200 pt-2 mt-2">
                        <span className="text-gray-900">Total:</span>
                        <span className="text-gray-900">
                          {fmtMoney(selectedOrder.grandTotal)}
                        </span>
                      </div>
                      {selectedOrder.amountPaid > 0 && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Amount Paid:</span>
                            <span className="text-gray-900">
                              {fmtMoney(selectedOrder.amountPaid)}
                            </span>
                          </div>
                          {selectedOrder.changeAmount > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Change:</span>
                              <span className="text-gray-900">
                                {fmtMoney(selectedOrder.changeAmount)}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {selectedOrder.notes && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-sm font-medium text-gray-700 mb-1">
                          Notes:
                        </div>
                        <div className="text-sm text-gray-600">
                          {selectedOrder.notes}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Select an order to view details
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Do you want to end the cashier session?
              </h2>

              {loadingStats ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : sessionStats ? (
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Total cash collected:</span>
                    <span className="text-gray-900 font-semibold">
                      {fmtMoney(sessionStats.totalCash)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Total card collected:</span>
                    <span className="text-gray-900 font-semibold">
                      {fmtMoney(sessionStats.totalCard)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Total orders:</span>
                    <span className="text-gray-900 font-semibold">
                      {sessionStats.totalOrders}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 mb-6">
                  Unable to load session statistics
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCancelLogout}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLogout}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  End Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
