import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, AlertTriangle, X } from 'lucide-react';
import ProductList from '../components/Operations/ProductList';
import CreateProduct from '../components/Operations/CreateProduct';
import EditProduct from '../components/Operations/EditProduct';
import RestockModal from '../components/Operations/RestockModal';
import { productsApi, type ProductDTO, type ProductCreateDTO } from '../services/products.api';
import { useToast } from '../contexts/ToastContext';
import PageHeader from "../components/PageHeader";

type UIProduct = Omit<ProductDTO, 'category'> & { 
  category?: string;
  price: number;
  imageUrl?: string | null; // Ensure imageUrl is available for display
  warehouseQuantity?: number;
  storeQuantity?: number;
  sales?: number;
};

export default function InventoryOperations() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  
  const initialFilters = {
    brand: '',
    sku: '',
    minPrice: '',
    maxPrice: '',
    isActive: ''
  };

  const [products, setProducts] = useState<UIProduct[]>([]);
  const [allProducts, setAllProducts] = useState<UIProduct[]>([]); // Keep unfiltered products for stats
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Summary statistics
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    lowStock: 0,
    outOfStock: 0
  });

  // Initialize currentView from URL params, default to 'list'
  const viewFromUrl = searchParams.get('view') as 'list' | 'create' | 'edit' | null;
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit'>(
    (viewFromUrl && ['list', 'create', 'edit'].includes(viewFromUrl)) ? viewFromUrl : 'list'
  );
  
  // Initialize editingProductId from URL params
  const editIdFromUrl = searchParams.get('editId');
  const [editingProductId, setEditingProductId] = useState<string | number | null>(
    editIdFromUrl ? editIdFromUrl : null
  );
  const [showFilters, setShowFilters] = useState(false);
  const [activeCardFilter, setActiveCardFilter] = useState<'all' | 'active' | 'lowStock' | 'outOfStock'>('all');
  const [restockModal, setRestockModal] = useState<{ isOpen: boolean; productId: string | number | null; productName: string }>({
    isOpen: false,
    productId: null,
    productName: ''
  });

  const fetchProducts = async (filterOverrides?: typeof initialFilters, pageOverride?: number, sizeOverride?: number) => {
    const activeFilters = filterOverrides ?? filters;
    const page = pageOverride !== undefined ? pageOverride : currentPage;
    const size = sizeOverride !== undefined ? sizeOverride : itemsPerPage;
    try {
      setLoading(true);
      setError(null);
      const res = await productsApi.filter({
        page: page,
        size: size,
        brand: activeFilters.brand || undefined,
        sku: activeFilters.sku || undefined,
        minPrice: activeFilters.minPrice ? Number(activeFilters.minPrice) : undefined,
        maxPrice: activeFilters.maxPrice ? Number(activeFilters.maxPrice) : undefined,
        isActive: activeFilters.isActive === '' ? undefined : activeFilters.isActive === 'true'
      });
      if (res.data) {
        // Handle paginated response
        let content: ProductDTO[] = [];
        let totalPagesValue = 0;
        let totalElementsValue = 0;
        
        if (typeof res.data === 'object' && 'content' in res.data) {
          // Paginated response
          const pageData = res.data as { content: ProductDTO[]; totalPages: number; totalElements: number; number: number; size: number };
          content = pageData.content || [];
          totalPagesValue = pageData.totalPages || 0;
          totalElementsValue = pageData.totalElements || 0;
        } else if (Array.isArray(res.data)) {
          // Array response (fallback)
          content = res.data as ProductDTO[];
          totalPagesValue = 1;
          totalElementsValue = content.length;
        } else {
          content = (res.data as any).content || [];
          totalPagesValue = (res.data as any).totalPages || 0;
          totalElementsValue = (res.data as any).totalElements || 0;
        }
        
        setTotalPages(totalPagesValue);
        setTotalElements(totalElementsValue);
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
        // Store unfiltered products for stats when fetching without filters
        if (!activeFilters.brand && !activeFilters.sku && !activeFilters.minPrice && !activeFilters.maxPrice && activeFilters.isActive === '') {
          setAllProducts(normalized);
        }
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

  type AddProductInput = ProductCreateDTO & { imageFile?: File | null; imageFiles?: File[]; imageMimeType?: string; imageTitle?: string; categoryId?: string | number; quantity?: number; expirationDate?: string | null };

  const addProduct = async (product: AddProductInput) => {
    setLoading(true);
    setError(null);
    try {
      const { imageFile, imageFiles, imageUrl: imageToUpload, imageMimeType, imageTitle, quantity, expirationDate, ...payload } = product;
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
        
        // Add quantity to warehouse if provided, then fetch store product details
        let warehouseQuantity = 0;
        let storeQuantity = 0;
        let sales = 0;
        
        if (quantity && quantity > 0 && created.id) {
          try {
            const { storeProductsApi } = await import('../services/store-products.api');
            await storeProductsApi.addToInventory({
              productId: typeof created.id === 'string' ? parseInt(created.id) : created.id,
              quantity: quantity,
              notes: `Initial stock quantity added when product was created`,
              expirationDate: expirationDate || null
            });
            console.log(`Added ${quantity} units to warehouse for product ${created.id}`);
            
            // Fetch store product details to get actual quantities and sales
            const productId = typeof created.id === 'string' ? parseInt(created.id) : created.id;
            const stockRes = await storeProductsApi.getByProductId(productId);
            if (stockRes.data) {
              warehouseQuantity = (stockRes.data as any).warehouseQty || (stockRes.data as any).warehouseQuantity || 0;
              storeQuantity = (stockRes.data as any).storeQty || (stockRes.data as any).storeQuantity || 0;
              sales = (stockRes.data as any).sales || 0;
            }
          } catch (err) {
            console.error('Failed to add quantity to warehouse:', err);
            // Don't fail the whole operation if quantity add fails, but log it
          }
        }
        
        const normalized: UIProduct = { 
          ...created, 
          category: categoryName || payload.category,
          price: created.price ?? created.defaultPrice ?? payload.price ?? 0,
          imageUrl: imageUrl || null,
          warehouseQuantity,
          storeQuantity,
          sales
        };
        // NOTE: normalized is prepared for future UI insert; current flow refreshes list from API.
        void normalized;
        
        // Refresh the list to show the new product (go to page 0 to see it)
        setCurrentPage(0);
        fetchProducts(undefined, 0, undefined);
        // Stay on create view - don't navigate away since we have toast notification
        // Show success toast
        showSuccess('Product added successfully');
      } else {
        throw new Error(res.error || 'Unable to create product');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to create product';
      setError(errorMessage);
      // Show error toast
      showError(`Product creation failed: ${errorMessage}`);
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
      
      // Refresh the current page to show updated product
      fetchProducts(undefined, currentPage, undefined);
      // Return to list view and clear URL params
      setCurrentView('list');
      setEditingProductId(null);
      setSearchParams({});
      // Show success toast
      showSuccess('Product updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to update product';
      setError(errorMessage);
      // Show error toast
      showError(`Product update failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id: string | number) => {
    setLoading(true);
    setError(null);
    try {
      await productsApi.remove(id);
      // Refresh current page after deletion
      // If current page would be empty, go to previous page
      const currentProductsCount = products.length;
      if (currentProductsCount === 1 && currentPage > 0) {
        const newPage = currentPage - 1;
        setCurrentPage(newPage);
        fetchProducts(undefined, newPage, undefined);
      } else {
        fetchProducts(undefined, currentPage, undefined);
      }
      // Show success toast
      showSuccess('Product deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to delete product';
      setError(errorMessage);
      // Show error toast
      showError(`Product deletion failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string | number) => {
    setEditingProductId(id);
    setCurrentView('edit');
    // Update URL params
    setSearchParams({ view: 'edit', editId: String(id) });
  };

  const handleCreate = () => {
    setCurrentView('create');
    // Update URL params
    setSearchParams({ view: 'create' });
  };

  const handleCancel = () => {
    setCurrentView('list');
    setEditingProductId(null);
    // Clear URL params
    setSearchParams({});
  };

  const handleRestock = (id: string | number, name: string) => {
    setRestockModal({
      isOpen: true,
      productId: id,
      productName: name
    });
  };

  const handleRestockSuccess = () => {
    // Refresh products list after successful restock
    fetchProducts(undefined, currentPage, undefined);
    // Show success toast
    showSuccess('Product restocked successfully');
  };

  const handleCloseRestockModal = () => {
    setRestockModal({
      isOpen: false,
      productId: null,
      productName: ''
    });
  };

  // Sync view state with URL params (for browser back/forward navigation)
  useEffect(() => {
    const viewFromUrl = searchParams.get('view') as 'list' | 'create' | 'edit' | null;
    const editIdFromUrl = searchParams.get('editId');
    
    if (viewFromUrl && ['list', 'create', 'edit'].includes(viewFromUrl)) {
      setCurrentView(viewFromUrl);
      
      if (viewFromUrl === 'edit' && editIdFromUrl) {
        setEditingProductId(editIdFromUrl);
      } else if (viewFromUrl !== 'edit') {
        setEditingProductId(null);
      }
    } else {
      // No view param, default to list
      setCurrentView('list');
      setEditingProductId(null);
    }
  }, [searchParams]);

  // Calculate statistics from allProducts (unfiltered)
  const calculateStats = () => {
    // Only calculate stats when allProducts is fully loaded and matches totalElements
    // This prevents numbers from flickering/changing
    if (allProducts.length > 0 && totalElements > 0 && allProducts.length === totalElements) {
      const active = allProducts.filter(p => p.isActive !== false).length;
      const low = allProducts.filter(p => {
        const total = (p.warehouseQuantity || 0) + (p.storeQuantity || 0);
        return total > 0 && total < 10; // threshold
      }).length;
      const out = allProducts.filter(p => {
        const total = (p.warehouseQuantity || 0) + (p.storeQuantity || 0);
        return total === 0;
      }).length;
      setStats({
        totalProducts: totalElements, // Use API totalElements for accuracy
        activeProducts: active,
        lowStock: low,
        outOfStock: out
      });
    }
    // Don't set partial stats - wait until everything is ready
  };

  // Update stats only when allProducts is fully loaded
  useEffect(() => {
    if (currentView === 'list') {
      calculateStats();
    }
  }, [allProducts.length, totalElements, currentView]); // Only trigger when lengths match

  // Load all products for stats calculation on mount
  useEffect(() => {
    // Fetch all products across all pages for accurate stats
    const fetchAllForStats = async () => {
      try {
        const { storeProductsApi } = await import('../services/store-products.api');
        const allProductsList: UIProduct[] = [];
        let currentPage = 0;
        let hasMore = true;
        let totalElementsFromAPI = 0;
        
        while (hasMore) {
          const res = await productsApi.filter({
            page: currentPage,
            size: 1000,
          });
          
          if (res.data) {
            let content: ProductDTO[] = [];
            if (typeof res.data === 'object' && 'content' in res.data) {
              const pageData = res.data as { content: ProductDTO[]; totalPages: number; totalElements: number };
              content = pageData.content || [];
              totalElementsFromAPI = pageData.totalElements || 0;
              hasMore = currentPage < pageData.totalPages - 1;
            } else if (Array.isArray(res.data)) {
              content = res.data;
              hasMore = false;
            } else {
              hasMore = false;
            }
            
            const normalized: UIProduct[] = await Promise.all(
              content.map(async (p) => {
                let categoryName: string | undefined;
                if (Array.isArray((p as any).categories) && (p as any).categories.length > 0) {
                  categoryName = (p as any).categories[0]?.name;
                } else if (typeof p.category === 'string' && p.category.trim()) {
                  categoryName = p.category;
                }
                
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
                    // ignore
                  }
                }
                
                return {
                  ...p,
                  category: categoryName,
                  price: p.price ?? p.defaultPrice ?? 0,
                  warehouseQuantity,
                  storeQuantity,
                };
              })
            );
            allProductsList.push(...normalized);
            currentPage++;
          } else {
            hasMore = false;
          }
        }
        
        // Only set allProducts once all pages are loaded
        setAllProducts(allProductsList);
        // Update totalElements if we got it from API
        if (totalElementsFromAPI > 0 && totalElementsFromAPI !== totalElements) {
          setTotalElements(totalElementsFromAPI);
        }
      } catch (err) {
        console.error('Failed to fetch all products for stats:', err);
      }
    };
    
    fetchAllForStats();
    fetchProducts();
  }, []); // initial load

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <PageHeader
        title="Inventory Operations"
        icon={<span className="text-2xl">📦</span>}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        
        {/* Summary Cards */}
        {currentView === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <button
              onClick={() => {
                const cleared = { ...initialFilters };
                setFilters(cleared);
                setActiveCardFilter('all');
                setCurrentPage(0);
                fetchProducts(cleared, 0, undefined);
              }}
              className={`bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-5 border-2 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer text-left w-full ${
                activeCardFilter === 'all' 
                  ? 'border-indigo-500 ring-2 ring-indigo-300 shadow-md' 
                  : 'border-indigo-200/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-700 mb-1">Total Products</p>
                  <p className="text-2xl font-bold text-indigo-900">{stats.totalProducts}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                  <Package className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </button>
            
            <button
              onClick={() => {
                const activeFilters = { ...filters, isActive: 'true' };
                setFilters(activeFilters);
                setActiveCardFilter('active');
                setCurrentPage(0);
                fetchProducts(activeFilters, 0, undefined);
              }}
              className={`bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer text-left w-full ${
                activeCardFilter === 'active' 
                  ? 'border-green-500 ring-2 ring-green-300 shadow-md' 
                  : 'border-green-200/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">Active Products</p>
                  <p className="text-2xl font-bold text-green-900">{stats.activeProducts}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-2xl">✓</span>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => {
                const cleared = { ...initialFilters };
                setFilters(cleared);
                setActiveCardFilter('lowStock');
                setCurrentPage(0);
                fetchProducts(cleared, 0, undefined);
              }}
              className={`bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-5 border-2 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer text-left w-full ${
                activeCardFilter === 'lowStock' 
                  ? 'border-yellow-500 ring-2 ring-yellow-300 shadow-md' 
                  : 'border-yellow-200/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700 mb-1">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-900">{stats.lowStock}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </button>
            
            <button
              onClick={() => {
                const cleared = { ...initialFilters };
                setFilters(cleared);
                setActiveCardFilter('outOfStock');
                setCurrentPage(0);
                fetchProducts(cleared, 0, undefined);
              }}
              className={`bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-5 border-2 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer text-left w-full ${
                activeCardFilter === 'outOfStock' 
                  ? 'border-red-500 ring-2 ring-red-300 shadow-md' 
                  : 'border-red-200/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700 mb-1">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-900">{stats.outOfStock}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <X className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </button>
          </div>
        )}

        {currentView === 'list' && (
          <ProductList 
            products={activeCardFilter === 'lowStock' 
              ? products.filter(p => {
                  const total = (p.warehouseQuantity || 0) + (p.storeQuantity || 0);
                  return total > 0 && total < 10;
                })
              : activeCardFilter === 'outOfStock'
              ? products.filter(p => {
                  const total = (p.warehouseQuantity || 0) + (p.storeQuantity || 0);
                  return total === 0;
                })
              : products} 
            onDelete={deleteProduct}
            onEdit={handleEdit}
            onCreate={handleCreate}
            onRestock={handleRestock}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalElements={totalElements}
            onPageChange={(page: number) => {
              setCurrentPage(page);
              fetchProducts(undefined, page, undefined);
            }}
            onItemsPerPageChange={(size: number) => {
              setItemsPerPage(size);
              setCurrentPage(0);
              fetchProducts(undefined, 0, size);
            }}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            filters={filters}
            onFiltersChange={(newFilters) => setFilters(newFilters)}
            onApplyFilters={() => {
              setCurrentPage(0);
              fetchProducts(undefined, 0, undefined);
            }}
            onResetFilters={() => {
              const cleared = { ...initialFilters };
              setFilters(cleared);
              setCurrentPage(0);
              fetchProducts(cleared, 0, undefined);
            }}
            isFiltering={activeCardFilter !== 'all' || filters.brand !== '' || filters.sku !== '' || filters.minPrice !== '' || filters.maxPrice !== '' || filters.isActive !== ''}
            allProducts={allProducts}
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

      {/* Restock Modal - Outside main container for proper z-index */}
      <RestockModal
        isOpen={restockModal.isOpen}
        onClose={handleCloseRestockModal}
        productId={restockModal.productId || ''}
        productName={restockModal.productName}
        onRestockSuccess={handleRestockSuccess}
      />
    </div>
  );
}
