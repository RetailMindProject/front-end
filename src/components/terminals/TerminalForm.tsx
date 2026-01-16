import { useState } from "react";
import type { TerminalManagementResponse, CreateTerminalRequest, UpdateTerminalRequest } from "../../services/terminal.api";

interface TerminalFormProps {
  mode: 'create' | 'edit';
  onSubmit: (data: CreateTerminalRequest | UpdateTerminalRequest) => Promise<void>;
  initialData?: TerminalManagementResponse;
  onClose?: () => void;
}

export default function TerminalForm({ mode, onSubmit, initialData, onClose }: TerminalFormProps) {
  const [formData, setFormData] = useState({
    code: initialData?.code || "",
    description: initialData?.description || "",
    isActive: initialData?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof typeof formData, string>> = {};

    if (!formData.code.trim()) {
      newErrors.code = "Code is required";
    } else if (formData.code.trim().length < 2) {
      newErrors.code = "Code must be at least 2 characters";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.trim().length < 3) {
      newErrors.description = "Description must be at least 3 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'create') {
        await onSubmit({
          code: formData.code.trim(),
          description: formData.description.trim(),
        } as CreateTerminalRequest);
      } else {
        await onSubmit({
          code: formData.code.trim(),
          description: formData.description.trim(),
          isActive: formData.isActive,
        } as UpdateTerminalRequest);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Code Field */}
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-slate-300 mb-1">
          Code <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          id="code"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          className={`w-full px-3 py-2 rounded-lg bg-slate-800 border ${
            errors.code ? 'border-red-500' : 'border-slate-600'
          } text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
          placeholder="Enter terminal code (e.g., T001)"
          disabled={isSubmitting}
        />
        {errors.code && (
          <p className="mt-1 text-sm text-red-400">{errors.code}</p>
        )}
        <p className="mt-1 text-xs text-slate-400">
          Code must be unique
        </p>
      </div>

      {/* Description Field */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className={`w-full px-3 py-2 rounded-lg bg-slate-800 border ${
            errors.description ? 'border-red-500' : 'border-slate-600'
          } text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none`}
          placeholder="Enter terminal description"
          disabled={isSubmitting}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-400">{errors.description}</p>
        )}
      </div>

      {/* Active Status (only for edit mode) */}
      {mode === 'edit' && (
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
              disabled={isSubmitting}
            />
            <span className="text-sm font-medium text-slate-300">Active</span>
          </label>
          <p className="mt-1 text-xs text-slate-400">
            Uncheck to deactivate this terminal
          </p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Terminal' : 'Update Terminal'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

