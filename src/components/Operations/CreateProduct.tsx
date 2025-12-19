import { useState, useEffect } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { ProductCreateDTO, CategoryDTO } from '../../services/products.api';
import { productsApi } from '../../services/products.api';

interface FormData {
  sku: string;
  name: string;
  brand: string;
  description: string;
  cost: string;
  price: string;
  wholesalePrice: string;
  unit: string;
  quantity: string; // Initial warehouse quantity
  image: string | null;
  imageFile: File | null; // Store the actual file for upload (backward compatibility)
  imageFiles: File[]; // Store multiple files for upload
  category: string; // category name for display
  categoryId: string; // category ID for API (deprecated, keeping for backward compatibility)
  parentCategoryId: string; // Parent category ID
  subCategoryId: string; // Subcategory ID
  imageMimeType?: string;
  imageName?: string;
  isActive: boolean; // Product active status
}

interface FormErrors {
  [key: string]: string;
}

type CreateProductInput = ProductCreateDTO & { imageMimeType?: string; imageTitle?: string; categoryId?: string | number; quantity?: number; imageFile?: File | null; imageUrl?: string | null };

interface CreateProductProps {
  onAdd: (product: CreateProductInput) => Promise<void> | void;
  onCancel: () => void;
  loading?: boolean;
}

