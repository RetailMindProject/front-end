import { useState, useMemo, useEffect } from "react";
import { Plus, Search, X } from "lucide-react";
import { Card } from "../components";
import TerminalsTable from "../components/terminals/TerminalsTable";
import TerminalModal from "../components/terminals/TerminalModal";
import { terminalApi, type TerminalManagementResponse, type CreateTerminalRequest, type UpdateTerminalRequest } from "../services/terminal.api";

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
  }, []);

  const loadTerminals = async () => {
    setLoading(true);
    setError(null);

    const result = await terminalApi.getAllTerminals();

    if (result.error) {
      setError(result.error);
      setTerminals([]);
    } else if (result.data) {
      setTerminals(result.data);
    }

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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Terminals Management</h1>
          <p className="text-gray-600 mt-1">View and manage all terminals</p>
        </div>
        <button
          onClick={handleCreateClick}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add New Terminal
        </button>
      </div>

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

