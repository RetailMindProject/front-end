import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ChevronRight,
  ChevronLeft,
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
  Store,
  Printer,
} from "lucide-react";
import { getUserDisplayName, setSessionId, clearSessionId } from "../services/tokens";
import { logoutForRole } from "../services/auth.api";
import { sessionsApi } from "../services/sessions.api";
import { offersApi } from "../services/offers.api";
import { ordersApi, type Order, type OrderHistoryItem } from "../services/orders.api";
import { categoriesApi, type CategoryHierarchy } from "../services/categories.api";
import { terminalApi } from "../services/terminal.api";
import { customersApi, type Customer } from "../services/customers.api";
import { productsApi } from "../services/products.api";

interface Product {
  id: string | number;
  name: string;
  sku?: string;
  price: number;
  category?: string | null;
  image?: {
    url?: string;
    altText?: string;
  } | null;
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
  const [paidOrderId, setPaidOrderId] = useState<number | null>(null);
  const [paidOrderNumber, setPaidOrderNumber] = useState<string | null>(null);
  const [printingReceipt, setPrintingReceipt] = useState(false);
  // Pagination state
  const [productsPage, setProductsPage] = useState(0);
  const [productsPageSize] = useState(20); // Products per page
  const [productsTotalPages, setProductsTotalPages] = useState(1);
  const [productsTotalElements, setProductsTotalElements] = useState(0);
  
  // Customer registration state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerFirstName, setCustomerFirstName] = useState("");
  const [customerLastName, setCustomerLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [shouldPromptForCustomer, setShouldPromptForCustomer] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);

