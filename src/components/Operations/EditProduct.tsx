import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { ProductDTO, CategoryDTO } from '../../services/products.api';
import { productsApi } from '../../services/products.api';
import AuthenticatedImage from './AuthenticatedImage';

interface FormData {
  id: string;
  sku: string;
  name: string;
  brand: string;
  description: string;
  cost: string;
  price: string;
  wholesalePrice: string;
  unit: string;
  category: string; // category name for display
  categoryId: string; // category ID for API
  parentCategoryId: string; // Parent category ID
  subCategoryId: string; // Subcategory ID
  image: string | null;
  imageFile: File | null; // Store the actual file for upload
  imageFiles: File[]; // Store multiple files for upload
  isActive: boolean; // Product active status
}

interface FormErrors {
  [key: string]: string;
}

interface EditProductProps {
  products: ProductDTO[];
  productId: string | number;
  onUpdate: (id: string | number, product: ProductDTO) => Promise<void> | void;
  onCancel: () => void;
  loading?: boolean;
}

const EditProduct = ({ products, productId, onUpdate, onCancel, loading = false }: EditProductProps) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<FormData>({
    id: '',
    sku: '',
    name: '',
    brand: '',
    description: '',
    cost: '',
    price: '',
    wholesalePrice: '',
    unit: '',
    category: '',
    categoryId: '',
    parentCategoryId: '',
    subCategoryId: '',
    image: null,
    imageFile: null,
    imageFiles: [],
    isActive: true
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [_imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImages, setExistingImages] = useState<Array<{ id: number | string; url: string; isPrimary?: boolean }>>([]);
  const [deletingImage, setDeletingImage] = useState<number | string | null>(null);
  const [settingPrimary, setSettingPrimary] = useState<number | string | null>(null);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [_loadingCategories, setLoadingCategories] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<string>('');
  const [newParentName, setNewParentName] = useState('');
  const [newSubCategoryId, setNewSubCategoryId] = useState<string>(''); // For selecting existing subcategory
  const [categoryType, setCategoryType] = useState<'select' | 'create'>('select'); // Radio button state for subcategory
  const [parentType, setParentType] = useState<'select' | 'create'>('select'); // Radio button state for parent
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const initializedRef = useRef(false);

  const refreshCategories = async (selectId?: number) => {
    setLoadingCategories(true);
    try {
      const res = await productsApi.getCategories();
      if (res.data) {
        setCategories(res.data);
        if (selectId) {
          const found = res.data.find(c => c.id === selectId);
          setSelectedParentId(found?.parentId ? String(found.parentId) : '');
        }
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    refreshCategories();
  }, []);

  // Update parent category when categories are loaded and we have a subcategory
  useEffect(() => {
    if (categories.length > 0 && formData.subCategoryId && !formData.parentCategoryId) {
      const catObj = categories.find(c => String(c.id) === formData.subCategoryId);
      if (catObj?.parentId) {
        setSelectedParentId(String(catObj.parentId));
        setFormData(prev => ({
          ...prev,
          parentCategoryId: String(catObj.parentId)
        }));
      }
    }
  }, [categories, formData.subCategoryId, formData.parentCategoryId]);

  useEffect(() => {
    const loadProduct = async () => {
    if (productId) {
        setLoadingProduct(true);
        try {
          // Fetch product directly from API to get the latest data from database
          const productRes = await productsApi.getById(productId);
          console.log('Product API Response:', {
            status: productRes.status,
            error: productRes.error,
            hasData: !!productRes.data,
            fullResponse: productRes
          });
          let product = productRes.data;
          
          if (product) {
            console.log('Product data structure:', {
              id: product.id,
              name: product.name,
              hasImages: !!product.images,
              imagesType: typeof product.images,
              imagesIsArray: Array.isArray(product.images),
              imagesLength: product.images?.length || 0,
              primaryImageUrl: product.primaryImageUrl,
              imageUrl: product.imageUrl,
              allKeys: Object.keys(product)
            });
          }
          
          // Fallback to products array if API call fails or returns no data
          if (!product) {
            product = products.find(p => String(p.id) === String(productId)) as ProductDTO | undefined;
            if (!product) {
              console.error('Product not found:', productId);
              setLoadingProduct(false);
              return;
            }
          }
          
      if (product) {
          let categoryName = typeof product.category === 'string' ? product.category : '';
          let categoryId = '';
          
          // Prefer expanded categories from product if present
          if (Array.isArray((product as any).categories) && (product as any).categories.length > 0) {
            const firstCat = (product as any).categories[0];
            categoryName = firstCat?.name || categoryName;
            categoryId = firstCat?.id !== undefined ? String(firstCat.id) : categoryId;
            if (firstCat?.parentId) {
              setSelectedParentId(String(firstCat.parentId));
            }
          } else if (!categoryName && product.id) {
            // Fallback: fetch product categories endpoint
            try {
              const catRes = await productsApi.getProductCategories(product.id);
              if (catRes.data && catRes.data.length > 0) {
                const firstCat = catRes.data[0];
                categoryName = firstCat.name;
                categoryId = String(firstCat.id);
                if (firstCat.parentId) {
                  setSelectedParentId(String(firstCat.parentId));
                }
              }
            } catch (err) {
              console.error('Failed to load product category:', err);
            }
          }

          let resolvedCategoryName = categoryName;
          let resolvedCategoryId = categoryId;

          // If still missing, try product categories endpoint
          if (!resolvedCategoryId && product.id) {
            try {
              const catLinkRes = await productsApi.getProductCategories(product.id);
              if (catLinkRes.data && catLinkRes.data.length > 0) {
                const firstCat = catLinkRes.data[0];
                resolvedCategoryName = firstCat.name;
                resolvedCategoryId = String(firstCat.id);
                setSelectedParentId(firstCat.parentId ? String(firstCat.parentId) : '');
              }
            } catch (err) {
              console.error('Failed to load product categories:', err);
            }
          }

          // If API already expanded categories on product, prefer that
          if ((!resolvedCategoryId || !resolvedCategoryName) && Array.isArray((product as any).categories) && (product as any).categories.length > 0) {
            const firstCat = (product as any).categories[0];
            if (firstCat) {
              resolvedCategoryName = firstCat.name || resolvedCategoryName;
              resolvedCategoryId = firstCat.id !== undefined ? String(firstCat.id) : resolvedCategoryId;
              if (firstCat.parentId) {
                setSelectedParentId(String(firstCat.parentId));
              }
            }
          }

        setFormData({
          id: product.id !== undefined && product.id !== null ? String(product.id) : '',
          sku: product.sku || '',
          name: product.name,
          brand: product.brand || '',
          cost: product.cost !== undefined && product.cost !== null
            ? String(product.cost)
            : product.defaultCost !== undefined && product.defaultCost !== null
              ? String(product.defaultCost)
              : '',
          price: product.price !== undefined && product.price !== null
            ? String(product.price)
            : product.defaultPrice !== undefined && product.defaultPrice !== null
              ? String(product.defaultPrice)
              : '',
          wholesalePrice: product.wholesalePrice !== undefined && product.wholesalePrice !== null ? String(product.wholesalePrice) : '',
          unit: product.unit || '',
          description: product.description || '',
          category: resolvedCategoryName,
          categoryId: resolvedCategoryId,
          parentCategoryId: selectedParentId || '',
          subCategoryId: resolvedCategoryId || '',
          image: product.imageUrl || product.primaryImageUrl || 
            (product.images && Array.isArray(product.images) && product.images.length > 0
              ? (product.images.find(img => img.isPrimary) || product.images[0])?.url
              : null) || null,
          imageFile: null,
          imageFiles: [],
          isActive: product.isActive !== undefined ? product.isActive : true
        });
          // Set parent and subcategory IDs
          if (resolvedCategoryId) {
            // Try to find parent from categories if loaded, otherwise use selectedParentId
            const catObj = categories.length > 0 ? categories.find(c => String(c.id) === resolvedCategoryId) : null;
            const parentId = catObj?.parentId ? String(catObj.parentId) : selectedParentId || '';
            setSelectedParentId(parentId);
            setFormData(prev => ({
              ...prev,
              parentCategoryId: parentId,
              subCategoryId: resolvedCategoryId || ''
            }));
          } else {
            setSelectedParentId(selectedParentId || '');
          }
          initializedRef.current = true;
          
          // Get all existing images from the product - try multiple sources
          let productImages: any[] = [];
          
          // First, try the images array
          if (product.images && Array.isArray(product.images) && product.images.length > 0) {
            productImages = product.images;
            console.log('Found images in product.images array:', productImages.length);
          }
          
          // If no images array but we have primaryImageUrl or imageUrl, create image objects
          if (productImages.length === 0) {
            const imageUrls: Array<{ url: string; isPrimary: boolean }> = [];
            
            if (product.primaryImageUrl) {
              imageUrls.push({ url: product.primaryImageUrl, isPrimary: true });
              console.log('Found primaryImageUrl:', product.primaryImageUrl);
            }
            if (product.imageUrl && product.imageUrl !== product.primaryImageUrl) {
              imageUrls.push({ url: product.imageUrl, isPrimary: !product.primaryImageUrl });
              console.log('Found imageUrl:', product.imageUrl);
            }
            
            // Convert URLs to image-like objects
            if (imageUrls.length > 0) {
              productImages = imageUrls.map((img, index) => ({
                id: `img-${index}`,
                url: img.url,
                isPrimary: img.isPrimary
              }));
              console.log('Created image objects from URLs:', productImages);
            }
          }
          
          console.log('Loading product images - FINAL:', {
            imagesArray: productImages,
            imagesCount: productImages.length,
            primaryImageUrl: product.primaryImageUrl,
            imageUrl: product.imageUrl,
            productHasImagesArray: !!product.images,
            productImagesArrayLength: product.images?.length || 0,
            firstImage: productImages[0],
            fullProduct: product
          });
          
          // Set all existing images - store raw URLs and normalize during render (like ProductViewModal)
          console.log('Processing productImages:', productImages);
          const allImages = productImages
            .filter((img: any) => {
              // Check for ID in multiple possible fields (id, mediaId, imageId)
              const hasId = img && (
                (img.id !== undefined && img.id !== null) ||
                (img.mediaId !== undefined && img.mediaId !== null) ||
                (img.imageId !== undefined && img.imageId !== null)
              );
              if (!hasId) {
                console.warn('Image filtered out - no ID:', img);
              }
              return hasId;
            })
            .map((img: any, index: number) => {
              // Try to get ID from various possible fields
              const imgId = img.id || img.mediaId || img.imageId || `img-${index}`;
              
              // Helper function to extract URL string from various possible structures
              const extractUrl = (obj: any): string | null => {
                if (!obj) return null;
                
                // If it's already a string, return it
                if (typeof obj === 'string' && obj.trim() !== '') {
                  return obj;
                }
                
                // If it's an object, try to extract URL from common properties
                if (typeof obj === 'object') {
                  return obj.url || obj.path || obj.fileName || obj.src || 
                         (obj.media && (obj.media.url || obj.media.path || obj.media.fileName)) ||
                         null;
                }
                
                return null;
              };
              
              // Try to extract URL from multiple possible fields
              let rawUrl: string | null = null;
              if (img.url) {
                rawUrl = extractUrl(img.url);
              }
              if (!rawUrl && img.imageUrl) {
                rawUrl = extractUrl(img.imageUrl);
              }
              if (!rawUrl && img.fileName) {
                rawUrl = extractUrl(img.fileName);
              }
              if (!rawUrl && img.path) {
                rawUrl = extractUrl(img.path);
              }
              if (!rawUrl && img.media) {
                rawUrl = extractUrl(img.media);
              }
              
              console.log('Processing image:', {
                index,
                imgId,
                rawUrl,
                urlType: typeof img.url,
                urlValue: img.url,
                hasUrl: !!img.url,
                hasImageUrl: !!img.imageUrl,
                fullImg: img
              });
              
              // Only include images that have a valid URL string
              if (!rawUrl || rawUrl.trim() === '') {
                console.warn('Image missing URL, skipping:', { 
                  imgId, 
                  img,
                  productId: product.id,
                  availableFields: Object.keys(img || {})
                });
                return null;
              }
              
              return {
                id: imgId,
                url: rawUrl, // Now guaranteed to be a string
                isPrimary: img.isPrimary === true || img.isPrimary === 'true'
              };
            })
            .filter((img: any): img is { id: number | string; url: string; isPrimary?: boolean } => {
              const isValid = img !== null && 
                             img.id !== undefined && 
                             img.id !== null && 
                             img.url && 
                             typeof img.url === 'string' && 
                             img.url.trim() !== '';
              if (!isValid && img !== null) {
                console.warn('Image filtered out in final filter:', img);
              }
              return isValid;
            }) as Array<{ id: number | string; url: string; isPrimary?: boolean }>;
          
          console.log('Processed images for EditProduct - FINAL:', {
            count: allImages.length,
            images: allImages,
            rawProductImages: productImages,
            productId: product.id,
            productPrimaryImageUrl: product.primaryImageUrl,
            productImageUrl: product.imageUrl
          });
          
          // If we still have no images but we had raw images, try processing them differently
          if (allImages.length === 0 && productImages.length > 0) {
            console.warn('No images processed but raw images exist, trying alternative processing...');
            // Try processing with more lenient checks - use same URL extraction logic
            const extractUrlAlt = (obj: any): string | null => {
              if (!obj) return null;
              if (typeof obj === 'string' && obj.trim() !== '') return obj;
              if (typeof obj === 'object') {
                return obj.url || obj.path || obj.fileName || obj.src || 
                       (obj.media && (obj.media.url || obj.media.path || obj.media.fileName)) ||
                       null;
              }
              return null;
            };
            
            const alternativeImages = productImages
              .map((img: any, index: number) => {
                const imgId = img.id || img.mediaId || img.imageId || `alt-img-${index}`;
                
                // Try all possible URL fields with proper extraction
                let rawUrl: string | null = null;
                if (img.url) rawUrl = extractUrlAlt(img.url);
                if (!rawUrl && img.imageUrl) rawUrl = extractUrlAlt(img.imageUrl);
                if (!rawUrl && img.fileName) rawUrl = extractUrlAlt(img.fileName);
                if (!rawUrl && img.path) rawUrl = extractUrlAlt(img.path);
                if (!rawUrl && img.src) rawUrl = extractUrlAlt(img.src);
                if (!rawUrl && img.media) rawUrl = extractUrlAlt(img.media);
                
                console.log('Alternative processing - image:', { 
                  imgId, 
                  rawUrl, 
                  urlType: typeof img.url,
                  urlValue: img.url,
                  img, 
                  allKeys: Object.keys(img || {}) 
                });
                
                if (!rawUrl || rawUrl.trim() === '') {
                  return null;
                }
                
                return {
                  id: imgId,
                  url: rawUrl, // Guaranteed to be a string
                  isPrimary: img.isPrimary === true || img.isPrimary === 'true'
                };
              })
              .filter((img: any): img is { id: number | string; url: string; isPrimary?: boolean } => 
                img !== null && img.url && typeof img.url === 'string' && img.url.trim() !== ''
              );
            
            if (alternativeImages.length > 0) {
              console.log('Alternative processing successful:', alternativeImages);
              setExistingImages(alternativeImages as Array<{ id: number | string; url: string; isPrimary?: boolean }>);
              // Update allImages to use alternativeImages for preview
              allImages.length = 0;
              allImages.push(...(alternativeImages as Array<{ id: number | string; url: string; isPrimary?: boolean }>));
            } else if (product.primaryImageUrl || product.imageUrl) {
              // Last resort: create images from product-level URLs
              console.log('Creating images from product-level URLs');
              const fallbackImages = [];
              if (product.primaryImageUrl) {
                fallbackImages.push({
                  id: 'primary-img',
                  url: product.primaryImageUrl,
                  isPrimary: true
                });
              }
              if (product.imageUrl && product.imageUrl !== product.primaryImageUrl) {
                fallbackImages.push({
                  id: 'main-img',
                  url: product.imageUrl,
                  isPrimary: false
                });
              }
              if (fallbackImages.length > 0) {
                console.log('Using fallback images:', fallbackImages);
                setExistingImages(fallbackImages as Array<{ id: number | string; url: string; isPrimary?: boolean }>);
                // Update allImages to use fallbackImages for preview
                allImages.length = 0;
                allImages.push(...fallbackImages);
              }
            }
          }
          
          // Only set existing images if we have images (don't overwrite alternative/fallback processing)
          if (allImages.length > 0) {
            setExistingImages(allImages);
          }
          
          // Set preview to primary image or first image
          const primaryImage = allImages.find((img: any) => img.isPrimary) || allImages[0];
          const imageUrl = primaryImage?.url || product.imageUrl || product.primaryImageUrl || null;
          setImagePreview(imageUrl);
          
          console.log('Set existing images:', allImages.length, 'Preview URL:', imageUrl, 'Primary image:', primaryImage);
        }
        } catch (err) {
          console.error('Failed to load product:', err);
          // Fallback to products array on error
          const fallbackProduct = products.find(p => String(p.id) === String(productId));
          if (fallbackProduct) {
            // Use minimal data from fallback
            setFormData(prev => ({
              ...prev,
              id: String(fallbackProduct.id || productId),
              name: fallbackProduct.name || '',
              sku: fallbackProduct.sku || '',
            }));
          }
        } finally {
          setLoadingProduct(false);
        }
      }
    };
    loadProduct();
  }, [productId, products]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (name === 'category') {
      if (value === '__add_category') {
        setShowCategoryModal(true);
        return;
      }
      // Value is category id
      const selectedCategory = categories.find(cat => String(cat.id) === value);
      setFormData(prev => ({
        ...prev,
        category: selectedCategory ? selectedCategory.name : '',
        categoryId: selectedCategory ? String(selectedCategory.id) : ''
      }));
      // Do not override parent if user already selected one; otherwise, if cat has parent, use it
      if (!selectedParentId && selectedCategory?.parentId) {
        setSelectedParentId(String(selectedCategory.parentId));
      }
    } else if (name === 'parentCategory') {
      if (value === '__add_parent') {
        handleCreateParentOnly();
        return;
      }
      setSelectedParentId(value);
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (name === 'sku') {
      // Only allow numeric input for SKU
      const numericValue = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
    } else {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    }
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate all files
    const validFiles: File[] = [];
    const validationErrors: string[] = [];

    files.forEach((file, index) => {
      if (!file.type.startsWith('image/')) {
        validationErrors.push(`File ${index + 1} (${file.name}) is not a valid image file`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        validationErrors.push(`File ${index + 1} (${file.name}) is larger than 5MB`);
        return;
      }

      validFiles.push(file);
    });

    if (validationErrors.length > 0) {
      setErrors(prev => ({
        ...prev,
        image: validationErrors.join('; ')
      }));
      return;
    }

    // Store all valid files - append to existing, don't replace
    setFormData(prev => {
      const existingFiles = prev.imageFiles || [];
      const newFiles = [...existingFiles, ...validFiles];
      console.log('Adding files:', { 
        existingCount: existingFiles.length, 
        newCount: validFiles.length, 
        totalCount: newFiles.length,
        fileNames: newFiles.map(f => f.name)
      });
      return {
        ...prev,
        imageFiles: newFiles,
        imageFile: newFiles[0] // Keep first file for backward compatibility
      };
    });

    // Create preview from first file
    if (validFiles.length > 0) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          setImagePreview(result);
          setFormData(prev => ({
            ...prev,
            image: result
          }));
        }
      };
      reader.readAsDataURL(validFiles[0]);
    }

    if (errors.image) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.image;
        return newErrors;
      });
    }
  };

  const removePendingImage = (index: number) => {
      setFormData(prev => {
        const newFiles = [...(prev.imageFiles || [])];
        newFiles.splice(index, 1);
        
        // Update preview if needed
        if (newFiles.length > 0 && index === 0) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result;
            if (typeof result === 'string') {
              setImagePreview(result);
            }
          };
          reader.readAsDataURL(newFiles[0]);
        } else if (newFiles.length === 0) {
          setImagePreview(null);
        }
        
        return {
          ...prev,
          imageFiles: newFiles,
          imageFile: newFiles[0] || null,
          image: newFiles.length > 0 ? prev.image : null
        };
      });
  };

  const handleSaveCategory = async () => {
    try {
      let parentId: number | undefined;
      let subCategoryId: number | undefined;

      // Resolve parent: based on radio button selection (mandatory)
      if (parentType === 'create') {
        if (!newParentName.trim()) {
          alert('Parent category name is required.');
          return;
        }
        const parentRes = await productsApi.createCategory({ name: newParentName.trim() });
        if (parentRes.data?.id) {
          parentId = parentRes.data.id;
        }
      } else if (parentType === 'select') {
        if (!newCategoryParentId.trim()) {
          alert('Please select a parent category.');
          return;
        }
        const num = Number(newCategoryParentId.trim());
        if (!Number.isFinite(num)) {
          alert('Invalid parent category.');
          return;
        }
        parentId = num;
      }

      // Handle subcategory: either select existing or create new
      if (categoryType === 'select') {
        // Case 1: Select existing parent + select existing subcategory
        if (!newSubCategoryId.trim()) {
          alert('Please select a subcategory.');
          return;
        }
        const num = Number(newSubCategoryId.trim());
        if (!Number.isFinite(num)) {
          alert('Invalid subcategory.');
          return;
        }
        subCategoryId = num;
        const selectedSubCategory = categories.find(c => c.id === subCategoryId);
        
        // Always use the selected/created parent (not the subcategory's existing parent)
        // This allows linking a subcategory to a different parent if needed
        const finalParentId = parentId; // Use the parent we selected/created
        
        // Set form data with selected subcategory and selected/created parent
        setFormData(prev => ({
          ...prev,
          subCategoryId: String(subCategoryId),
          parentCategoryId: finalParentId ? String(finalParentId) : '',
          category: selectedSubCategory?.name || prev.category,
          categoryId: String(subCategoryId),
        }));
        setSelectedParentId(finalParentId ? String(finalParentId) : '');
      } else {
        // Case 2: Create new parent + create new subcategory
        // Case 3: Select existing parent + create new subcategory
        if (!newCategoryName.trim()) {
          alert('Subcategory name is required.');
          return;
        }
        
        // Ensure we have a parent before creating subcategory
        if (!parentId) {
          alert('Parent category is required to create a subcategory.');
          return;
        }
        
        const res = await productsApi.createCategory({
          name: newCategoryName.trim(),
          parentId, // Link new subcategory to the selected/created parent
        });
        if (res.data?.id) {
          subCategoryId = res.data.id;
          await refreshCategories();
          // Set form data with newly created subcategory and parent
          setFormData(prev => ({
            ...prev,
            subCategoryId: String(subCategoryId),
            parentCategoryId: parentId ? String(parentId) : '',
            category: res.data?.name || newCategoryName.trim(),
            categoryId: String(subCategoryId),
          }));
          setSelectedParentId(parentId ? String(parentId) : '');
        }
      }

      setShowCategoryModal(false);
      setNewCategoryName('');
      setNewCategoryParentId('');
      setNewParentName('');
      setNewSubCategoryId('');
      setCategoryType('select');
      setParentType('select');
    } catch (err) {
      console.error('Failed to create category:', err);
      alert('Failed to save category. Please try again.');
    }
  };

  const handleCreateParentOnly = async () => {
    const name = window.prompt('Enter new parent category name');
    if (!name || !name.trim()) return;
    try {
      const res = await productsApi.createCategory({ name: name.trim() });
      if (res.data?.id) {
        await refreshCategories(res.data.id);
        setSelectedParentId(String(res.data.id));
      }
    } catch (err) {
      console.error('Failed to create parent category:', err);
    }
  };

  const removeImage = async (mediaId?: number | string) => {
    // If mediaId is provided, delete that specific image
    // Otherwise, clear the preview (for newly selected images not yet uploaded)
    const imageToDelete = mediaId || (existingImages.length > 0 ? existingImages[0].id : null);
    
    console.log('removeImage called:', { mediaId, imageToDelete, productId, existingImagesCount: existingImages.length });
    
    if (imageToDelete && productId) {
      // No confirmation needed - delete immediately
      setDeletingImage(imageToDelete);
      try {
        console.log('Deleting image:', { productId, mediaId: imageToDelete, mediaIdType: typeof imageToDelete });
        const deleteRes = await productsApi.removeImage(productId, imageToDelete);
        
        console.log('Delete response:', { 
          status: deleteRes.status, 
          error: deleteRes.error, 
          data: deleteRes.data,
          fullResponse: deleteRes 
        });
        
        if (deleteRes.error) {
          console.error('Failed to delete image:', deleteRes.error);
          alert(`Failed to delete image: ${deleteRes.error}`);
          setDeletingImage(null);
          return;
        }
        
        // Refresh the product to get updated state
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const productRes = await productsApi.getById(productId);
          if (productRes.data) {
            const product = productRes.data;
            const productImages = product.images && Array.isArray(product.images) ? product.images : [];
            
            console.log('Product after deletion:', { 
              imagesCount: productImages.length,
              images: productImages,
              productId: product.id
            });
            
            // Update existing images list - use same logic as loadProduct
            // Helper function to extract URL string from various possible structures
            const extractUrl = (obj: any): string | null => {
              if (!obj) return null;
              if (typeof obj === 'string' && obj.trim() !== '') return obj;
              if (typeof obj === 'object') {
                return obj.url || obj.path || obj.fileName || obj.src || 
                       (obj.media && (obj.media.url || obj.media.path || obj.media.fileName)) ||
                       null;
              }
              return null;
            };
            
            const allImages = productImages
              .filter((img: any) => {
                // Check for ID in multiple possible fields (id, mediaId, imageId)
                const hasId = img && (
                  (img.id !== undefined && img.id !== null) ||
                  (img.mediaId !== undefined && img.mediaId !== null) ||
                  (img.imageId !== undefined && img.imageId !== null)
                );
                if (!hasId) {
                  console.warn('Image filtered out after delete - no ID:', img);
                }
                return hasId;
              })
              .map((img: any, index: number) => {
                // Try to get ID from various possible fields
                const imgId = img.id || img.mediaId || img.imageId || `img-${index}`;
                
                // Try to extract URL from multiple possible fields
                let rawUrl: string | null = null;
                if (img.url) {
                  rawUrl = extractUrl(img.url);
                }
                if (!rawUrl && img.imageUrl) {
                  rawUrl = extractUrl(img.imageUrl);
                }
                if (!rawUrl && img.fileName) {
                  rawUrl = extractUrl(img.fileName);
                }
                if (!rawUrl && img.path) {
                  rawUrl = extractUrl(img.path);
                }
                if (!rawUrl && img.media) {
                  rawUrl = extractUrl(img.media);
                }
                
                console.log('Processing image after delete:', {
                  index,
                  imgId,
                  rawUrl,
                  urlType: typeof img.url,
                  urlValue: img.url,
                  hasUrl: !!img.url,
                  hasImageUrl: !!img.imageUrl,
                  fullImg: img
                });
                
                // Only include images that have a valid URL string
                if (!rawUrl || rawUrl.trim() === '') {
                  console.warn('Image missing URL after deletion refresh, skipping:', { 
                    imgId, 
                    img,
                    productId: product.id,
                    availableFields: Object.keys(img || {})
                  });
                  return null;
                }
                
                return {
                  id: imgId,
                  url: rawUrl, // Now guaranteed to be a string
                  isPrimary: img.isPrimary === true || img.isPrimary === 'true'
                };
              })
              .filter((img: any): img is { id: number | string; url: string; isPrimary?: boolean } => {
                const isValid = img !== null && 
                               img.id !== undefined && 
                               img.id !== null && 
                               img.url && 
                               typeof img.url === 'string' && 
                               img.url.trim() !== '';
                if (!isValid && img !== null) {
                  console.warn('Image filtered out in final filter after delete:', img);
                }
                return isValid;
              }) as Array<{ id: number | string; url: string; isPrimary?: boolean }>;
            console.log('Updated existing images after delete:', allImages);
            setExistingImages(allImages);
            
            // Update preview to primary or first image
            const primaryImage = productImages.find((img: any) => img.isPrimary) || productImages[0];
            const imageUrl = primaryImage?.url || product.imageUrl || product.primaryImageUrl || null;
            setImagePreview(imageUrl);
            
            // Update form data and clear pending uploads
            setFormData(prev => ({
              ...prev,
              image: imageUrl,
              imageFile: null,
              imageFiles: [] // Clear pending uploads after successful delete
            }));
          }
        } catch (err) {
          console.error('Failed to refresh product after image deletion:', err);
        }
      } catch (err) {
        console.error('Error deleting image:', err);
        alert(`Error deleting image: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setDeletingImage(null);
      }
    } else {
      // No image to delete, just clear the preview and form data
      console.log('No image to delete, clearing preview only');
      setFormData(prev => ({
        ...prev,
        image: null,
        imageFile: null
      }));
      setImagePreview(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const setPrimaryImage = async (mediaId: number | string) => {
    if (!productId || !mediaId) return;
    
    setSettingPrimary(mediaId);
    try {
      console.log('Setting primary image:', { productId, mediaId });
      const res = await productsApi.setPrimaryImage(productId, mediaId);
      
      if (res.error) {
        console.error('Failed to set primary image:', res.error);
        alert(`Failed to set primary image: ${res.error}`);
        setSettingPrimary(null);
        return;
      }
      
      // Refresh the product to get updated state
      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const productRes = await productsApi.getById(productId);
        if (productRes.data) {
          const product = productRes.data;
          const productImages = product.images && Array.isArray(product.images) ? product.images : [];
          
          // Use same processing logic as loadProduct
          const extractUrl = (obj: any): string | null => {
            if (!obj) return null;
            if (typeof obj === 'string' && obj.trim() !== '') return obj;
            if (typeof obj === 'object') {
              return obj.url || obj.path || obj.fileName || obj.src || 
                     (obj.media && (obj.media.url || obj.media.path || obj.media.fileName)) ||
                     null;
            }
            return null;
          };
          
          const allImages = productImages
            .filter((img: any) => {
              const hasId = img && (
                (img.id !== undefined && img.id !== null) ||
                (img.mediaId !== undefined && img.mediaId !== null) ||
                (img.imageId !== undefined && img.imageId !== null)
              );
              return hasId;
            })
            .map((img: any, index: number) => {
              const imgId = img.id || img.mediaId || img.imageId || `img-${index}`;
              
              let rawUrl: string | null = null;
              if (img.url) {
                rawUrl = extractUrl(img.url);
              }
              if (!rawUrl && img.imageUrl) {
                rawUrl = extractUrl(img.imageUrl);
              }
              if (!rawUrl && img.fileName) {
                rawUrl = extractUrl(img.fileName);
              }
              if (!rawUrl && img.path) {
                rawUrl = extractUrl(img.path);
              }
              if (!rawUrl && img.media) {
                rawUrl = extractUrl(img.media);
              }
              
              if (!rawUrl || rawUrl.trim() === '') {
                return null;
              }
              
              return {
                id: imgId,
                url: rawUrl,
                isPrimary: img.isPrimary === true || img.isPrimary === 'true'
              };
            })
            .filter((img: any): img is { id: number | string; url: string; isPrimary?: boolean } => {
              const isValid = img !== null && 
                             img.id !== undefined && 
                             img.id !== null && 
                             img.url && 
                             typeof img.url === 'string' && 
                             img.url.trim() !== '';
              return isValid;
            }) as Array<{ id: number | string; url: string; isPrimary?: boolean }>;
          
          console.log('Updated existing images after setting primary:', allImages);
          setExistingImages(allImages);
        }
      } catch (err) {
        console.error('Failed to refresh product after setting primary image:', err);
      }
    } catch (err) {
      console.error('Error setting primary image:', err);
      alert(`Error setting primary image: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSettingPrimary(null);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // ID is not required for editing - it's auto-incremented and loaded from productId prop
    
    // SKU validation: must be a number only
    const skuTrimmed = formData.sku.trim();
    if (!skuTrimmed) {
      newErrors.sku = 'SKU is required';
    } else {
      // SKU must be a valid number
      const skuNum = parseFloat(skuTrimmed);
      if (isNaN(skuNum) || !/^\d+$/.test(skuTrimmed)) {
        newErrors.sku = 'SKU must be a number only';
      } else if (skuNum < 0) {
        newErrors.sku = 'SKU must be a positive number';
      }
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    
    // Validate numeric fields - ensure they are valid numbers
    const costNum = formData.cost.trim() ? parseFloat(formData.cost) : NaN;
    const wholesaleNum = formData.wholesalePrice.trim() ? parseFloat(formData.wholesalePrice) : NaN;
    const priceNum = formData.price.trim() ? parseFloat(formData.price) : NaN;
    
    if (!formData.cost.trim() || isNaN(costNum) || costNum < 0) {
      newErrors.cost = 'Please enter a valid cost (must be a number >= 0)';
    }

    if (!formData.wholesalePrice.trim() || isNaN(wholesaleNum) || wholesaleNum < 0) {
      newErrors.wholesalePrice = 'Please enter a valid wholesale price (must be a number >= 0)';
    }
    
    if (!formData.price.trim() || isNaN(priceNum) || priceNum <= 0) {
      newErrors.price = 'Please enter a valid price (must be a number > 0)';
    }
    
    // Validate price relationships: price > wholesalePrice AND price > cost AND wholesalePrice > cost
    if (!isNaN(costNum) && !isNaN(wholesaleNum) && !isNaN(priceNum)) {
      let priceError = '';
      
      // Check: wholesalePrice > cost
      if (wholesaleNum <= costNum) {
        newErrors.wholesalePrice = 'Must be greater than cost';
      }
      
      // Check: price > wholesalePrice
      if (priceNum <= wholesaleNum) {
        priceError = 'Must be greater than wholesale price';
      }
      
      // Check: price > cost (ensures price is highest)
      if (priceNum <= costNum) {
        priceError = priceError 
          ? 'Must be greater than wholesale price and cost'
          : 'Must be greater than cost';
      }
      
      if (priceError) {
        newErrors.price = priceError;
      }
    }
    
    // Description is optional, no validation needed
    
    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit is required';
    }
    
    if (!formData.category.trim()) {
      newErrors.category = 'Product category is required';
    }
    if (!selectedParentId) {
      newErrors.parent = 'Parent category is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (validateForm()) {
      if (!selectedParentId) {
        setErrors(prev => ({ ...prev, parent: 'Parent category is required' }));
        return;
      }
      const price = parseFloat(formData.price);
      const cost = parseFloat(formData.cost);
      const wholesale = parseFloat(formData.wholesalePrice);

      const updatedProduct: ProductDTO & { imageFile?: File | null; imageFiles?: File[]; quantity?: number; parentCategoryId?: number; subCategoryId?: number } = {
        id: formData.id.trim(),
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        brand: formData.brand.trim(),
        price,
        defaultPrice: price,
        defaultCost: cost,
        description: formData.description.trim(),
        category: formData.category.trim() || 'General',
        cost,
        wholesalePrice: wholesale,
        unit: formData.unit.trim(),
        imageUrl: formData.image,
        imageFile: formData.imageFile,
        imageFiles: formData.imageFiles || [],
        isActive: formData.isActive,
        taxRate: 0,
      };
      
      // Include parentCategoryId and subCategoryId in the update payload
      const parentCategoryId = formData.parentCategoryId ? Number(formData.parentCategoryId) : undefined;
      const subCategoryId = formData.subCategoryId ? Number(formData.subCategoryId) : undefined;
      await onUpdate(productId, { ...updatedProduct, parentCategoryId, subCategoryId } as any);
    }
  };

  if (loadingProduct) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="text-center py-8 text-slate-600">Loading product details...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center justify-center w-10 h-10 rounded-lg border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h2 className="text-2xl font-bold text-slate-800">
        Edit Product
      </h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sku" className="block text-sm font-medium text-slate-700 mb-1.5">
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="sku"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              inputMode="numeric"
              pattern="[0-9]*"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
            <p className="mt-1 text-xs text-slate-500">Enter numbers only</p>
            {errors.sku && (
              <p className="mt-1 text-xs text-red-600">{errors.sku}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1.5">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Enter product name"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="brand" className="block text-sm font-medium text-slate-700 mb-1.5">
              Brand
            </label>
            <input
              type="text"
              id="brand"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter brand name"
            />
          </div>

        </div>

        <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
          <div>
              <p className="text-sm font-semibold text-slate-800">Category <span className="text-red-500">*</span></p>
              <p className="text-xs text-slate-500">Choose or update the category for this product</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCategoryModal(true);
                setCategoryType('select');
                setParentType('select');
                setNewCategoryName('');
                setNewParentName('');
                // Prefill with existing values if available - ensure they're strings
                const parentId = formData.parentCategoryId || selectedParentId || '';
                const subId = formData.subCategoryId || formData.categoryId || '';
                setNewCategoryParentId(parentId ? String(parentId) : '');
                setNewSubCategoryId(subId ? String(subId) : '');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Add or update category"
            >
              + Add / Update
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-500">Selected</span>
              <span className="text-sm font-medium text-slate-800">
                {formData.subCategoryId 
                  ? categories.find(c => c.id === Number(formData.subCategoryId))?.name || formData.category || 'Subcategory'
                  : formData.category || 'None'}
              </span>
              {formData.parentCategoryId && (
                <span className="text-xs text-slate-500">
                  (Parent: {categories.find(c => c.id === Number(formData.parentCategoryId))?.name || 'Unknown'})
                </span>
              )}
            </div>
            {errors.category && (
              <p className="text-xs text-red-600">{errors.category}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1.5">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
            placeholder="Enter detailed product description"
            rows={4}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="cost" className="block text-sm font-medium text-slate-700 mb-1.5">
              Cost <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="cost"
              name="cost"
              value={formData.cost}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            {errors.cost && (
              <p className="mt-1 text-[11px] text-red-600">{errors.cost}</p>
            )}
          </div>

          <div>
            <label htmlFor="wholesalePrice" className="block text-sm font-medium text-slate-700 mb-1.5">
              Wholesale Price <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="wholesalePrice"
              name="wholesalePrice"
              value={formData.wholesalePrice}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            {errors.wholesalePrice && (
              <p className="mt-1 text-[11px] text-red-600">{errors.wholesalePrice}</p>
            )}
          </div>

          <div>
            <label htmlFor="price" className="block text-sm font-medium text-slate-700 mb-1.5">
              Price <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            {errors.price && (
              <p className="mt-1 text-[11px] text-red-600">{errors.price}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-slate-700 mb-1.5">
            Unit <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="unit"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="e.g., piece, kg, liter, box"
          />
          {errors.unit && (
            <p className="mt-1 text-xs text-red-600">{errors.unit}</p>
          )}
          </div>

        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
            Product is active
          </label>
        </div>

        <div>
          <label htmlFor="edit-image" className="block text-sm font-medium text-slate-700 mb-1.5">
            Product Images
          </label>
          <div className="space-y-3">
            {/* Existing Images Gallery */}
            {existingImages.length > 0 && (
              <div>
                <p className="text-xs text-slate-600 mb-2">Existing Images ({existingImages.length}):</p>
                <div className="grid grid-cols-4 gap-3">
                  {existingImages.map((img) => {
                    // Normalize URL on render exactly like ProductViewModal does
                    let displayUrl = img.url || null;
                    if (displayUrl && !displayUrl.startsWith('http') && productId) {
                      displayUrl = productsApi.normalizeImageUrl(displayUrl, productId);
                    }
                    // If still no URL, try to get from raw product data as fallback
                    if (!displayUrl || displayUrl.trim() === '') {
                      console.warn('No display URL for image:', { img, productId });
                    }
                    return (
                      <div key={img.id} className="relative group">
                        <AuthenticatedImage
                          src={displayUrl}
                          alt={`Product image ${img.id}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-slate-200"
                          fallbackIcon={
                            <div className="w-full h-24 bg-slate-100 border-2 border-slate-200 rounded-lg flex items-center justify-center">
                              <span className="text-xl">📦</span>
                            </div>
                          }
                        />
                        {img.isPrimary && (
                          <span className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">Primary</span>
                        )}
                        {!img.isPrimary && (
                          <button
                            type="button"
                            onClick={() => setPrimaryImage(img.id)}
                            disabled={settingPrimary === img.id || settingPrimary !== null}
                            className="absolute top-1 left-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white text-xs px-2 py-1 rounded transition-colors shadow-lg z-10 opacity-0 group-hover:opacity-100"
                            title="Set as primary image"
                          >
                            {settingPrimary === img.id ? '...' : 'Set Primary'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          disabled={deletingImage === img.id}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors shadow-lg z-10 opacity-0 group-hover:opacity-100"
                          title="Delete this image"
                        >
                          {deletingImage === img.id ? '...' : '×'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Upload New Images */}
            <div>
              <p className="text-xs text-slate-600 mb-2">Add New Images (You can select multiple):</p>
              <input
                type="file"
                id="edit-image"
                name="image"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                ref={imageInputRef}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                onClick={(e) => {
                  // Clear the input value to allow selecting the same files again
                  // This allows adding the same file multiple times if needed
                  if (e.currentTarget.value) {
                    e.currentTarget.value = '';
                  }
                }}
              />
              
              {/* Show all pending uploads */}
              {formData.imageFiles && formData.imageFiles.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-slate-600 mb-2">
                    Selected Images ({formData.imageFiles.length}) - These will be uploaded when you save:
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {formData.imageFiles.map((file, index) => {
                      const previewUrl = URL.createObjectURL(file);
                      return (
                        <div key={index} className="relative group">
                          <img
                            src={previewUrl}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border-2 border-blue-300"
                            onLoad={() => URL.revokeObjectURL(previewUrl)}
                          />
                          <button
                            type="button"
                            onClick={() => removePendingImage(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors shadow-lg z-10 opacity-0 group-hover:opacity-100"
                            title={`Remove ${file.name}`}
                          >
                            ×
                          </button>
                          <p className="text-xs text-slate-500 mt-1 truncate" title={file.name}>
                            {file.name}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          {errors.image && (
            <p className="mt-1 text-xs text-red-600">{errors.image}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Supported formats: JPG, PNG, GIF. Max size: 5MB per image. You can select multiple images at once using Ctrl+Click (Windows) or Cmd+Click (Mac).
          </p>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {loading ? 'Saving...' : 'Update Product'}
          </button>
          <button 
            type="button" 
            onClick={onCancel}
            className="px-6 py-2.5 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 font-medium rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </form>

      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Update Category</h3>
            <div className="space-y-4">
              {/* Parent Category Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Parent Category <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="parentType"
                      value="select"
                      checked={parentType === 'select'}
                      onChange={() => setParentType('select')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-slate-700">Select</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="parentType"
                      value="create"
                      checked={parentType === 'create'}
                      onChange={() => setParentType('create')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-slate-700">Create New</span>
                  </label>
                </div>

                {parentType === 'select' && (
                  <select
                    value={newCategoryParentId}
                    onChange={(e) => {
                      setNewCategoryParentId(e.target.value);
                      setNewSubCategoryId(''); // Reset subcategory when parent changes
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a parent category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
                    ))}
                  </select>
                )}

                {parentType === 'create' && (
                  <input
                    type="text"
                    value={newParentName}
                    onChange={(e) => setNewParentName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Parent category name"
                  />
                )}
              </div>

              {/* Subcategory Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Subcategory <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3 mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="categoryType"
                      value="select"
                      checked={categoryType === 'select'}
                      onChange={() => setCategoryType('select')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-slate-700">Select</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="categoryType"
                      value="create"
                      checked={categoryType === 'create'}
                      onChange={() => setCategoryType('create')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-slate-700">Create New</span>
                  </label>
                </div>

                {categoryType === 'select' && (
                  <select
                    value={newSubCategoryId}
                    onChange={(e) => setNewSubCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={parentType === 'select' && !newCategoryParentId}
                  >
                    <option value="">
                      {parentType === 'select' && !newCategoryParentId
                        ? 'Select a parent category first' 
                        : 'Select a subcategory'}
                    </option>
                    {(() => {
                      // Case 1: Select existing parent - show only its subcategories
                      if (parentType === 'select' && newCategoryParentId) {
                        const subcategories = categories.filter(
                          (cat) => cat.parentId === Number(newCategoryParentId)
                        );
                        if (subcategories.length === 0) {
                          return <option value="" disabled>No subcategories found for this parent</option>;
                        }
                        return subcategories.map((cat) => (
                          <option key={cat.id} value={String(cat.id)}>
                            {cat.name}
                          </option>
                        ));
                      }
                      // Case 2: Create new parent - show all categories (can select any existing subcategory)
                      // The selected subcategory will be used with the newly created parent
                      if (parentType === 'create') {
                        return categories.map((cat) => (
                          <option key={cat.id} value={String(cat.id)}>
                            {cat.name}
                          </option>
                        ));
                      }
                      return null;
                    })()}
                  </select>
                )}

                {categoryType === 'create' && (
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Subcategory name"
                  />
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCategoryModal(false);
                  setNewCategoryName('');
                  setNewCategoryParentId('');
                  setNewParentName('');
                  setNewSubCategoryId('');
                  setCategoryType('select');
                  setParentType('select');
                }}
                className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-md hover:bg-slate-50 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCategory}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProduct;
