import { useState, useMemo, useEffect } from "react";
import { Plus, Search, X } from "lucide-react";
import { Card } from "../components";
import PageHeader from "../components/PageHeader";
import TerminalsTable from "../components/terminals/TerminalsTable";
import TerminalModal from "../components/terminals/TerminalModal";
import { terminalApi, type TerminalManagementResponse, type CreateTerminalRequest, type UpdateTerminalRequest } from "../services/terminal.api";
import { sessionsApi } from "../services/sessions.api";

export default function TerminalsManagement() {
  const [terminals, setTerminals] = useState<TerminalManagementResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<TerminalManagementResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  useEffect(() => {
    loadTerminals();
    // Refresh terminals every 10 seconds to keep Active Session status up to date
    const interval = setInterval(loadTerminals, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadTerminals = async () => {
    setLoading(true);
    setError(null);

    // Fetch terminals and active sessions in parallel
    const [terminalsResult, activeSessionsResult] = await Promise.all([
      terminalApi.getAllTerminals(),
      sessionsApi.fetchActiveSessions()
    ]);

    if (terminalsResult.error) {
      setError(terminalsResult.error);
      setTerminals([]);
      setLoading(false);
      return;
    }

    if (!terminalsResult.data) {
      setTerminals([]);
      setLoading(false);
      return;
    }

    // Create a map of terminal IDs that have active sessions
    const terminalsWithActiveSessions = new Set<number>();
    
    // Use available terminals endpoint to get hasActiveSession
    // This endpoint correctly returns hasActiveSession for all terminals it returns
    const terminalSessionStatusMap = new Map<number, boolean>();
    try {
      const availableTerminalsResult = await terminalApi.getAvailableTerminals();
      if (availableTerminalsResult.data) {
        // Available terminals endpoint returns terminals with correct hasActiveSession
        // Note: It may filter some terminals, but it provides accurate session status
        availableTerminalsResult.data.forEach(terminal => {
          terminalSessionStatusMap.set(terminal.id, terminal.hasActiveSession);
        });
      }
    } catch (err) {
      console.warn("Could not fetch available terminals for session status:", err);
    }
    
    // For terminals with active sessions, we need to identify them
    // If a terminal is active but not in available terminals, it might have an active session
    // However, the most reliable way is to use the backend's hasActiveSession value if provided
    // Since available terminals only includes terminals without active sessions (or inactive),
    // terminals with active sessions won't be in that list

    // Enrich terminals with active session status
    const enrichedTerminals = terminalsResult.data.map(terminal => {
      // Priority for determining hasActiveSession:
      // 1. Use session status from available terminals if terminal is in that list
      // 2. Use backend-provided hasActiveSession if explicitly set
      // 3. For active terminals not in available list: likely has active session (but not certain)
      // 4. Default to false
      
      let hasActiveSession = false;
      
      if (terminalSessionStatusMap.has(terminal.id)) {
        // Terminal is in available terminals list - use its hasActiveSession value
        hasActiveSession = terminalSessionStatusMap.get(terminal.id)!;
      } else if (terminal.hasActiveSession !== undefined && terminal.hasActiveSession !== null) {
        // Backend provided hasActiveSession - use it
        hasActiveSession = terminal.hasActiveSession;
      } else if (terminal.isActive) {
        // Terminal is active but not in available list
        // This could mean it has an active session, but we can't be certain
        // So we'll default to false unless backend says otherwise
        // Note: This is a limitation - ideally backend should provide this
        hasActiveSession = false;
      }
      
      return {
        ...terminal,
        hasActiveSession
      };
    });

    setTerminals(enrichedTerminals);
    setLoading(false);
  };

  // Filter terminals
  const filteredTerminals = useMemo(() => {
    return terminals.filter(terminal => {
      const matchesSearch = searchTerm === '' || 
        terminal.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        terminal.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || 
        (statusFilter === 'ACTIVE' && terminal.isActive) ||
        (statusFilter === 'INACTIVE' && !terminal.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [terminals, searchTerm, statusFilter]);

  const handleCreate = async (data: CreateTerminalRequest | UpdateTerminalRequest) => {
    setError(null);
    
    const result = await terminalApi.createTerminal(data as CreateTerminalRequest);

    if (result.error) {
      setError(result.error);
      return;
    }

    setShowModal(false);
    await loadTerminals();
  };

  const handleEdit = async (data: CreateTerminalRequest | UpdateTerminalRequest) => {
    if (!editingTerminal) {
      console.error("No editing terminal found");
      return;
    }
    
    setError(null);
    
    const result = await terminalApi.updateTerminal(editingTerminal.id, data as UpdateTerminalRequest);

    if (result.error) {
      setError(result.error);
      return;
    }

    setShowModal(false);
    setEditingTerminal(null);
    await loadTerminals();
  };

  const handleToggleStatus = async (terminal: TerminalManagementResponse) => {
    console.log('handleToggleStatus called for terminal:', terminal);
    const action = terminal.isActive ? 'deactivate' : 'activate';
    const newStatus = !terminal.isActive;
    
    if (!confirm(`Are you sure you want to ${action} terminal "${terminal.code}"?`)) {
      console.log('User cancelled the action');
      return;
    }

    console.log(`Proceeding to ${action} terminal ${terminal.id} to status: ${newStatus}`);
    setError(null);
    
    // Optimistically update UI
    setTerminals(terminals.map(t => 
      t.id === terminal.id ? { ...t, isActive: newStatus } : t
    ));

    let result;
    
    // If activating, use the activate endpoint
    // If deactivating, use updateTerminal with isActive: false
    if (newStatus) {
      // Activate using the activate endpoint
      result = await terminalApi.toggleTerminalStatus(terminal.id);
    } else {
      // Deactivate using updateTerminal
      result = await terminalApi.updateTerminal(terminal.id, {
        code: terminal.code,
        description: terminal.description,
        isActive: false,
      });
    }
    
    console.log('Toggle status result:', result);

    if (result.error) {
      console.error('Error toggling status:', result.error);
      // Revert optimistic update on error
      setTerminals(terminals.map(t => 
        t.id === terminal.id ? { ...t, isActive: terminal.isActive } : t
      ));
      setError(result.error);
      return;
    }

    // Update with server response
    if (result.data) {
      console.log('Status updated successfully:', result.data);
      setTerminals(terminals.map(t => 
        t.id === terminal.id ? result.data! : t
      ));
    } else {
      console.log('No data in response, reloading terminals');
      // Reload all terminals if response doesn't have data
      await loadTerminals();
    }
  };

  const handleEditClick = (terminal: TerminalManagementResponse) => {
    setEditingTerminal(terminal);
    setShowModal(true);
  };

  const handleCreateClick = () => {
    setEditingTerminal(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTerminal(null);
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Terminals"
        icon={<span className="text-2xl">🖥️</span>}
        right={
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-all duration-200 text-sm font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Add Terminal
          </button>
        }
      />

      {/* Filters */}
      <div className="mb-6">
        <Card padded>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by code or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        </Card>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <Card padded>
        {loading ? (
          <div className="py-8 text-center text-gray-500 text-sm">
            Loading terminals...
          </div>
        ) : (
          <TerminalsTable
            terminals={filteredTerminals}
            onEdit={handleEditClick}
            onToggleStatus={handleToggleStatus}
          />
        )}
      </Card>

      {/* Create/Edit Modal */}
      <TerminalModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSave={editingTerminal ? handleEdit : handleCreate}
        mode={editingTerminal ? 'edit' : 'create'}
        terminal={editingTerminal}
      />

    </div>
  );
}

