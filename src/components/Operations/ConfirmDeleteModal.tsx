interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
  message?: string;
}

const ConfirmDeleteModal = ({ isOpen, onClose, onConfirm, productName, message }: ConfirmDeleteModalProps) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold text-red-600">
            Confirm Removal
          </h2>
          <button 
            className="text-slate-400 hover:text-slate-600 transition-colors text-2xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div className="px-6 py-6">
          <p className="text-base text-slate-700 mb-3 leading-relaxed">
            {message || `Are you sure you want to remove "${productName}"?`}
          </p>
          <p className="text-sm text-slate-500">
            This action cannot be undone.
          </p>
        </div>
        
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-slate-50/50">
          <button 
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-lg transition-colors min-w-[80px]"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors min-w-[80px]"
            onClick={onConfirm}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
