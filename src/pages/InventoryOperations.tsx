import { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import ProductList from '../components/Operations/ProductList';
import CreateProduct from '../components/Operations/CreateProduct';
import EditProduct from '../components/Operations/EditProduct';
import { productsApi, type ProductDTO, type ProductCreateDTO } from '../services/products.api';

type UIProduct = Omit<ProductDTO, 'category'> & { 
  category?: string;
  price: number;
  imageUrl?: string | null; // Ensure imageUrl is available for display
  warehouseQuantity?: number;
  storeQuantity?: number;
};

export default function InventoryOperations() {
  const initialFilters = {
    brand: '',
    sku: '',
    minPrice: '',
    maxPrice: '',
    isActive: ''
  };

  const [products, setProducts] = useState<UIProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);

  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingProductId, setEditingProductId] = useState<string | number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchProducts = async (filterOverrides?: typeof initialFilters) => {
    const activeFilters = filterOverrides ?? filters;
    try {
      setLoading(true);
      setError(null);
      const res = await productsApi.filter({
        page: 0,
        size: 50,
        brand: activeFilters.brand || undefined,
        sku: activeFilters.sku || undefined,
        minPrice: activeFilters.minPrice ? Number(activeFilters.minPrice) : undefined,
        maxPrice: activeFilters.maxPrice ? Number(activeFilters.maxPrice) : undefined,
        isActive: activeFilters.isActive === '' ? undefined : activeFilters.isActive === 'true'
      });
      if (res.data) {
        let content = Array.isArray((res.data as unknown as ProductDTO[]))
          ? (res.data as unknown as ProductDTO[])
          : res.data.content || [];
        // Fetch categories and quantities for all products in parallel
        const { storeProductsApi } = await import('../services/store-products.api');
        const normalized: UIProduct[] = await Promise.all(
          content.map(async (p) => {
            // Extract category: prefer expanded categories list (sub + parent) from backend
            let categoryName: string | undefined;
            if (Array.isArray((p as any).categories) && (p as any).categories.length > 0) {
              const firstCat = (p as any).categories[0];
              categoryName = firstCat?.name;
            } else if (typeof p.category === 'string' && p.category.trim()) {
              categoryName = p.category;
            } else if (p.category && typeof p.category === 'object') {
              const catObj = p.category as any;
              categoryName = catObj.name || (catObj.category?.name);
            } else if ((p as any).productCategory?.category?.name) {
              categoryName = (p as any).productCategory.category.name;
            } else if (Array.isArray((p as any).productCategories) && (p as any).productCategories.length > 0) {
              const firstPC = (p as any).productCategories[0];
              categoryName = firstPC?.category?.name;
            } else if (p.id) {
              // fallback call
              try {
                const catRes = await productsApi.getProductCategories(p.id);
                if (catRes.data && catRes.data.length > 0) {
                  const firstCat = catRes.data[0];
                  categoryName = firstCat.name;
                }
              } catch (err) {
                // ignore
              }
            }
            
            // Extract image URL from primaryImageUrl, images array, or imageUrl
            // Priority: images array (from media table) > primaryImageUrl > imageUrl
            let imageUrl: string | null | undefined = null;
            if (p.images && Array.isArray(p.images) && p.images.length > 0) {
              // Get primary image or first image from media table
              const primaryImage = p.images.find(img => img.isPrimary) || p.images[0];
              if (primaryImage?.url) {
                // Normalize the URL using the helper function
                imageUrl = productsApi.normalizeImageUrl(primaryImage.url, p.id);
              }
            }
            if (!imageUrl && p.primaryImageUrl) {
              imageUrl = productsApi.normalizeImageUrl(p.primaryImageUrl, p.id);
            }
            if (!imageUrl && p.imageUrl) {
              imageUrl = productsApi.normalizeImageUrl(p.imageUrl, p.id);
            }
            
            // Fetch warehouse and store quantities
            let warehouseQuantity = 0;
            let storeQuantity = 0;
            if (p.id) {
              try {
                const productId = typeof p.id === 'string' ? parseInt(p.id) : p.id;
                const stockRes = await storeProductsApi.getByProductId(productId);
                if (stockRes.data) {
                  warehouseQuantity = (stockRes.data as any).warehouseQty || (stockRes.data as any).warehouseQuantity || 0;
                  storeQuantity = (stockRes.data as any).storeQty || (stockRes.data as any).storeQuantity || 0;
                }
              } catch (err) {
                // If product not found in stock_snapshot, quantities remain 0
                console.warn(`No stock data for product ${p.id}:`, err);
              }
            }
            
            return {
              ...p,
              category: categoryName,
              price: p.price ?? p.defaultPrice ?? 0,
              imageUrl: imageUrl || p.imageUrl, // Ensure imageUrl is set
              warehouseQuantity,
              storeQuantity,
            };
          })
        );
        setProducts(normalized);
      } else {
        // Provide more context for 403 errors
        if (res.status === 403) {
          console.error('403 Forbidden Error:', {
            status: res.status,
            error: res.error,
            endpoint: '/api/products/filter',
            timestamp: new Date().toISOString()
          });
          setError(res.error || 'Access denied. You do not have permission to view products. Please contact your administrator or check your user role permissions.');
        } else {
          setError(res.error || 'Failed to load products');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  type AddProductInput = ProductCreateDTO & { imageFile?: File | null; imageFiles?: File[]; imageMimeType?: string; imageTitle?: string; categoryId?: string | number; quantity?: number };

  const addProduct = async (product: AddProductInput) => {
    setLoading(true);
    setError(null);
    try {
      const { imageFile, imageFiles, imageUrl: imageToUpload, imageMimeType, imageTitle, quantity, ...payload } = product;
      console.log('Sending product creation request with payload:', JSON.stringify(payload, null, 2));
      console.log('Add product - image files:', { 
        hasImageFile: !!imageFile, 
        imageFilesCount: imageFiles?.length || 0,
        imageFiles: imageFiles?.map((f: File) => f.name) || []
      });
      const res = await productsApi.create(payload);
      
      if (res.error) {
        console.error('Product creation error:', res.error);
        console.error('Error status:', res.status);
        setError(res.error);
        setLoading(false);
        return;
      }
      
      let created = res.data;

      // Upload image files if provided - support multiple images
      const filesToUpload = imageFiles && Array.isArray(imageFiles) && imageFiles.length > 0 
        ? imageFiles 
        : (imageFile ? [imageFile] : []);
      
      if (filesToUpload.length > 0 && created?.id) {
        try {
          // First, fetch the product to check if it already has images
          // This helps avoid the duplicate identifier error
          let productWithImages = created;
          try {
            const checkRes = await productsApi.getById(created.id);
            if (checkRes.data) {
              productWithImages = checkRes.data;
            }
          } catch (err) {
            console.warn('Failed to check existing images before upload:', err);
          }
          
          // Get current images array
          const currentImages = productWithImages.images && Array.isArray(productWithImages.images)
            ? productWithImages.images
            : [];
          
          console.log(`Uploading ${filesToUpload.length} image(s). Current image count: ${currentImages.length}`);
          
          // Upload all images sequentially
          for (let i = 0; i < filesToUpload.length; i++) {
            const file = filesToUpload[i];
            const isFirstImage = currentImages.length === 0 && i === 0;
            const sortOrder = currentImages.length + i;
            
            console.log(`Uploading image ${i + 1}/${filesToUpload.length}:`, {
              fileName: file.name,
              isPrimary: isFirstImage,
              sortOrder
            });
            
            const uploadRes = await productsApi.uploadImage(created.id, file, {
              isPrimary: isFirstImage, // Only set as primary if it's the first image of the first upload
              sortOrder: sortOrder,
              title: imageTitle || `Product Image ${i + 1}`,
              altText: created.name || 'Product image'
            });
            
            if (uploadRes.data) {
              created = uploadRes.data;
              console.log(`Upload ${i + 1} response data:`, {
                imagesCount: (created as any).images?.length || 0,
                images: (created as any).images?.map((img: any) => ({ id: img.id, isPrimary: img.isPrimary, url: img.url }))
              });
            } else if (uploadRes.error) {
              console.error(`Image ${i + 1} upload error:`, uploadRes.error);
              // Check if error is about duplicate - file might still be saved
              if (uploadRes.error.includes('already associated with the session') || uploadRes.error.includes('already exists')) {
                console.log('Upload failed due to duplicate, but file may be saved. Continuing...');
              }
            }
            
            // Small delay between uploads to allow backend to process
            if (i < filesToUpload.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
          
          // Always fetch the product again to get the latest state (including any images that were saved)
          if (created?.id) {
            try {
              // Small delay to allow backend to process
              await new Promise(resolve => setTimeout(resolve, 500));
              const fetchRes = await productsApi.getById(created.id);
              if (fetchRes.data) {
                created = fetchRes.data;
                console.log('Fetched product after all uploads:', {
                  id: created.id,
                  imagesCount: (created as any).images?.length || 0,
                  images: (created as any).images?.map((img: any) => ({ id: img.id, isPrimary: img.isPrimary, url: img.url })),
                  primaryImageUrl: (created as any).primaryImageUrl,
                  imageUrl: (created as any).imageUrl
                });
              }
            } catch (err) {
              console.error('Failed to fetch updated product:', err);
            }
          }
        } catch (err) {
          console.error('Failed to upload images:', err);
          // Even if upload fails, try to fetch product - the files might have been saved
          if (created?.id) {
            try {
              await new Promise(resolve => setTimeout(resolve, 500));
              const fetchRes = await productsApi.getById(created.id);
              if (fetchRes.data) {
                created = fetchRes.data;
              }
            } catch (fetchErr) {
              console.error('Failed to fetch product after upload error:', fetchErr);
            }
          }
        }
      } else if (created?.id && imageToUpload && !created.imageUrl) {
        // Fallback: if imageUrl is provided and is a hosted URL
        if (imageToUpload.startsWith('http://') || imageToUpload.startsWith('https://')) {
          const imgRes = await productsApi.addImage(created.id, { 
            url: imageToUpload, 
            isPrimary: true, 
            sortOrder: 0,
            mimeType: imageMimeType,
            title: imageTitle,
            altText: created.name
          });
          if (imgRes.data) {
            created = imgRes.data;
          }
        }
      }

      if (created && created.id) {
        // Fetch actual category from product categories endpoint
        let categoryName: string | undefined = payload.category;
        try {
          const catRes = await productsApi.getProductCategories(created.id);
          if (catRes.data && catRes.data.length > 0) {
            const firstCat = catRes.data[0];
            categoryName = firstCat.name;
          }
        } catch (err) {
          // Fallback: try to extract from created product response
          if (typeof created.category === 'string') {
            categoryName = created.category;
          } else if (created.category && typeof created.category === 'object') {
            const pc = (created.category as any).category || created.category;
            categoryName = pc?.name;
          }
          if (!categoryName && (created as any).productCategory) {
            const pc = (created as any).productCategory;
            categoryName = pc?.category?.name;
          }
        }
        // Extract image URL from primaryImageUrl, images array, or imageUrl
        // Priority: images array > primaryImageUrl > imageUrl
        let imageUrl: string | null | undefined = null;
        if (created.images && Array.isArray(created.images) && created.images.length > 0) {
          const primaryImage = created.images.find(img => img.isPrimary) || created.images[0];
          if (primaryImage?.url) {
            // Normalize the URL to use the API endpoint
            imageUrl = productsApi.normalizeImageUrl(primaryImage.url, created.id);
          }
        }
        if (!imageUrl && created.primaryImageUrl) {
          imageUrl = productsApi.normalizeImageUrl(created.primaryImageUrl, created.id);
        }
        if (!imageUrl && created.imageUrl) {
          imageUrl = productsApi.normalizeImageUrl(created.imageUrl, created.id);
        }
        
        const normalized: UIProduct = { 
          ...created, 
          category: categoryName || payload.category,
          price: created.price ?? created.defaultPrice ?? payload.price ?? 0,
          imageUrl: imageUrl || null
        };
        setProducts((prev) => [...prev, normalized]);
        
        // Add quantity to warehouse if provided
        if (quantity && quantity > 0 && created.id) {
          try {
            const { storeProductsApi } = await import('../services/store-products.api');
            await storeProductsApi.addToInventory({
              productId: typeof created.id === 'string' ? parseInt(created.id) : created.id,
              quantity: quantity,
              notes: `Initial stock quantity added when product was created`
            });
            console.log(`Added ${quantity} units to warehouse for product ${created.id}`);
          } catch (err) {
            console.error('Failed to add quantity to warehouse:', err);
            // Don't fail the whole operation if quantity add fails, but log it
          }
        }
      } else {
        throw new Error(res.error || 'Unable to create product');
      }
    setCurrentView('list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create product');
    } finally {
      setLoading(false);
    }
  };

  const updateProduct = async (originalId: string | number, updatedProduct: ProductDTO | ProductCreateDTO | (ProductDTO & { categoryIds?: number[]; imageFile?: File | null; imageFiles?: File[]; quantity?: number; parentCategoryId?: number; subCategoryId?: number })) => {
    setLoading(true);
    setError(null);
    try {
      // Extract imageFile, imageFiles, quantity, parentCategoryId, and subCategoryId if present
      const { imageFile, imageFiles, quantity: newQuantity, parentCategoryId, subCategoryId, ...productWithoutFile } = updatedProduct as any;
      
      console.log('Update product - image files:', { 
        hasImageFile: !!imageFile, 
        imageFilesCount: imageFiles?.length || 0,
        imageFiles: imageFiles?.map((f: File) => f.name) || []
      });
      
      // Convert to ProductUpdateDTO
      const updatePayload: ProductCreateDTO = {
        ...productWithoutFile,
        category: typeof updatedProduct.category === 'string' ? updatedProduct.category : undefined,
        categoryIds: (updatedProduct as any).categoryIds, // Pass categoryIds array
        parentCategoryId: parentCategoryId,
        subCategoryId: subCategoryId,
      };
      
      console.log('Updating product:', { originalId, updatePayload });
      const res = await productsApi.update(originalId, updatePayload);
      
      if (res.error) {
        console.error('Product update error:', res.error);
        setError(res.error);
        setLoading(false);
        return;
      }
      
      let saved = res.data ?? updatedProduct;

      // Upload image files if provided
      const filesToUpload = imageFiles && Array.isArray(imageFiles) && imageFiles.length > 0 
        ? imageFiles 
        : (imageFile ? [imageFile] : []);
      
      if (filesToUpload.length > 0 && 'id' in saved && saved.id) {
        try {
          // First, fetch the current product to get accurate image count
          let currentProduct = saved;
          try {
            const fetchRes = await productsApi.getById(saved.id);
            if (fetchRes.data) {
              currentProduct = fetchRes.data;
            }
          } catch (err) {
            console.warn('Failed to fetch current product before upload, using saved data:', err);
          }
          
          // Get current images array
          const currentImages = (currentProduct as any).images && Array.isArray((currentProduct as any).images)
            ? (currentProduct as any).images
            : [];
          
          console.log(`Uploading ${filesToUpload.length} image(s). Current image count: ${currentImages.length}`);
          
          // Upload all images sequentially
          for (let i = 0; i < filesToUpload.length; i++) {
            const file = filesToUpload[i];
            const isFirstImage = currentImages.length === 0 && i === 0;
            const sortOrder = currentImages.length + i;
            
            console.log(`Uploading image ${i + 1}/${filesToUpload.length}:`, {
              fileName: file.name,
              isPrimary: isFirstImage,
              sortOrder
            });
            
            const uploadRes = await productsApi.uploadImage(saved.id, file, {
              isPrimary: isFirstImage, // Only set as primary if it's the first image of the first upload
              sortOrder: sortOrder,
              title: `Product Image ${i + 1}`,
              altText: saved.name || 'Product image'
            });
            
            if (uploadRes.data) {
              saved = uploadRes.data;
              // Update current images count for next iteration
              const updatedImages = (saved as any).images && Array.isArray((saved as any).images)
                ? (saved as any).images
                : [];
              // Only add new images that weren't there before
              const newImages = updatedImages.slice(currentImages.length);
              currentImages.push(...newImages);
              console.log(`Image ${i + 1} uploaded successfully. Total images now: ${updatedImages.length}`);
            } else if (uploadRes.error) {
              console.error(`Image ${i + 1} upload error:`, uploadRes.error);
            }
            
            // Small delay between uploads to avoid overwhelming the server
            if (i < filesToUpload.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
          
          // Fetch the product again to get the updated image URL
          if (saved?.id) {
            try {
              await new Promise(resolve => setTimeout(resolve, 500)); // Wait for backend to process
              const fetchRes = await productsApi.getById(saved.id);
              if (fetchRes.data) {
                saved = fetchRes.data;
                console.log('Fetched product after all uploads:', {
                  id: saved.id,
                  imagesCount: (saved as any).images?.length || 0,
                  images: (saved as any).images?.map((img: any) => ({ id: img.id, isPrimary: img.isPrimary, url: img.url })),
                  primaryImageUrl: (saved as any).primaryImageUrl,
                  imageUrl: (saved as any).imageUrl
                });
              }
            } catch (err) {
              console.error('Failed to fetch updated product:', err);
            }
          }
        } catch (err) {
          console.error('Failed to upload images:', err);
          // Don't fail the whole operation if image upload fails
        }
      }
      
      // Always fetch category from product categories endpoint after update
      let categoryName: string | undefined = typeof updatePayload.category === 'string' ? updatePayload.category : undefined;
      if ('id' in saved && saved.id) {
        try {
          const catRes = await productsApi.getProductCategories(saved.id);
          if (catRes.data && catRes.data.length > 0) {
            const firstCat = catRes.data[0];
            categoryName = firstCat.name;
          }
        } catch (err) {
          // Fallback: try to extract from saved product response
          if (typeof saved.category === 'string') {
            categoryName = saved.category;
          } else if (saved.category && typeof saved.category === 'object') {
            const pc = (saved.category as any).category || saved.category;
            categoryName = pc?.name;
          }
          if (!categoryName && (saved as any).productCategory) {
            const pc = (saved as any).productCategory;
            if (pc.category) {
              categoryName = pc.category.name || pc.category.title;
            }
          }
        }
      }
      // Extract image URL from primaryImageUrl, images array, or imageUrl
      // Priority: images array > primaryImageUrl > imageUrl
      let imageUrl: string | null | undefined = null;
      const savedAsDTO = saved as ProductDTO;
      if (savedAsDTO.images && Array.isArray(savedAsDTO.images) && savedAsDTO.images.length > 0) {
        const primaryImage = savedAsDTO.images.find((img: any) => img.isPrimary) || savedAsDTO.images[0];
        if (primaryImage?.url) {
          imageUrl = productsApi.normalizeImageUrl(primaryImage.url, savedAsDTO.id);
        }
      }
      if (!imageUrl && savedAsDTO.primaryImageUrl) {
        imageUrl = productsApi.normalizeImageUrl(savedAsDTO.primaryImageUrl, savedAsDTO.id);
      }
      if (!imageUrl && savedAsDTO.imageUrl) {
        imageUrl = productsApi.normalizeImageUrl(savedAsDTO.imageUrl, savedAsDTO.id);
      }
      
      const normalized: UIProduct = { 
        ...saved,
        id: ('id' in saved ? saved.id : originalId) as number | string,
        category: categoryName || (typeof saved.category === 'string' ? saved.category : undefined),
        price: saved.price ?? saved.defaultPrice ?? ('price' in updatedProduct ? updatedProduct.price : undefined) ?? 0,
        imageUrl: imageUrl || null
      };
      setProducts((prev) =>
        prev.map((product) =>
          String(product.id) === String(originalId) ? { ...product, ...normalized } : product
        )
      );
      
      // Update warehouse quantity if provided
      if (newQuantity !== undefined && newQuantity !== null && 'id' in saved && saved.id) {
        try {
          const { storeProductsApi } = await import('../services/store-products.api');
          const productId = typeof saved.id === 'string' ? parseInt(saved.id) : saved.id;
          
          // Get current warehouse quantity
          const stockRes = await storeProductsApi.getByProductId(productId);
          const currentQty = stockRes.data 
            ? ((stockRes.data as any).warehouseQty || (stockRes.data as any).warehouseQuantity || 0)
            : 0;
          
          const difference = newQuantity - currentQty;
          
          if (difference > 0) {
            // Add quantity to warehouse
            await storeProductsApi.addToInventory({
              productId,
              quantity: difference,
              notes: `Quantity updated from ${currentQty} to ${newQuantity}`
            });
            console.log(`Added ${difference} units to warehouse for product ${productId}`);
          } else if (difference < 0) {
            // Remove quantity from warehouse
            await storeProductsApi.decreaseWarehouseQuantity({
              productId,
              quantity: Math.abs(difference),
              notes: `Quantity updated from ${currentQty} to ${newQuantity}`
            });
            console.log(`Removed ${Math.abs(difference)} units from warehouse for product ${productId}`);
          }
          // If difference is 0, no change needed
        } catch (err) {
          console.error('Failed to update warehouse quantity:', err);
          // Don't fail the whole operation if quantity update fails, but log it
        }
      }
      
    setCurrentView('list');
    setEditingProductId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update product');
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string | number) => {
    setLoading(true);
    setError(null);
    try {
      await productsApi.remove(id);
      setProducts((prev) => prev.filter((product) => String(product.id) !== String(id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete product');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string | number) => {
    setEditingProductId(id);
    setCurrentView('edit');
  };

  const handleCreate = () => {
    setCurrentView('create');
  };

  const handleCancel = () => {
    setCurrentView('list');
    setEditingProductId(null);
  };

  // Load products from API on mount
  useEffect(() => {
    fetchProducts();
  }, []); // initial load

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Section */}
      <header className="border-b border-indigo-200/50 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500"></div>
        <div className="px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg ring-2 ring-white/20">
              <span className="text-2xl">📦</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Inventory Operations
              </h1>
              <p className="text-sm text-slate-600 mt-1">Manage your product inventory</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {/* Advanced Filters */}
        {currentView === 'list' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-slate-400 ${
                  showFilters 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-300' 
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-300'
                }`}
                title={showFilters ? 'Hide filters' : 'Show filters'}
              >
                <Filter size={16} className={showFilters ? 'text-blue-600' : 'text-slate-600'} />
                {showFilters && (
                  <span className="ml-1 w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                )}
              </button>
            </div>
          {showFilters && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <input
                  placeholder="Brand"
                  className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={filters.brand}
                  onChange={(e) => setFilters((p) => ({ ...p, brand: e.target.value }))}
                />
                <input
                  placeholder="SKU"
                  className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={filters.sku}
                  onChange={(e) => setFilters((p) => ({ ...p, sku: e.target.value }))}
                />
                <input
                  placeholder="Min Price"
                  type="number"
                  className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={filters.minPrice}
                  onChange={(e) => setFilters((p) => ({ ...p, minPrice: e.target.value }))}
                />
                <input
                  placeholder="Max Price"
                  type="number"
                  className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters((p) => ({ ...p, maxPrice: e.target.value }))}
                />
                <select
                  className="px-2.5 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={filters.isActive}
                  onChange={(e) => setFilters((p) => ({ ...p, isActive: e.target.value }))}
                >
                  <option value="">Any Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => fetchProducts()}
                  className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    const cleared = { ...initialFilters };
                    setFilters(cleared);
                    fetchProducts(cleared);
                  }}
                  className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-md hover:bg-slate-50 transition-colors focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  Reset
                </button>
              </div>
            </>
          )}
          </div>
        )}
        {currentView === 'list' && (
          <ProductList 
            products={products} 
            onDelete={deleteProduct}
            onEdit={handleEdit}
            onCreate={handleCreate}
            loading={loading}
          />
        )}
        {currentView === 'create' && (
          <CreateProduct 
            onAdd={addProduct}
            onCancel={handleCancel}
            loading={loading}
          />
        )}
        {currentView === 'edit' && editingProductId && (
          <EditProduct 
            products={products}
            productId={editingProductId}
            onUpdate={updateProduct}
            onCancel={handleCancel}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
