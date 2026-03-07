import { useState, useRef, useEffect } from "react";
import { X, Send, MessageSquare, Loader2 } from "lucide-react";
import { useChat } from "../../hooks/useChat";
import { customerApi } from "../../services/customer.api";
import { getCurrentToken, clearAllTokens } from "../../services/tokens";
import { useNavigate } from "react-router-dom";

// Maximum message length (reasonable limit for chat input)
const MAX_MESSAGE_LENGTH = 2000;

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const { messages, loading, sendMessage, clearMessages, isRateLimited, rateLimitCountdown, error: chatError } = useChat();
  const [input, setInput] = useState("");
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [checkingToken, setCheckingToken] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  // Check token validity when panel opens
  useEffect(() => {
    if (isOpen) {
      checkTokenValidity();
    }
  }, [isOpen]);

  const checkTokenValidity = async () => {
    const token = getCurrentToken();
    if (!token) {
      setTokenValid(false);
      return;
    }

    setCheckingToken(true);
    try {
      const result = await customerApi.introspect();
      if (result.data?.valid) {
        setTokenValid(true);
        // Focus input after a short delay to ensure it's rendered
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 100);
      } else {
        setTokenValid(false);
        clearAllTokens();
        navigate("/login");
      }
    } catch (error) {
      setTokenValid(false);
    } finally {
      setCheckingToken(false);
    }
  };

  // Keyboard navigation: Esc to close, Shift+Enter for new line
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle authentication errors (401/403) - redirect to login
  useEffect(() => {
    if (chatError && (chatError.includes("session has expired") || chatError.includes("Unauthorized") || chatError.includes("Forbidden"))) {
      // Check if any recent message indicates auth error
      const hasAuthError = messages.some(
        (msg) => msg.role === "assistant" && 
        (msg.text.includes("session has expired") || msg.text.includes("Unauthorized") || msg.text.includes("Forbidden"))
      );
      
      if (hasAuthError) {
        clearAllTokens();
        navigate("/login");
      }
    }
  }, [chatError, messages, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || isRateLimited || !tokenValid) return;

    // Validate input length
    if (input.length > MAX_MESSAGE_LENGTH) {
      setInputError(`Message must be ${MAX_MESSAGE_LENGTH} characters or less.`);
      return;
    }

    if (input.trim().length === 0) {
      setInputError("Please enter a message.");
      return;
    }

    setInputError(null);
    const text = input;
    setInput("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift+Enter for new line, Enter to send
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed bottom-4 right-4 w-full max-w-md h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200"
      role="dialog"
      aria-label="AI Shopping Assistant Chat"
      aria-modal="false"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-[#2563eb] text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-semibold">AI Shopping Assistant</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Close chat"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {checkingToken ? (
          <div className="text-center text-gray-500 py-8">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-gray-400" />
            <p>Verifying session...</p>
          </div>
        ) : !tokenValid ? (
          <div className="text-center text-gray-500 py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p className="mb-2">Your session has expired.</p>
            <p className="text-sm">Please log in again to use the chat assistant.</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p className="mb-4">Hi! I'm your shopping assistant. Ask me anything about our products!</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              <button
                onClick={() => sendMessage("What's on sale today?")}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
              >
                What's on sale today?
              </button>
              <button
                onClick={() => sendMessage("Find me a laptop under $800")}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
              >
                Find me a laptop under $800
              </button>
              <button
                onClick={() => sendMessage("Do you have wireless earbuds?")}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
              >
                Do you have wireless earbuds?
              </button>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-[#2563eb] text-white"
                    : "bg-white text-gray-900 border border-gray-200"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (inputError) setInputError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask about products... (Shift+Enter for new line)"
            disabled={loading || isRateLimited || !tokenValid}
            maxLength={MAX_MESSAGE_LENGTH}
            rows={1}
            aria-label="Chat with shopping assistant"
            aria-invalid={!!inputError}
            aria-describedby={inputError ? "input-error" : undefined}
            className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent disabled:bg-gray-100 resize-none min-h-[40px] max-h-[120px] ${
              inputError ? "border-red-300" : "border-gray-300"
            }`}
            style={{ height: "auto" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading || isRateLimited || input.length > MAX_MESSAGE_LENGTH || !tokenValid}
            aria-label="Send message"
            className="px-4 py-2 bg-[#2563eb] text-white rounded-lg hover:bg-[#1d4ed8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-label="Sending" />
            ) : isRateLimited ? (
              <span className="text-xs">Wait {rateLimitCountdown}s</span>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        {(inputError || chatError) && (
          <div className="mt-2 text-xs text-red-600" id="input-error" role="alert">
            {inputError || chatError}
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${input.length > MAX_MESSAGE_LENGTH * 0.9 ? "text-orange-600" : "text-gray-500"}`}>
            {input.length}/{MAX_MESSAGE_LENGTH} characters
          </span>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearMessages}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear chat
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

