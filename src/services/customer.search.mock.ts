// Mock Service for Customer Search
// TODO: Replace with real API calls when backend is ready
// Keep function signatures identical for easy swap

import type {
  Category,
  SubCategory,
  ProductCard,
  SearchParams,
  SearchResponse,
} from "../types/customer.search";

// Mock Data
const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: "Electronics", iconUrl: "/icons/electronics.svg" },
  { id: 2, name: "Clothing", iconUrl: "/icons/clothing.svg" },
  { id: 3, name: "Food & Beverages", iconUrl: "/icons/food.svg" },
  { id: 4, name: "Home & Garden", iconUrl: "/icons/home.svg" },
  { id: 5, name: "Sports & Outdoors", iconUrl: "/icons/sports.svg" },
  { id: 6, name: "Books & Media", iconUrl: "/icons/books.svg" },
];

const MOCK_SUBCATEGORIES: SubCategory[] = [
  // Electronics
  { id: 1, name: "Smartphones", categoryId: 1 },
  { id: 2, name: "Laptops", categoryId: 1 },
  { id: 3, name: "Headphones", categoryId: 1 },
  // Clothing
  { id: 4, name: "Men's Wear", categoryId: 2 },
  { id: 5, name: "Women's Wear", categoryId: 2 },
  { id: 6, name: "Accessories", categoryId: 2 },
  // Food & Beverages
  { id: 7, name: "Fresh Produce", categoryId: 3 },
  { id: 8, name: "Beverages", categoryId: 3 },
  { id: 9, name: "Snacks", categoryId: 3 },
  // Home & Garden
  { id: 10, name: "Furniture", categoryId: 4 },
  { id: 11, name: "Decor", categoryId: 4 },
  { id: 12, name: "Tools", categoryId: 4 },
  // Sports & Outdoors
  { id: 13, name: "Fitness", categoryId: 5 },
  { id: 14, name: "Camping", categoryId: 5 },
  { id: 15, name: "Outdoor Gear", categoryId: 5 },
  // Books & Media
  { id: 16, name: "Fiction", categoryId: 6 },
  { id: 17, name: "Non-Fiction", categoryId: 6 },
  { id: 18, name: "E-Books", categoryId: 6 },
];

// Generate mock products
const generateMockProducts = (): ProductCard[] => {
  const products: ProductCard[] = [];
  let productId = 1;

  MOCK_SUBCATEGORIES.forEach((subCat) => {
    const category = MOCK_CATEGORIES.find((c) => c.id === subCat.categoryId);
    if (!category) return;

    // Generate 8-12 products per subcategory
    const count = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const hasImage = Math.random() > 0.3; // 70% have images
      const inStock = Math.random() > 0.2; // 80% in stock
      const hasOffer = Math.random() > 0.5; // 50% have offers

      products.push({
        id: productId++,
        name: `${subCat.name} Product ${i + 1}`,
        price: Math.round((10 + Math.random() * 990) * 100) / 100,
        imageUrl: hasImage ? `/images/product-${productId}.jpg` : undefined,
        categoryId: category.id,
        categoryName: category.name,
        subCategoryId: subCat.id,
        subCategoryName: subCat.name,
        inStock,
        hasOffer,
      });
    }
  });

  return products;
};

const MOCK_PRODUCTS = generateMockProducts();

// Simulate API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const customerSearchService = {
  /**
   * Get all categories
   * TODO: Replace with real API call
   */
  async getCategories(): Promise<Category[]> {
    await delay(300);
    return [...MOCK_CATEGORIES];
  },

  /**
   * Get subcategories for a category
   * TODO: Replace with real API call
   */
  async getSubCategories(categoryId: number): Promise<SubCategory[]> {
    await delay(200);
    return MOCK_SUBCATEGORIES.filter((sc) => sc.categoryId === categoryId);
  },

  /**
   * Search products with filters
   * TODO: Replace with real API call
   */
  async searchProducts(params: SearchParams): Promise<SearchResponse> {
    await delay(400);

    let results = [...MOCK_PRODUCTS];

    // Filter by query
    if (params.q && params.q.trim()) {
      const query = params.q.toLowerCase().trim();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.categoryName.toLowerCase().includes(query) ||
          p.subCategoryName.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (params.categoryId) {
      results = results.filter((p) => p.categoryId === params.categoryId);
    }

    // Filter by subcategory
    if (params.subCategoryId) {
      results = results.filter((p) => p.subCategoryId === params.subCategoryId);
    }

    // Filter by stock
    if (params.inStockOnly) {
      results = results.filter((p) => p.inStock);
    }

    // Filter by offers
    if (params.offersOnly) {
      results = results.filter((p) => p.hasOffer);
    }

    // Filter by price range
    if (params.minPrice !== undefined) {
      results = results.filter((p) => p.price >= params.minPrice!);
    }
    if (params.maxPrice !== undefined) {
      results = results.filter((p) => p.price <= params.maxPrice!);
    }

    // Sort
    const sort = params.sort || "relevance";
    switch (sort) {
      case "price_asc":
        results.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        results.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        // Simulate newest by ID (higher ID = newer)
        results.sort((a, b) => b.id - a.id);
        break;
      case "relevance":
      default:
        // Keep original order (already filtered by relevance)
        break;
    }

    // Pagination
    const page = params.page || 1;
    const size = params.size || 20;
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    const paginatedResults = results.slice(startIndex, endIndex);

    return {
      items: paginatedResults,
      total: results.length,
      page,
      size,
    };
  },
};
