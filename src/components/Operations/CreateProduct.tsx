import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  description: string;
  cost: number;
  price: number;
  wholesalePrice: number;
  unit: string;
  image: string | null;
}

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
  image: string | null;
}

interface FormErrors {
  [key: string]: string;
}

interface CreateProductProps {
  onAdd: (product: Product) => void;
  onCancel: () => void;
}

const CreateProduct = ({ onAdd, onCancel }: CreateProductProps) => {
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
    image: null
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({
          ...prev,
          image: 'Please select a valid image file'
        }));
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          image: 'Image size must be less than 5MB'
        }));
        return;
      }

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
      reader.readAsDataURL(file);

      if (errors.image) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.image;
          return newErrors;
        });
      }
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null
    }));
    setImagePreview(null);
    const fileInput = document.getElementById('image') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.id.trim()) {
      newErrors.id = 'Product ID is required';
    }
    
    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    
    if (!formData.price || isNaN(Number(formData.price)) || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Please enter a valid price';
    }
    
    if (formData.cost && (isNaN(Number(formData.cost)) || parseFloat(formData.cost) < 0)) {
      newErrors.cost = 'Please enter a valid cost';
    }
    
    if (formData.wholesalePrice && (isNaN(Number(formData.wholesalePrice)) || parseFloat(formData.wholesalePrice) < 0)) {
      newErrors.wholesalePrice = 'Please enter a valid wholesale price';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Product description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (validateForm()) {
      const product: Product = {
        id: formData.id.trim(),
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        brand: formData.brand.trim(),
        description: formData.description.trim(),
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        price: parseFloat(formData.price),
        wholesalePrice: formData.wholesalePrice ? parseFloat(formData.wholesalePrice) : 0,
        unit: formData.unit.trim(),
        image: formData.image
      };
      
      onAdd(product);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        Create New Product
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="id" className="block text-sm font-medium text-slate-700 mb-1.5">
              ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="id"
              name="id"
              value={formData.id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter product ID"
            />
            {errors.id && (
              <p className="mt-1 text-xs text-red-600">{errors.id}</p>
            )}
          </div>

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

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1.5">
            Description <span className="text-red-500">*</span>
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
              Cost
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
              Wholesale Price
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

        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-slate-700 mb-1.5">
            Unit
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
        </div>

        <div>
          <label htmlFor="image" className="block text-sm font-medium text-slate-700 mb-1.5">
            Product Image
          </label>
          <div className="space-y-3">
            <input
              type="file"
              id="image"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm"
            />
            {imagePreview && (
              <div className="relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="w-32 h-32 object-cover rounded-lg border-2 border-slate-200"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-sm font-bold transition-colors shadow-lg"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          {errors.image && (
            <p className="mt-1 text-xs text-red-600">{errors.image}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Supported formats: JPG, PNG, GIF. Max size: 5MB
          </p>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <button 
            type="submit" 
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create Product
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
    </div>
  );
};

export default CreateProduct;
