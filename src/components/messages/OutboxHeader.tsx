import { Send, Plus } from "lucide-react";

interface OutboxHeaderProps {
  totalMessages: number;
  onCompose?: () => void;
}

export default function OutboxHeader({ totalMessages, onCompose }: OutboxHeaderProps) {
  return (
    <div className="mb-6">
      {/* Header - Not sticky to avoid covering dropdowns */}
      <div className="border-b border-indigo-200/50 bg-white/60 backdrop-blur-sm shadow-sm rounded-2xl px-6 py-4 mb-6">
        {/* Gradient accent line */}
        <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 -mx-6 mb-4 rounded-t-2xl"></div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-lg ring-2 ring-white/20">
              <Send className="h-6 w-6 text-white" />
            </div>
            
            {/* Title */}
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Outbox
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                {totalMessages} {totalMessages === 1 ? "message" : "messages"} sent
              </p>
            </div>
          </div>

          {/* Compose Button */}
          {onCompose && (
            <button
              onClick={onCompose}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Compose
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