  // Barcode scanner state
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const [isTypingInInput, setIsTypingInInput] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const cashierName = getUserDisplayName();
  const storeName = "My store"; // يمكن جلبها من API لاحقاً
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
      if (categoriesResult.data && (categoriesResult.data ?? []).length > 0) {
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

  // Load products with pagination
  useEffect(() => {
    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        let response;
        
        if (selectedSubCategory) {
          // For subcategory, we need to fetch all and filter client-side
          // But for pagination, we'll use the filter API with category filter
          response = await productsApi.filter({
            page: productsPage,
            size: productsPageSize,
            isActive: true,
          });
        } else if (selectedCategory && !selectedSubCategory) {
          // For parent category, use filter API
          response = await productsApi.filter({
            page: productsPage,
            size: productsPageSize,
            isActive: true,
          });
        } else {
          // No category selected, load all products with pagination
          response = await productsApi.filter({
            page: productsPage,
            size: productsPageSize,
            isActive: true,
          });
        }

        if (response.data) {
          let pageProducts = response.data.content || [];
          
          // Filter by subcategory if selected (client-side filtering)
          if (selectedSubCategory) {
            pageProducts = pageProducts.filter((p: any) => {
              if (p.categories && Array.isArray(p.categories)) {
                return p.categories.some((cat: any) => cat.id === selectedSubCategory);
              }
              return false;
            });
          }
          
          // Filter by parent category if selected (client-side filtering)
          if (selectedCategory && !selectedSubCategory) {
            const selectedCategoryName = categories.find(
              (c) => c.id === selectedCategory
            )?.name;
            if (selectedCategoryName) {
              pageProducts = pageProducts.filter((p: any) => {
                const productCategoryName =
                  (p.categories && p.categories.length > 0)
                    ? p.categories[0].name
                    : (typeof p.category === 'string' 
                        ? p.category 
                        : (p.category?.name || null));
                return productCategoryName === selectedCategoryName;
              });
            }
          }

          // Map to local Product interface
          const mappedProducts = pageProducts.map((p: any) => {
            const categoryName =
              (p.categories && p.categories.length > 0)
                ? p.categories[0].name
                : (typeof p.category === 'string' 
                    ? p.category 
                    : (p.category?.name || null));

            return {
              id: p.id,
              name: p.name || "",
              sku: p.sku || "",
              price: p.defaultPrice || p.price || 0,
              category: categoryName ?? undefined,
              image: p.image ? { url: p.image.url, altText: p.image.altText } : null,
            };
          });

          setProducts(mappedProducts);
          setProductsTotalPages(response.data.totalPages || 1);
          setProductsTotalElements(response.data.totalElements || 0);
        } else {
          setProducts([]);
          setProductsTotalPages(1);
          setProductsTotalElements(0);
        }
      } catch (error) {
        console.error("Error loading products:", error);
        setProducts([]);
        setProductsTotalPages(1);
        setProductsTotalElements(0);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, [selectedSubCategory, selectedCategory, productsPage, productsPageSize]);

  // Sync cart with order items
  useEffect(() => {
    if (currentOrder && (products ?? []).length > 0) {
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

  // Handle barcode scanner input
  const handleBarcodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only process if not typing in regular inputs and no modals are open
    if (isTypingInInput || showSplitModal || showOrdersModal || showCustomerModal || showLogoutConfirm) {
      return;
    }
    setBarcodeBuffer(e.target.value);
  };

  const handleBarcodeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Only process if not typing in regular inputs and no modals are open
    if (isTypingInInput || showSplitModal || showOrdersModal || showCustomerModal || showLogoutConfirm) {
      return;
    }

    // Handle Enter key - process barcode
    if (e.key === "Enter") {
      e.preventDefault();
      // Get barcode from input value directly (in case onChange hasn't updated state yet)
      const barcode = (e.currentTarget.value || barcodeBuffer).trim();
      
      if (!barcode) {
        return;
      }
      
      // Find product by SKU
      const product = products.find((p) => p.sku && p.sku === barcode);
      
      if (product) {
        // Add to cart using existing addToCart function
        addToCart(product);
      } else {
        // Product not found - could show a message, but silently ignore for now
        console.warn(`Product with SKU "${barcode}" not found`);
      }
      
      // Clear buffer and input
      setBarcodeBuffer("");
      if (barcodeInputRef.current) {
        barcodeInputRef.current.value = "";
      }
    }
  };

  // Keep hidden input focused when not typing in other inputs
  useEffect(() => {
    if (isTypingInInput || showSplitModal || showOrdersModal || showCustomerModal || showLogoutConfirm) {
      return;
    }

    const focusHiddenInput = () => {
      if (barcodeInputRef.current && document.activeElement !== barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    };

    // Focus immediately and then periodically
    focusHiddenInput();
    const focusInterval = setInterval(focusHiddenInput, 500);

    return () => {
      clearInterval(focusInterval);
    };
  }, [isTypingInInput, showSplitModal, showOrdersModal, showCustomerModal, showLogoutConfirm]);

  // Handle Enter key in search field to add product by SKU
  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && (searchTerm ?? "").trim()) {
      e.preventDefault();
      const sku = (searchTerm ?? "").trim();
      
      // Find product by SKU
      const product = products.find((p) => p.sku && p.sku === sku);
      
      if (product) {
        // Add to cart using existing addToCart function
        await addToCart(product);
        // Clear search term after adding
        setSearchTerm("");
      } else {
        // Product not found - show message
        alert("SKU not found");
      }
    }
  };

  // Auto-detect barcode scanner input (when barcode is entered without Enter)
  // Barcode scanners typically input numbers quickly, so we detect when searchTerm
  // matches a product SKU exactly and hasn't changed for a short period
  useEffect(() => {
    // Don't auto-process if user is actively typing or modals are open
    if (showSplitModal || showOrdersModal || showCustomerModal || showLogoutConfirm) {
      return;
    }

    if (!(searchTerm ?? "").trim()) {
      return;
    }

    // Check if searchTerm is a numeric string (likely a barcode)
    const isNumericBarcode = /^\d+$/.test((searchTerm ?? "").trim());
    
    // Only auto-process if it looks like a barcode (numeric and at least 8 digits)
    // and matches a product SKU exactly
    if (isNumericBarcode && (searchTerm ?? "").trim().length >= 8) {
      const timeoutId = setTimeout(async () => {
        // Double-check that searchTerm hasn't changed (user might still be typing)
        const currentSearchTerm = (searchTerm ?? "").trim();
        
        // Find product by SKU (exact match)
        const product = products.find((p) => p.sku && p.sku === currentSearchTerm);
        
        if (product) {
          // Add to cart using existing addToCart function
          await addToCart(product);
          // Clear search term after adding
          setSearchTerm("");
        }
      }, 500); // Wait 500ms after last input to process

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [searchTerm, products, showSplitModal, showOrdersModal, showCustomerModal, showLogoutConfirm]);

  // Reset to first page when category/subcategory changes
  useEffect(() => {
    setProductsPage(0);
  }, [selectedCategory, selectedSubCategory]);


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
          // Clear paid order info when starting a new order
          setPaidOrderId(null);
          setPaidOrderNumber(null);
        }
      }

      // Customer linking is now optional - only when user clicks "Add Customer" button

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
    if (!(customerPhone ?? "").trim()) {
      setCustomerError("Please enter a phone number");
      return;
    }

    // Check if order already has a customer attached (use customer.id instead of customerName)
    if (currentOrder?.customer?.id) {
      setCustomerError("This order already has a customer attached. Cannot link another customer.");
      return;
    }

    setSearchingCustomer(true);
    setCustomerError(null);

    try {
      const result = await customersApi.searchCustomerByPhone((customerPhone ?? "").trim());
      
      if (result.error) {
        setCustomerError(result.error);
        setCustomerFound(false);
        setCurrentCustomer(null);
        setCustomerFirstName("");
        setCustomerLastName("");
        setCustomerEmail("");
        setCustomerAddress("");
      } else if (result.data) {
        if (result.data.found && result.data.customer) {
          // Customer found
          setCustomerFound(true);
          setCurrentCustomer(result.data.customer);
          
          // Use firstName/lastName directly from response (never use split)
          const customer = result.data.customer;
          setCustomerFirstName(customer.firstName ?? "");
          setCustomerLastName(customer.lastName ?? "");
          
          setCustomerEmail(customer.email ?? "");
          setCustomerAddress(customer.address ?? "");
          setCustomerError(null);
        } else {
          // Customer not found - show create form
          setCustomerFound(false);
          setCurrentCustomer(null);
          setCustomerFirstName("");
          setCustomerLastName("");
          setCustomerEmail("");
          setCustomerAddress("");
          setCustomerError(null);
        }
      }
    } catch (err) {
      setCustomerError("An error occurred while searching for customer");
      console.error(err);
      setCustomerFound(false);
      setCurrentCustomer(null);
    } finally {
      setSearchingCustomer(false);
    }
  };

  const handleLinkOrCreateCustomer = async () => {
    if (!currentOrder) {
      setCustomerError("No order found");
      return;
    }

    // Prevent linking another customer if one is already attached (use customer.id instead of customerName)
    if (currentOrder.customer?.id) {
      setCustomerError("This order already has a customer attached. Cannot link another customer.");
      return;
    }

    // Only allow if order status is DRAFT or HOLD
    if (currentOrder.status !== "DRAFT" && currentOrder.status !== "HOLD") {
      setCustomerError("Cannot attach customer to this order status");
      return;
    }

    setCreatingCustomer(true);
    setCustomerError(null);

    try {
      if (customerFound && currentCustomer) {
        // Customer found - link using PUT /api/orders/{orderId}/customer
        const result = await ordersApi.linkCustomerToOrder(
          currentOrder.id,
          currentCustomer.id
        );

        if (result.error) {
          setCustomerError(result.error);
        } else if (result.data) {
          // Merge customer data only - don't replace entire order
          // Use fallback from currentCustomer if result.data.customer is not available
          setCurrentOrder((prev) => {
            if (!prev) return result.data || null;
            if (!result.data) return prev;
            
            // Use customer from response, or fallback to currentCustomer
            // New API may return customerId, userId, and customer object
            const responseCustomer = result.data.customer;
            const fallbackCustomer = currentCustomer;
            const customerToUse = responseCustomer ?? fallbackCustomer;
            
            // Use customerId from response or customer.id
            const customerIdFromResponse = result.data.customerId ?? responseCustomer?.id ?? fallbackCustomer?.id;
            
            // Use customerName directly from result.data.customer.customerName (backend now returns it)
            let customerName: string | null = result.data.customer?.customerName 
              ?? result.data.customerName 
              ?? null;
            
            // Fallback: build from firstName + lastName if customerName not available
            if (!customerName && customerToUse) {
              const firstName = (customerToUse.firstName ?? "").trim();
              const lastName = (customerToUse.lastName ?? "").trim();
              if (firstName || lastName) {
                customerName = `${firstName} ${lastName}`.trim();
              } else {
                customerName = (customerToUse.name ?? customerToUse.fullName ?? "").trim() || null;
              }
            }
            
            // Build customerPhone from response or fallback
            const customerPhoneValue = result.data.customerPhone 
              ?? responseCustomer?.phone 
              ?? fallbackCustomer?.phone 
              ?? prev.customerPhone 
              ?? null;
            
            return {
              ...prev,
              // Only merge customer fields, keep all other order data intact
              customerName: customerName ?? prev.customerName ?? null,
              customerPhone: customerPhoneValue,
              customerId: customerIdFromResponse ?? prev.customerId ?? null,
              userId: result.data.userId ?? prev.userId ?? null,
              customer: customerToUse ? {
                id: customerIdFromResponse ?? customerToUse.id ?? 0, // Use customerId from response
                firstName: customerToUse.firstName,
                lastName: customerToUse.lastName,
                name: customerToUse.name,
                fullName: customerToUse.fullName,
                phone: customerToUse.phone,
                email: customerToUse.email,
              } : prev.customer ?? null,
            };
          });
          // Close modal and reset form
          setShowCustomerModal(false);
          setShouldPromptForCustomer(false);
          setCustomerPhone("");
          setCustomerFirstName("");
          setCustomerLastName("");
          setCustomerEmail("");
          setCustomerAddress("");
          setCurrentCustomer(null);
          setCustomerFound(false);
        }
      } else {
        // Customer not found - create and attach using POST /api/orders/{orderId}/customer/attach-by-phone
        if (!(customerFirstName ?? "").trim() || !(customerLastName ?? "").trim() || !(customerPhone ?? "").trim()) {
          setCustomerError("First name, last name, and phone are required");
          setCreatingCustomer(false);
          return;
        }

        const result = await ordersApi.attachCustomerByPhone(
          currentOrder.id,
          {
            phone: (customerPhone ?? "").trim(),
            createIfMissing: true,
            firstName: (customerFirstName ?? "").trim(),
            lastName: (customerLastName ?? "").trim(),
            email: (customerEmail ?? "").trim() || undefined,
          }
        );

        if (result.error) {
          setCustomerError(result.error);
        } else if (result.data) {
          // Merge customer data only - don't replace entire order
          // Use fallback from input data (customerFirstName/customerLastName) if result.data.customer is not available
          setCurrentOrder((prev) => {
            if (!prev) return result.data || null;
            if (!result.data) return prev;
            
            // Use customer from response (new API returns customerId, userId, and customer object)
            const responseCustomer = result.data.customer;
            // Use customerId from response or customer.id
            const customerIdFromResponse = result.data.customerId ?? responseCustomer?.id;
            
            let customerToUse = responseCustomer;
            
            // If no customer object in response but we have customerId, build from input data
            if (!customerToUse && customerIdFromResponse) {
              const firstName = (customerFirstName ?? "").trim();
              const lastName = (customerLastName ?? "").trim();
              if (firstName || lastName) {
                customerToUse = {
                  id: customerIdFromResponse, // Use customerId from response
                  firstName: firstName || undefined,
                  lastName: lastName || undefined,
                  phone: (customerPhone ?? "").trim(),
                  email: (customerEmail ?? "").trim() || undefined,
                };
              }
            } else if (!customerToUse) {
              // If no customerId either, build from input data (fallback)
              const firstName = (customerFirstName ?? "").trim();
              const lastName = (customerLastName ?? "").trim();
              if (firstName || lastName) {
                customerToUse = {
                  id: 0, // Will be set by backend
                  firstName: firstName || undefined,
                  lastName: lastName || undefined,
                  phone: (customerPhone ?? "").trim(),
                  email: (customerEmail ?? "").trim() || undefined,
                };
              }
            }
            
            // Use customerName directly from result.data.customer.customerName (backend now returns it)
            let customerName: string | null = result.data.customer?.customerName 
              ?? result.data.customerName 
              ?? null;
            
            // Fallback: build from firstName + lastName if customerName not available
            if (!customerName && customerToUse) {
              const firstName = (customerToUse.firstName ?? "").trim();
              const lastName = (customerToUse.lastName ?? "").trim();
              if (firstName || lastName) {
                customerName = `${firstName} ${lastName}`.trim();
              } else {
                customerName = (customerToUse.name ?? customerToUse.fullName ?? "").trim() || null;
              }
            }
            
            // Build customerPhone from response or input
            const customerPhoneValue = result.data.customerPhone 
              ?? responseCustomer?.phone 
              ?? (customerPhone ?? "").trim() 
              ?? prev.customerPhone 
              ?? null;
            
            return {
              ...prev,
              // Only merge customer fields, keep all other order data intact
              customerName: customerName ?? prev.customerName ?? null,
              customerPhone: customerPhoneValue,
              customerId: customerIdFromResponse ?? prev.customerId ?? null,
              userId: result.data.userId ?? prev.userId ?? null,
              customer: customerToUse ? {
                id: customerIdFromResponse ?? customerToUse.id ?? 0, // Use customerId from response
                firstName: customerToUse.firstName,
                lastName: customerToUse.lastName,
                name: customerToUse.name,
                fullName: customerToUse.fullName,
                phone: customerToUse.phone,
                email: customerToUse.email,
              } : prev.customer ?? null,
            };
          });
          // Close modal and reset form
          setShowCustomerModal(false);
          setShouldPromptForCustomer(false);
          setCustomerPhone("");
          setCustomerFirstName("");
          setCustomerLastName("");
          setCustomerEmail("");
          setCustomerAddress("");
          setCurrentCustomer(null);
          setCustomerFound(false);
        }
      }
    } catch (err) {
      setCustomerError("An error occurred while processing customer");
      console.error(err);
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Handle skip/close customer modal
  const handleSkipCustomer = () => {
    setShowCustomerModal(false);
    setShouldPromptForCustomer(false);
    setCustomerPhone("");
    setCustomerFirstName("");
    setCustomerLastName("");
    setCustomerEmail("");
    setCustomerAddress("");
    setCurrentCustomer(null);
    setCustomerFound(false);
    setCustomerError(null);
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
    if (!currentOrder || (currentOrder.items ?? []).length === 0) {
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
        // Save order info before clearing
        setPaidOrderId(result.data.id);
        setPaidOrderNumber(result.data.orderNumber);
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
        // Save order info before clearing
        setPaidOrderId(result.data.id);
        setPaidOrderNumber(result.data.orderNumber);
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

  const handlePrintReceipt = async () => {
    if (!paidOrderId) return;

    setPrintingReceipt(true);
    try {
      const result = await ordersApi.downloadReceipt(paidOrderId);

      if (result.error) {
        if (result.status === 409) {
          alert("Cannot print receipt: Order is not PAID yet.");
        } else if (result.status === 404) {
          alert("Order not found.");
        } else {
          alert(`Failed to print receipt: ${result.error}`);
        }
      } else if (result.data) {
        // Create blob URL and open/download
        const blobUrl = URL.createObjectURL(result.data);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `receipt-${paidOrderNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error("Error printing receipt:", error);
      alert("An error occurred while printing receipt");
    } finally {
      setPrintingReceipt(false);
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
            totalOrders: (ordersResult.data ?? []).length,
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
    if (currentOrder && currentOrder.status !== "PAID" && (currentOrder.items ?? []).length > 0) {
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
          const held = historyResult.data.filter((o) => o.status === "HOLD");
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
    if (!currentOrder || (currentOrder.items ?? []).length === 0) {
      alert("Order is empty");
      return;
    }

    if (currentOrder.status === "PAID") {
      alert("Cannot hold a paid order");
      return;
    }

    if (currentOrder.status === "HOLD") {
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
      <header className="border-b border-gray-200 px-6 py-4 flex items-center justify-between bg-white">
        {/* Left: My Store with Cashier Image and Name */}
        <button
          onClick={() => navigate("/cashier/profile")}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="relative">
            <img
              src={`${window.location.origin}/picture/cashier.png`}
              alt="Cashier"
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `${window.location.origin}/picture/ceo.png`;
              }}
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-800">{storeName}</span>
            </div>
            <span className="text-xs text-gray-500">{cashierName}</span>
          </div>
        </button>

        {/* Center: Session with Green Dot and Dropdown */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-gray-800">Session</span>
            <ChevronDown className="h-4 w-4 text-gray-600" />
          </div>
        </div>

        {/* Right: Profile Image and Icons */}
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
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setIsTypingInInput(true)}
                onBlur={() => setIsTypingInInput(false)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Hidden input for barcode scanner */}
          <input
            ref={barcodeInputRef}
            type="text"
            autoFocus
            value={barcodeBuffer}
            onChange={handleBarcodeInput}
            onKeyDown={handleBarcodeKeyDown}
            style={{
              position: "absolute",
              left: "-9999px",
              width: "1px",
              height: "1px",
              opacity: 0,
              pointerEvents: "none",
            }}
            tabIndex={-1}
          />

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
                    (category.subCategories ?? []).length > 0 && (
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
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center gap-3"
                >
                  {(() => {
                    const productName = product.name.toLowerCase();
                    const allowedProducts = ['katchap', 'saneora', 'tea', 'zatar', 'tona'];
                    const hasImage = allowedProducts.some(name => productName.includes(name));
                    
                    if (hasImage && product.image?.url) {
                      return (
                        <img
                          src={`${window.location.origin}${product.image.url}`}
                          alt={product.image.altText ?? product.name}
                          className="w-12 h-12 object-cover rounded border border-gray-200 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      );
                    }
                    return null;
                  })()}
                  <div className="flex-1 min-w-0">
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
                  </div>
                </button>
              ))}
              {(filteredProducts ?? []).length === 0 && !loadingProducts && (
                  <p className="text-center text-gray-500 py-8">
                    No products found
                  </p>
              )}
              
              {/* Pagination Controls */}
              {productsTotalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setProductsPage(prev => Math.max(0, prev - 1))}
                    disabled={productsPage === 0 || loadingProducts}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-700">
                    Page {productsPage + 1} of {productsTotalPages} ({productsTotalElements} products)
                  </span>
                  
                  <button
                    onClick={() => setProductsPage(prev => Math.min(productsTotalPages - 1, prev + 1))}
                    disabled={productsPage >= productsTotalPages - 1 || loadingProducts}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
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
            {(() => {
              const itemsToShow = (currentOrder?.items && currentOrder.items.length > 0)
                ? currentOrder.items 
                : (cart && cart.length > 0) ? cart : null;

              if (!itemsToShow?.length) {
                return (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400">No items in order</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {itemsToShow.map((item) => {
                  // Determine if item is OrderItem or CartItem
                  const isOrderItem = 'productId' in item && 'unitPrice' in item;
                  const orderItem = isOrderItem ? (item as any) : null;
                  const cartItem = !isOrderItem ? (item as CartItem) : null;
                  
                  // Extract product directly from item
                  console.log('🔍 Item:', item);
                  console.log('🔍 Item keys:', Object.keys(item));
                  
                  let resolvedProduct: Product;
                  if (orderItem) {
                    // OrderItem
                    console.log('📦 orderItem:', orderItem);
                    console.log('📦 orderItem.product:', orderItem.product);
                    console.log('📦 orderItem.product?.image:', orderItem.product?.image);
                    console.log('📦 orderItem.product?.image?.url:', orderItem.product?.image?.url);
                    
                    if (orderItem.product) {
                      console.log('✅ Using orderItem.product:', orderItem.product);
                      console.log('✅ orderItem.product.image:', orderItem.product.image);
                      resolvedProduct = {
                        id: orderItem.product.id,
                        name: orderItem.product.name,
                        price: orderItem.unitPrice,
                        image: orderItem.product.image || null,
                      };
                    } else {
                      console.log('⚠️ orderItem.product is null, searching in products...');
                      const foundProduct = products.find((p) => p.id === orderItem.productId);
                      console.log('🔍 Found product:', foundProduct);
                      resolvedProduct = foundProduct || {
                        id: orderItem.productId,
                        name: `Product ${orderItem.productId}`,
                        price: orderItem.unitPrice,
                        image: null,
                      };
                    }
                  } else {
                    // CartItem
                    console.log('✅ Using cartItem.product:', cartItem!.product);
                    resolvedProduct = cartItem!.product;
                  }
                  
                  console.log('🎨 Resolved product:', resolvedProduct);
                  console.log('🖼️ Resolved product.image:', resolvedProduct.image);
                  console.log('🖼️ Resolved product.image?.url:', resolvedProduct.image?.url);
                    
                    const quantity = orderItem?.quantity || cartItem?.quantity || 0;
                    const discount = orderItem?.discountAmount || cartItem?.discountAmount || 0;
                    const lineTotal = orderItem?.lineTotal || (resolvedProduct.price * quantity - discount);  
                  
                  return (
                    <div
                      key={orderItem?.id || `cart-${resolvedProduct.id}`}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Product image - only for specific products */}
                        {(() => {
                          const productName = resolvedProduct.name.toLowerCase();
                          const allowedProducts = ['katchap', 'saneora', 'tea', 'zatar', 'tona'];
                          const hasImage = allowedProducts.some(name => productName.includes(name));
                          
                          if (hasImage && resolvedProduct?.image?.url) {
                            return (
                              <img
                                src={`${window.location.origin}${resolvedProduct.image.url}`}
                                alt={resolvedProduct.image.altText ?? resolvedProduct.name}
                                className="w-12 h-12 shrink-0 object-cover rounded"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            );
                          }
                          return null;
                        })()}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">
                            {resolvedProduct.name}
                          </div>
                        <div className="text-sm text-gray-500">
                          {fmtMoney(orderItem?.unitPrice || resolvedProduct.price)} × {quantity}
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
                        {orderItem?.offerId && (() => {
                          // Get offer type name
                          const getOfferTypeName = (offerType?: string | null): string | null => {
                            if (!offerType) return null;
                            switch (offerType.toUpperCase()) {
                              case "BUNDLE":
                                return "Bundle Offer";
                              case "PRODUCT":
                                return "Product Offer";
                              case "CATEGORY":
                                return "Category Offer";
                              case "ORDER":
                                return "Order Offer";
                              default:
                                return null;
                            }
                          };

                          // Try to extract offer type from offerTitle if offerType is not available
                          const extractOfferTypeFromTitle = (title?: string | null): string | null => {
                            if (!title) return null;
                            const titleLower = title.toLowerCase();
                            if (titleLower.includes("bundle")) return "Bundle Offer";
                            if (titleLower.includes("product")) return "Product Offer";
                            if (titleLower.includes("category")) return "Category Offer";
                            if (titleLower.includes("order")) return "Order Offer";
                            return null;
                          };

                          // Priority: offerType > extract from offerTitle > offerTitle as-is > "Offer"
                          let offerTypeName: string;
                          if (orderItem.offerType) {
                            // Use offerType directly from backend
                            const typeName = getOfferTypeName(orderItem.offerType);
                            offerTypeName = typeName || "Offer";
                          } else if (orderItem.offerTitle) {
                            // Try to extract type from offerTitle if offerType is not available
                            const extractedType = extractOfferTypeFromTitle(orderItem.offerTitle);
                            offerTypeName = extractedType || orderItem.offerTitle;
                          } else {
                            // Fallback to generic "Offer" if neither is available
                            offerTypeName = "Offer";
                          }

                          return (
                            <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                              <span>🎁</span>
                              <span>{offerTypeName}</span>
                              {orderItem.originalLineTotal && orderItem.originalLineTotal > lineTotal && (
                                <span className="text-green-600">
                                  ({Math.round(((orderItem.originalLineTotal - lineTotal) / orderItem.originalLineTotal) * 100)}% off)
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="font-semibold text-gray-900">
                          {fmtMoney(lineTotal)}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(resolvedProduct.id, -1)}
                            disabled={processing}
                            className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                          >
                            -
                          </button>
                            <span className="w-8 text-center">
                              {quantity}
                            </span>
                          <button
                            onClick={() => updateQuantity(resolvedProduct.id, 1)}
                            disabled={processing}
                            className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(resolvedProduct.id)}
                          disabled={processing}
                          className="text-red-600 hover:text-red-700 px-2 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                  })}
                </div>
              );
            })()}
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
                {currentOrder.customer?.id ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {currentOrder.customerName ?? 
                            (currentOrder.customer?.firstName && currentOrder.customer?.lastName
                              ? `${currentOrder.customer.firstName} ${currentOrder.customer.lastName}`.trim()
                              : currentOrder.customer?.name ?? currentOrder.customer?.fullName ?? "Customer")}
                        </p>
                        {(currentOrder.customerPhone ?? currentOrder.customer?.phone) && (
                          <p className="text-xs text-gray-500">{currentOrder.customerPhone ?? currentOrder.customer?.phone}</p>
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
                      // Prevent opening modal if customer is already attached
                      if (currentOrder?.customer?.id) {
                        alert("This order already has a customer attached. Cannot link another customer.");
                        return;
                      }
                      setShowCustomerModal(true);
                      setCustomerPhone("");
                      setCustomerFirstName("");
                      setCustomerLastName("");
                      setCustomerEmail("");
                      setCustomerAddress("");
                      setCurrentCustomer(null);
                      setCustomerError(null);
                      setCustomerFound(false);
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
              {/* عرض خصم الـ offers على مستوى الـ items */}
              {currentOrder && currentOrder.items.some(item => item.discountAmount > 0 || (item.originalLineTotal && item.originalLineTotal > item.lineTotal)) && (() => {
                // Get unique offer types from items
                const offerTypes = new Set<string>();
                currentOrder.items.forEach(item => {
                  if (item.offerId) {
                    if (item.offerType) {
                      const typeName = item.offerType.toUpperCase();
                      switch (typeName) {
                        case "BUNDLE":
                          offerTypes.add("Bundle");
                          break;
                        case "PRODUCT":
                          offerTypes.add("Product");
                          break;
                        case "CATEGORY":
                          offerTypes.add("Category");
                          break;
                        case "ORDER":
                          offerTypes.add("Order");
                          break;
                      }
                    } else if (item.offerTitle) {
                      // Try to extract type from offerTitle
                      const titleLower = item.offerTitle.toLowerCase();
                      if (titleLower.includes("bundle")) {
                        offerTypes.add("Bundle");
                      } else if (titleLower.includes("product")) {
                        offerTypes.add("Product");
                      } else if (titleLower.includes("category")) {
                        offerTypes.add("Category");
                      } else if (titleLower.includes("order")) {
                        offerTypes.add("Order");
                      }
                    }
                  }
                });

                const offerTypesText = offerTypes.size > 0 
                  ? Array.from(offerTypes).join("/") + " Offer" + (offerTypes.size > 1 ? "s" : "")
                  : "Item discounts";

                return (
                  <div className="text-xs text-gray-500 italic mb-1">
                    Item discounts ({offerTypesText}): {fmtMoney(
                      currentOrder.items.reduce((sum, item) => {
                        const itemDiscount = item.discountAmount || 
                          (item.originalLineTotal && item.originalLineTotal > item.lineTotal 
                            ? item.originalLineTotal - item.lineTotal 
                            : 0);
                        return sum + itemDiscount;
                      }, 0)
                    )}
                  </div>
                );
              })()}
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
                processing || !currentOrder || (currentOrder.items ?? []).length === 0 || currentOrder.status === "PAID" || currentOrder.status === "HOLD"
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
                  processing || !currentOrder || (currentOrder.items ?? []).length === 0
                }
                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  processing || !currentOrder || (currentOrder.items ?? []).length === 0
                }
                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  processing || !currentOrder || (currentOrder.items ?? []).length === 0
                }
                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Print Receipt Button - Show when order is PAID */}
            {paidOrderId && paidOrderNumber && (
              <button
                onClick={handlePrintReceipt}
                disabled={printingReceipt}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-3"
              >
                {printingReceipt ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Printer className="h-5 w-5" />
                    Print Receipt
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        </div>

        {/* Held Orders Section */}
        {(heldOrders ?? []).length > 0 && (
          <div className="border-t border-gray-200 bg-yellow-50">
            <button
              onClick={() => setHeldOrdersExpanded(!heldOrdersExpanded)}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-yellow-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Pause className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-semibold text-gray-800">
                  Held Orders ({(heldOrders ?? []).length})
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
                  {(heldOrders ?? []).map((order) => (
                    <div
                      key={order.id}
                      className="flex-shrink-0 w-56 p-3 bg-white border border-yellow-300 rounded-lg shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">
                          {order.orderNumber}
                        </span>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium flex-shrink-0">
                          HOLD
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
                <h2 className="text-xl font-semibold text-gray-800">
                  {shouldPromptForCustomer ? "Add Customer (Optional)" : "Add Customer"}
                </h2>
                <button
                  onClick={handleSkipCustomer}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {shouldPromptForCustomer && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                  Enter customer phone number to link this order to a customer (optional).
                </div>
              )}

              {currentOrder?.customer?.id && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                  This order already has a customer attached: {
                    currentOrder.customerName ?? 
                    (currentOrder.customer?.firstName && currentOrder.customer?.lastName
                      ? `${currentOrder.customer.firstName} ${currentOrder.customer.lastName}`.trim()
                      : currentOrder.customer?.name ?? currentOrder.customer?.fullName ?? "Customer")
                  }
                  {(currentOrder.customerPhone ?? currentOrder.customer?.phone) && ` (${currentOrder.customerPhone ?? currentOrder.customer?.phone})`}
                </div>
              )}

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
                      onFocus={() => setIsTypingInInput(true)}
                      onBlur={() => setIsTypingInInput(false)}
                      placeholder="Enter phone number"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSearchCustomer}
                      disabled={searchingCustomer || !(customerPhone ?? "").trim()}
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

                {/* Customer Form - Show after search (if customer found or not found) */}
                {(customerPhone ?? "").trim() && (customerFound || (!customerFound && !searchingCustomer)) && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={customerFirstName}
                          onChange={(e) => setCustomerFirstName(e.target.value)}
                          onFocus={() => setIsTypingInInput(true)}
                          onBlur={() => setIsTypingInInput(false)}
                          placeholder="Enter first name"
                          readOnly={customerFound}
                          className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            customerFound ? "bg-gray-100 cursor-not-allowed" : ""
                          }`}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={customerLastName}
                          onChange={(e) => setCustomerLastName(e.target.value)}
                          onFocus={() => setIsTypingInInput(true)}
                          onBlur={() => setIsTypingInInput(false)}
                          placeholder="Enter last name"
                          readOnly={customerFound}
                          className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            customerFound ? "bg-gray-100 cursor-not-allowed" : ""
                          }`}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        onFocus={() => setIsTypingInInput(true)}
                        onBlur={() => setIsTypingInInput(false)}
                        placeholder="Enter email address"
                        readOnly={customerFound}
                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          customerFound ? "bg-gray-100 cursor-not-allowed" : ""
                        }`}
                      />
                    </div>

                    {/* Main Action Button */}
                    <button
                      onClick={handleLinkOrCreateCustomer}
                      disabled={
                        creatingCustomer ||
                        !(customerPhone ?? "").trim() ||
                        !(customerFirstName ?? "").trim() ||
                        !(customerLastName ?? "").trim()
                      }
                      className={`w-full px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 ${
                        customerFound ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {creatingCustomer ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {customerFound ? "Linking..." : "Creating & Linking..."}
                        </>
                      ) : (
                        customerFound ? "Link Customer" : "Create & Link"
                      )}
                    </button>
                  </>
                )}

                {/* Skip button - only show if this is a prompt for new order */}
                {shouldPromptForCustomer && (
                  <button
                    onClick={handleSkipCustomer}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Skip (Continue without customer)
                  </button>
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
                  onFocus={() => setIsTypingInInput(true)}
                  onBlur={() => setIsTypingInInput(false)}
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
                  onFocus={() => setIsTypingInInput(true)}
                  onBlur={() => setIsTypingInInput(false)}
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
                                  : order.status === "HOLD"
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
                              : selectedOrder.status === "HOLD"
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
                          // Use item.product if available, otherwise fallback to products list
                          const productName = item.product?.name || products.find(
                            (p) => p.id === item.productId
                          )?.name || `Product #${item.productId}`;
                          return (
                            <div
                              key={item.id}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const productNameLower = productName.toLowerCase();
                                    const allowedProducts = ['katchap', 'saneora', 'tea', 'zatar', 'tona'];
                                    const hasImage = allowedProducts.some(name => productNameLower.includes(name));
                                    
                                    if (hasImage && item.product?.image?.url) {
                                      return (
                                        <img
                                          src={`${window.location.origin}${item.product.image.url}`}
                                          alt={item.product.image.altText || productName}
                                          className="w-10 h-10 object-cover rounded border border-gray-200 flex-shrink-0"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                      );
                                    }
                                    return null;
                                  })()}
                                  <span className="font-medium text-gray-900">
                                    {productName}
                                  </span>
                                </div>
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