const CreateProduct = ({ onAdd, onCancel, loading = false }: CreateProductProps) => {
  const [formData, setFormData] = useState<FormData>({
    sku: '',
    name: '',
    brand: '',
    description: '',
    cost: '',
    price: '',
    wholesalePrice: '',
    unit: '',
    quantity: '0', // Default to 0
    image: null,
    imageFile: null,
    imageFiles: [],
    category: '',
    categoryId: '',
    parentCategoryId: '',
    subCategoryId: '',
    isActive: true // Default to active
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [_loadingCategories, setLoadingCategories] = useState(false);
const [showCategoryModal, setShowCategoryModal] = useState(false);
const [newCategoryName, setNewCategoryName] = useState('');
const [newCategoryParentId, setNewCategoryParentId] = useState<string>('');
const [newParentName, setNewParentName] = useState('');
const [newSubCategoryId, setNewSubCategoryId] = useState<string>(''); // For selecting existing subcategory
const [categoryType, setCategoryType] = useState<'select' | 'create'>('select'); // Radio button state for subcategory
const [parentType, setParentType] = useState<'select' | 'create'>('select'); // Radio button state for parent

  const refreshCategories = async (selectId?: number) => {
    setLoadingCategories(true);
    try {
      const res = await productsApi.getCategories();
      if (res.data) {
        setCategories(res.data);
        if (selectId) {
          const found = res.data.find(c => c.id === selectId);
          setFormData(prev => ({
            ...prev,
            categoryId: found ? String(found.id) : prev.categoryId,
            category: found ? found.name : prev.category,
          }));
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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (name === 'category') {
      if (value === '__add_category') {
        // Open modal, reset selection
        setShowCategoryModal(true);
        setFormData(prev => ({ ...prev, category: '', categoryId: '' }));
        return;
      }
      // Find the category ID when category name is selected
      const selectedCategory = categories.find(cat => cat.name === value);
      setFormData(prev => ({
        ...prev,
        category: value,
        categoryId: selectedCategory ? String(selectedCategory.id) : ''
      }));
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
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
        }));
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
          }));
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
        imageFile: newFiles[0] || null, // Keep first file for backward compatibility
        imageMimeType: newFiles[0]?.type,
        imageName: newFiles[0]?.name
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
        imageMimeType: newFiles[0]?.type,
        imageName: newFiles[0]?.name,
        image: newFiles.length > 0 ? prev.image : null
      };
    });
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // ID is not required for creation - backend generates it
    
    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    
    if (!formData.price || isNaN(Number(formData.price)) || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Please enter a valid price';
    }
    
    if (!formData.cost || isNaN(Number(formData.cost)) || parseFloat(formData.cost) < 0) {
      newErrors.cost = 'Please enter a valid cost';
    }
    
    if (!formData.wholesalePrice || isNaN(Number(formData.wholesalePrice)) || parseFloat(formData.wholesalePrice) < 0) {
      newErrors.wholesalePrice = 'Please enter a valid wholesale price';
    }
    
    // Description is optional, no validation needed
    
    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit is required';
    }
    
    if (!formData.parentCategoryId.trim() && !formData.subCategoryId.trim()) {
      newErrors.category = 'Parent category and subcategory are required';
    }
    if (!formData.subCategoryId.trim()) {
      newErrors.category = 'Subcategory is required';
    }
    
    if (formData.quantity && (isNaN(Number(formData.quantity)) || parseFloat(formData.quantity) < 0)) {
      newErrors.quantity = 'Please enter a valid quantity (0 or greater)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Get parentCategoryId: parent is now mandatory
      let finalParentId: number | undefined;
      if (formData.parentCategoryId.trim()) {
        finalParentId = Number(formData.parentCategoryId);
      } else {
        // Parent is mandatory, this should not happen if validation passed
        console.error('Parent category is required but not set');
        setErrors({ category: 'Parent category is required' });
        return;
      }

      // Build payload
      const payload: any = {
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        brand: formData.brand.trim() || undefined,
        description: formData.description.trim(),
        cost: parseFloat(formData.cost),
        price: parseFloat(formData.price),
        defaultCost: parseFloat(formData.cost),
        defaultPrice: parseFloat(formData.price),
        wholesalePrice: parseFloat(formData.wholesalePrice),
        unit: formData.unit.trim() || undefined,
        category: formData.category.trim(), // Keep for backward compatibility
        categoryIds: formData.categoryId ? [Number(formData.categoryId)] : undefined, // Send as array
        parentCategoryId: finalParentId, // Required by API
        subCategoryId: formData.subCategoryId ? Number(formData.subCategoryId) : undefined,
        isActive: formData.isActive,
        taxRate: 0,
      };
      
      console.log('Creating product with payload:', JSON.stringify(payload, null, 2));
      console.log('Parent Category ID:', finalParentId);
      console.log('Sub Category ID:', formData.subCategoryId);
      console.log('Form Data:', formData);
      
      await onAdd({
        ...payload,
        imageFile: formData.imageFile,
        imageFiles: formData.imageFiles || [],
        imageUrl: formData.image,
        imageMimeType: formData.imageMimeType,
        imageTitle: formData.imageName,
        quantity: formData.quantity ? parseFloat(formData.quantity) : 0
      });
    }
  };

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
          Create New Product
        </h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ID field removed - backend generates ID automatically */}

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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter SKU"
            />
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

        <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Category <span className="text-red-500">*</span></p>
              <p className="text-xs text-slate-500">Choose or add a category for this product</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowCategoryModal(true);
                setFormData(prev => ({ ...prev, category: '', categoryId: '', parentCategoryId: '', subCategoryId: '' }));
                setCategoryType('select');
                setParentType('select');
                setNewCategoryName('');
                setNewCategoryParentId('');
                setNewParentName('');
                setNewSubCategoryId('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Add or pick category"
            >
              + Add / Select
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-500">Selected</span>
              <span className="text-sm font-medium text-slate-800">
                {formData.subCategoryId 
                  ? categories.find(c => c.id === Number(formData.subCategoryId))?.name || 'Subcategory'
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
              <p className="mt-1 text-xs text-red-600">{errors.cost}</p>
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
              <p className="mt-1 text-xs text-red-600">{errors.wholesalePrice}</p>
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
              <p className="mt-1 text-xs text-red-600">{errors.price}</p>
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

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-slate-700 mb-1.5">
              Initial Warehouse Quantity
            </label>
            <input
              type="number"
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="0"
              step="1"
              min="0"
            />
            {errors.quantity && (
              <p className="mt-1 text-xs text-red-600">{errors.quantity}</p>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Initial stock quantity in warehouse
            </p>
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
          <label htmlFor="image" className="block text-sm font-medium text-slate-700 mb-1.5">
            Product Images
          </label>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-600 mb-2">Add New Images (You can select multiple):</p>
              <input
                type="file"
                id="image"
                name="image"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
                onClick={(e) => {
                  // Clear the input value to allow selecting the same files again
                  if (e.currentTarget.value) {
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
            
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
            {loading ? 'Saving...' : 'Create Product'}
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
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Add Category</h3>
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
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
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
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ));
                      }
                      // Case 2: Create new parent - show all categories (can select any existing subcategory)
                      // The selected subcategory will be used with the newly created parent
                      if (parentType === 'create') {
                        return categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
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

export default CreateProduct;
