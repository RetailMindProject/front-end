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
  RotateCcw,
} from "lucide-react";
import { getUserDisplayName, setSessionId, clearSessionId } from "../services/tokens";
import { logoutForRole } from "../services/auth.api";
import { sessionsApi } from "../services/sessions.api";
import { offersApi } from "../services/offers.api";
import { ordersApi, type Order, type OrderHistoryItem } from "../services/orders.api";
import { categoriesApi, type CategoryHierarchy } from "../services/categories.api";
import { terminalApi } from "../services/terminal.api";
import { customersApi, type Customer } from "../services/customers.api";

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
const DEFAULT_OPENING_FLOAT = 2000;

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
    openingFloat: number;
    totalSales: number;
    expectedDrawer: number;
    closingAmount: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [heldOrders, setHeldOrders] = useState<Order[]>([]);
  const [heldOrdersExpanded, setHeldOrdersExpanded] = useState(false);
  const [unpairing, setUnpairing] = useState(false);
  
  // Customer registration state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);

  const cashierName = getUserDisplayName();
  const redirectToSelectTerminal = (customMessage?: string) => {
    setCurrentSessionId(null);
    clearSessionId();
    setLoading(false);
    navigate("/select-terminal", {
      replace: true,
      state: {
        message:
          customMessage ||
          "No open session was found for this terminal. Pair and open a session to continue.",
      },
    });
  };

  const handleUnauthorized = (customMessage?: string) => {
    if (customMessage) {
      alert(customMessage);
    }
    logoutForRole('CASHIER');
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const currentSessionResult = await sessionsApi.getCurrentSession();

      if (currentSessionResult.status === 401 || currentSessionResult.status === 403) {
        handleUnauthorized("Your cashier login expired. Please sign in again to continue.");
        return;
      }

      if (currentSessionResult.status === 404) {
        console.warn("No active session for this terminal (404). Redirecting to select-terminal.");
        redirectToSelectTerminal("You haven't opened a session on this terminal yet. Let's pair or open one.");
        return;
      }

      if (currentSessionResult.error || !currentSessionResult.data) {
        console.error("Failed to get current session:", currentSessionResult.error);
        redirectToSelectTerminal("We couldn't determine the current session for this terminal. Please pair again.");
        return;
      }

      const session = currentSessionResult.data;
      if (session.status === "OPEN" && session.paired) {
        setCurrentSessionId(session.sessionId);
        setSessionId(session.sessionId);
        await loadHeldOrders(session.sessionId);
      } else {
        console.warn("Session exists but is not open/paired for this terminal", session);
        redirectToSelectTerminal("This terminal isn't paired with an open session. Please pair and open one.");
        return;
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
    
    // If subcategory is selected, products are already filtered by API
    // So we only need to apply search filter
    if (selectedSubCategory) {
      return matchesSearch;
    }
    
    // Match category: if no category selected, show all products
    if (!selectedCategory && !selectedSubCategory) {
      return matchesSearch;
    }
    
    // Match product category (can be string name or object with name property)
    const productCategoryName =
      typeof product.category === "string"
      ? product.category 
      : (product.category as any)?.name;
    
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
      // Note: لا نرسل sessionId - الـ backend يجلب sessionId تلقائياً من browser token
      let orderId = currentOrder?.id;
      if (!orderId) {
        const createResult = await ordersApi.createOrder();
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
        // الـ backend يقوم بالتحقق من bundle offers تلقائياً بعد تحديث الكمية
        const newQuantity = existingItem.quantity + 1;
        const updateResult = await ordersApi.updateItem({
          orderId,
          productId: Number(product.id),
          quantity: 1, // 👈 زيادة واحدة فقط (delta)
        });

        if (updateResult.error) {
          alert(`Failed to update item: ${updateResult.error}`);
        } else if (updateResult.data) {
          // تحديث الطلب مع البيانات المحدثة من الـ backend
          // الـ backend يقوم بالتحقق من bundle offers وتطبيق الخصم تلقائياً
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
        // الـ backend يقوم بالتحقق من bundle offers تلقائياً بعد إضافة المنتج
        // ويطبق الخصم إذا كانت شروط bundle offer متوفرة
        const addResult = await ordersApi.addItem({
          orderId,
          productId: Number(product.id),
          quantity: 1,
          discountAmount: 0, // الـ backend سيحسب الخصم تلقائياً
        });

        if (addResult.error) {
          alert(`Failed to add item: ${addResult.error}`);
        } else if (addResult.data) {
          // تحديث الطلب مع البيانات المحدثة من الـ backend
          // الـ backend يقوم بالتحقق من bundle offers وتطبيق الخصم تلقائياً
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
        // تحديث الطلب مع البيانات المحدثة من الـ backend
        // الـ backend يقوم بالتحقق من bundle offers تلقائياً بعد تحديث الكمية
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


  // Use order data from backend if available, otherwise calculate from cart
  // الـ backend يقوم بحساب كل شيء بشكل صحيح (بما في ذلك خصم الـ offer order)
  const subtotal =
    currentOrder?.subtotal ||
    cart.reduce((sum, item) => {
      const itemTotal =
        item.product.price * item.quantity - (item.discountAmount || 0);
    return sum + itemTotal;
  }, 0);
  const discount = currentOrder?.discountAmount || 0; // خصم من الـ offer order
  // الـ tax يُحسب على الـ subtotal بعد الخصم
  const tax = currentOrder?.taxAmount || (subtotal - discount) * 0.1;
  // الـ total يجب أن يأتي من الـ backend مباشرة لأنه يحتوي على كل الحسابات الصحيحة
  const total = currentOrder?.grandTotal || (subtotal - discount + tax);

  // Customer registration functions
  const handleSearchCustomer = async () => {
    if (!customerPhone.trim()) {
      setCustomerError("Please enter a phone number");
      return;
    }

    setSearchingCustomer(true);
    setCustomerError(null);

    try {
      const result = await customersApi.getCustomerByPhone(customerPhone.trim());
      
      if (result.error && result.status === 404) {
        // Customer not found - show create form
        setCustomerError(null);
        setCustomerName("");
        setCustomerEmail("");
        setCustomerAddress("");
      } else if (result.error) {
        setCustomerError(result.error);
      } else if (result.data) {
        // Customer found
        setCurrentCustomer(result.data);
        setCustomerName(result.data.name);
        setCustomerEmail(result.data.email || "");
        setCustomerAddress(result.data.address || "");
        setCustomerError(null);
      }
    } catch (err) {
      setCustomerError("An error occurred while searching for customer");
      console.error(err);
    } finally {
      setSearchingCustomer(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      setCustomerError("Name and phone are required");
      return;
    }

    setCreatingCustomer(true);
    setCustomerError(null);

    try {
      const result = await customersApi.createCustomer({
        name: customerName.trim(),
        phone: customerPhone.trim(),
        email: customerEmail.trim() || undefined,
        address: customerAddress.trim() || undefined,
      });

      if (result.error) {
        setCustomerError(result.error);
      } else if (result.data) {
        setCurrentCustomer({
          id: result.data.customerId,
          name: result.data.name,
          phone: result.data.phone,
          email: result.data.email || null,
          address: result.data.address || null,
        });
        setCustomerError(null);
      }
    } catch (err) {
      setCustomerError("An error occurred while creating customer");
      console.error(err);
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleAttachCustomer = async () => {
    if (!currentOrder || !currentCustomer) {
      setCustomerError("No customer selected");
      return;
    }

    setProcessing(true);
    try {
      const result = await ordersApi.attachCustomerToOrder(
        currentOrder.id,
        currentCustomer.id
      );

      if (result.error) {
        setCustomerError(result.error);
      } else if (result.data) {
        setCurrentOrder(result.data);
        setShowCustomerModal(false);
        setCustomerError(null);
        // Reset customer form
        setCustomerPhone("");
        setCustomerName("");
        setCustomerEmail("");
        setCustomerAddress("");
      }
    } catch (err) {
      setCustomerError("An error occurred while attaching customer");
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveCustomer = async () => {
    if (!currentOrder) return;

    setProcessing(true);
    try {
      const result = await ordersApi.attachCustomerToOrder(currentOrder.id, null);

      if (result.error) {
        alert(`Failed to remove customer: ${result.error}`);
      } else if (result.data) {
        setCurrentOrder(result.data);
        setCurrentCustomer(null);
      }
    } catch (err) {
      alert("An error occurred while removing customer");
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async (method: "cash" | "card" | "both") => {
    if (!currentOrder || currentOrder.items.length === 0) {
      alert("Order is empty");
      return;
    }

    if (currentOrder.status === "PAID") {
      alert("This order is already paid");
      return;
    }

    if (method === "both") {
      // Show split payment modal
      setSplitCashAmount("");
      setSplitCardAmount("");
      setShowSplitModal(true);
      return;
    }

    // تأكيد قبل الدفع للـ Cash أو Card
    const methodName = method === "cash" ? "Cash" : "Card";
    const confirmMessage = `Confirm ${methodName} payment of ${fmtMoney(total)}?`;
    
    if (!window.confirm(confirmMessage)) {
      return; // المستخدم ألغى العملية
    }

    setProcessing(true);
    try {
      // Process single payment method
      const result = await ordersApi.processPayment({
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

    // تأكيد قبل الدفع
    const confirmMessage = `Confirm split payment?\nCash: ${fmtMoney(cashAmount)}\nCard: ${fmtMoney(cardAmount)}\nTotal: ${fmtMoney(total)}`;
    
    if (!window.confirm(confirmMessage)) {
      return; // المستخدم ألغى العملية
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

  // حساب الباقي تلقائياً في Split Payment
  const handleCashAmountChange = (value: string) => {
    setSplitCashAmount(value);
    const cashValue = parseFloat(value);
    if (!isNaN(cashValue) && cashValue >= 0 && cashValue <= total) {
      const remaining = total - cashValue;
      setSplitCardAmount(remaining.toFixed(2));
    } else if (value === "" || value === "0") {
      setSplitCardAmount("");
    }
  };

  const handleCardAmountChange = (value: string) => {
    setSplitCardAmount(value);
    const cardValue = parseFloat(value);
    if (!isNaN(cardValue) && cardValue >= 0 && cardValue <= total) {
      const remaining = total - cardValue;
      setSplitCashAmount(remaining.toFixed(2));
    } else if (value === "" || value === "0") {
      setSplitCashAmount("");
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
      // No active session, just logout (cashier only)
      logoutForRole('CASHIER');
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
        const totalCash = sessionDetail.performance.cashIn || 0;
        const totalCard = sessionDetail.performance.cardIn || 0;
        const totalOrders = sessionDetail.performance.totalOrders || 0;
        const openingFloat = sessionDetail.sessionInfo?.openingFloat ?? DEFAULT_OPENING_FLOAT;
        const totalSales = totalCash + totalCard;
        setSessionStats({
          totalCash,
          totalCard,
          totalOrders,
          openingFloat,
          totalSales,
          expectedDrawer: openingFloat + totalCash,
          closingAmount: openingFloat + totalSales,
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
          const openingFloat = sessionDetail?.sessionInfo?.openingFloat ?? DEFAULT_OPENING_FLOAT;
          const totalSales = cashTotal + cardTotal;
          setSessionStats({
            totalCash: cashTotal,
            totalCard: cardTotal,
            totalOrders: ordersResult.data.length,
            openingFloat,
            totalSales,
            expectedDrawer: openingFloat + cashTotal,
            closingAmount: openingFloat + totalSales,
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
        openingFloat: DEFAULT_OPENING_FLOAT,
        totalSales: 0,
        expectedDrawer: DEFAULT_OPENING_FLOAT,
        closingAmount: DEFAULT_OPENING_FLOAT,
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const handleConfirmLogout = async () => {
    setShowLogoutConfirm(false);
    setLoadingStats(true);

    try {
      await finalizeSessionBeforeExit();
    } finally {
      setLoadingStats(false);
    }

    logoutForRole('CASHIER');
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
    setSessionStats(null);
  };

  const finalizeSessionBeforeExit = async () => {
    if (currentOrder && currentOrder.status !== "PAID" && currentOrder.items.length > 0) {
      console.log("Holding order before exit:", currentOrder.id, currentOrder.status);
      try {
        const holdResult = await ordersApi.holdOrder(currentOrder.id);
        if (holdResult.error) {
          console.error("Failed to hold order before exit:", holdResult.error);
          alert("Warning: Failed to hold the current order. Please hold it manually before leaving.");
        } else {
          setCurrentOrder(null);
          setCart([]);
          if (currentSessionId) {
            await loadHeldOrders(currentSessionId);
          }
        }
      } catch (error) {
        console.error("Error holding order before exit:", error);
        alert("Warning: Failed to hold the current order. Please hold it manually before leaving.");
      }
    }

    if (currentSessionId) {
      try {
        const statusResult = await sessionsApi.getSessionStatus();
        const baseFloat = sessionStats?.openingFloat ?? statusResult.data?.openingFloat ?? DEFAULT_OPENING_FLOAT;
        const totalSales = sessionStats?.totalSales ?? (sessionStats ? sessionStats.totalCash + sessionStats.totalCard : 0);
        const closingAmount = baseFloat + totalSales;

        const closeResult = await sessionsApi.closeCashierSession(closingAmount);
        if (closeResult.error) {
          console.error("Failed to close session:", closeResult.error);
          alert("Warning: Failed to close the session. Please contact a supervisor.");
        } else if (closeResult.data) {
          console.log("Session closed successfully", closeResult.data);
          alert(closeResult.data.message || "Session closed successfully");
          setCurrentSessionId(null);
          clearSessionId();
          setSessionStats(null);
          setHeldOrders([]);
        }
      } catch (error) {
        console.error("Error closing session:", error);
      }
    }
  };

  const handleUnpairTerminal = async () => {
    if (unpairing) {
      return;
    }

    const confirmed = window.confirm(
      "Unpair this browser from the terminal? You will need a new pairing code to continue working."
    );

    if (!confirmed) {
      return;
    }

    setUnpairing(true);

    try {
      await finalizeSessionBeforeExit();

      const result = await terminalApi.unpairTerminal();
      if (result.error) {
        alert(result.error);
        return;
      }

      sessionStorage.clear();
      clearSessionId();
      setCurrentSessionId(null);
      setCurrentOrder(null);
      setHeldOrders([]);

      alert(result.data?.message || "This browser has been disconnected. You will be redirected to sign in again.");
      logoutForRole('CASHIER');
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to unpair terminal");
    } finally {
      setUnpairing(false);
    }
  };

  const loadHeldOrders = async (sessionId?: number) => {
    try {
      const allHeldOrders: Order[] = [];
      let currentSessionId = sessionId;

      if (!currentSessionId) {
        const currentSessionResult = await sessionsApi.getCurrentSession();

        if (currentSessionResult.status === 401 || currentSessionResult.status === 403) {
          handleUnauthorized("Your cashier login expired. Please sign in again.");
          return;
        }

        if (currentSessionResult.status === 404) {
          redirectToSelectTerminal("No session is active on this terminal yet.");
          return;
        }

        if (!currentSessionResult.data || currentSessionResult.data.status !== "OPEN") {
          redirectToSelectTerminal("This terminal doesn't have an open session. Please pair again.");
          return;
        }

        currentSessionId = currentSessionResult.data.sessionId;
      }

      if (!currentSessionId) {
        return;
      }

      try {
        const historyResult = await ordersApi.getSessionHistory(currentSessionId);
        if (historyResult.data) {
          const held = historyResult.data.filter((o) => o.status === "HELD");
          for (const heldOrder of held) {
            const fullOrder = await ordersApi.getOrder(heldOrder.id);
            if (fullOrder.data) {
              if (!allHeldOrders.find((o) => o.id === fullOrder.data!.id)) {
                allHeldOrders.push(fullOrder.data);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error loading held orders for session ${currentSessionId}:`, error);
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
            onClick={() => navigate("/cashier/return")}
            className="p-2 rounded-lg text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors"
            title="Return Order"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            onClick={() => navigate("/cashier/returns")}
            className="p-2 rounded-lg text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-colors"
            title="Return Orders History"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
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
            onClick={handleUnpairTerminal}
            disabled={unpairing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-orange-200 text-orange-700 hover:bg-orange-50 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span role="img" aria-label="unpair terminal">
              🔌
            </span>
            <span>{unpairing ? "Unpairing..." : "Unpair"}</span>
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
                        {category.subCategories
                          .filter((sc) => sc != null)
                          .map((subCategory) => (
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
                          {fmtMoney(orderItem?.unitPrice || product.price)} × {quantity}
                          {/* عرض السعر الأصلي إذا كان هناك خصم */}
                          {orderItem?.originalLineTotal && orderItem.originalLineTotal > lineTotal && (
                            <span className="text-gray-400 line-through ml-1">
                              {fmtMoney(orderItem.originalLineTotal)}
                            </span>
                          )}
                          {discount > 0 && (
                              <span className="text-red-600 ml-2 font-medium">
                                -{fmtMoney(discount)} discount
                              </span>
                          )}
                        </div>
                        {/* عرض معلومات الـ offer إذا كان موجوداً */}
                        {orderItem?.offerId && orderItem.offerTitle && (
                          <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                            <span>🎁</span>
                            <span>{orderItem.offerTitle}</span>
                            {orderItem.originalLineTotal && orderItem.originalLineTotal > lineTotal && (
                              <span className="text-green-600">
                                ({Math.round(((orderItem.originalLineTotal - lineTotal) / orderItem.originalLineTotal) * 100)}% off)
                              </span>
                            )}
                          </div>
                        )}
                        {/* عرض نسبة الخصم فقط إذا لم يكن هناك offerTitle */}
                        {/* Bundle Offer يتم تطبيقه تلقائياً من الـ backend عند إضافة المنتجات */}
                        {orderItem?.offerId && !orderItem.offerTitle && orderItem.originalLineTotal && orderItem.originalLineTotal > lineTotal && (
                          <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                            <span>🎁</span>
                            <span className="text-blue-600">Bundle Offer</span>
                            <span className="text-green-600">
                              ({Math.round(((orderItem.originalLineTotal - lineTotal) / orderItem.originalLineTotal) * 100)}% off)
                            </span>
                          </div>
                        )}
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

            {/* Customer Section */}
            {currentOrder && (
              <div className="border-b border-gray-200 pb-4 mb-4">
                {currentOrder.customerName ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{currentOrder.customerName}</p>
                        {currentOrder.customerPhone && (
                          <p className="text-xs text-gray-500">{currentOrder.customerPhone}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveCustomer}
                      disabled={processing}
                      className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowCustomerModal(true);
                      setCustomerPhone("");
                      setCustomerName("");
                      setCustomerEmail("");
                      setCustomerAddress("");
                      setCurrentCustomer(null);
                      setCustomerError(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                  >
                    <User className="h-4 w-4" />
                    Add Customer (Optional)
                  </button>
                )}
              </div>
            )}

            {/* Order Summary */}
            <div className="space-y-2 border-t border-gray-200 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900">{fmtMoney(subtotal)}</span>
              </div>
              {/* عرض خصم الـ offers على مستوى الـ items (Category/Product Offers) إذا كان موجوداً */}
              {currentOrder && currentOrder.items.some(item => item.discountAmount > 0 || (item.originalLineTotal && item.originalLineTotal > item.lineTotal)) && (
                <div className="text-xs text-gray-500 italic mb-1">
                  Item discounts (Category/Product Offers): {fmtMoney(
                    currentOrder.items.reduce((sum, item) => {
                      const itemDiscount = item.discountAmount || 
                        (item.originalLineTotal && item.originalLineTotal > item.lineTotal 
                          ? item.originalLineTotal - item.lineTotal 
                          : 0);
                      return sum + itemDiscount;
                    }, 0)
                  )}
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Order Discount (Offer):</span>
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

      {/* Customer Registration Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Add Customer</h2>
                <button
                  onClick={() => {
                    setShowCustomerModal(false);
                    setCustomerError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {customerError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {customerError}
                </div>
              )}

              <div className="space-y-4">
                {/* Phone Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Enter phone number"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSearchCustomer}
                      disabled={searchingCustomer || !customerPhone.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
                    >
                      {searchingCustomer ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Customer Form */}
                {(!currentCustomer || customerError) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter customer name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="Enter email address"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address (Optional)
                      </label>
                      <textarea
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Enter address"
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {!currentCustomer && (
                      <button
                        onClick={handleCreateCustomer}
                        disabled={creatingCustomer || !customerName.trim() || !customerPhone.trim()}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                      >
                        {creatingCustomer ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Customer"
                        )}
                      </button>
                    )}
                  </>
                )}

                {/* Attach Customer Button */}
                {currentCustomer && (
                  <div className="space-y-3">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-800">Customer Found/Created</p>
                      <p className="text-sm text-green-700">{currentCustomer.name}</p>
                      <p className="text-xs text-green-600">{currentCustomer.phone}</p>
                    </div>
                    <button
                      onClick={handleAttachCustomer}
                      disabled={processing}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Attaching...
                        </>
                      ) : (
                        "Attach to Order"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
                  max={total}
                  value={splitCashAmount}
                  onChange={(e) => handleCashAmountChange(e.target.value)}
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
                  max={total}
                  value={splitCardAmount}
                  onChange={(e) => handleCardAmountChange(e.target.value)}
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
                    <span className="text-gray-700 font-medium">Opening float:</span>
                    <span className="text-gray-900 font-semibold">
                      {fmtMoney(sessionStats.openingFloat)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Cash sales collected:</span>
                    <span className="text-gray-900 font-semibold">
                      {fmtMoney(sessionStats.totalCash)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Expected cash in drawer:</span>
                    <span className="text-gray-900 font-semibold">
                      {fmtMoney(sessionStats.expectedDrawer)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Card sales collected:</span>
                    <span className="text-gray-900 font-semibold">
                      {fmtMoney(sessionStats.totalCard)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Total sales (cash + card):</span>
                    <span className="text-gray-900 font-semibold">
                      {fmtMoney(sessionStats.totalSales)}
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
