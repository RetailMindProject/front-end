import { useState } from "react";
import { Settings } from "lucide-react";

interface RecommendationsControlsProps {
  topK: number;
  inStockOnly: boolean;
  candidateLimit: number;
  onTopKChange: (value: number) => void;
  onInStockOnlyChange: (value: boolean) => void;
  onCandidateLimitChange: (value: number) => void;
}

export default function RecommendationsControls({
  topK,
  inStockOnly,
  candidateLimit,
  onTopKChange,
  onInStockOnlyChange,
  onCandidateLimitChange,
}: RecommendationsControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Recommendation settings"
      >
        <Settings className="h-4 w-4" />
        <span>Settings</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recommendation Settings</h3>
            
            <div className="space-y-4">
              {/* TopK Selector */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Number of Recommendations
                </label>
                <select
                  value={topK}
                  onChange={(e) => onTopKChange(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                </select>
              </div>

              {/* In Stock Only Toggle */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => onInStockOnlyChange(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-gray-700">
                    Show only in-stock items
                  </span>
                </label>
              </div>

              {/* Candidate Limit (Advanced - Hidden by default, can be shown) */}
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium mb-2">
                  Advanced Settings
                </summary>
                <div className="mt-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Candidate Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="2000"
                    value={candidateLimit}
                    onChange={(e) => {
                      const value = Math.min(2000, Math.max(1, Number(e.target.value) || 500));
                      onCandidateLimitChange(value);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Higher values may improve recommendations but take longer
                  </p>
                </div>
              </details>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
