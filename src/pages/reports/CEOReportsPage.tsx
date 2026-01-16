import { useState, useEffect } from 'react';
import { FileText, Package, Trash2, Activity } from 'lucide-react';
import SalesReportTab from './tabs/SalesReportTab';
import InventoryReportTab from './tabs/InventoryReportTab';
import WasteReportTab from './tabs/WasteReportTab';
import OperationalReportTab from './tabs/OperationalReportTab';

type ReportTab = 'sales' | 'inventory' | 'waste' | 'operational';

export default function CEOReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');

  const tabs = [
    { id: 'sales' as ReportTab, label: 'Sales Reports', icon: <FileText className="w-4 h-4" /> },
    { id: 'inventory' as ReportTab, label: 'Inventory Reports', icon: <Package className="w-4 h-4" /> },
    { id: 'waste' as ReportTab, label: 'Waste Reports', icon: <Trash2 className="w-4 h-4" /> },
    { id: 'operational' as ReportTab, label: 'Operational Reports', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
          <p className="text-sm text-slate-600 mt-1">Comprehensive business reports and analytics</p>
        </div>

        {/* Tabs */}
        <div className="px-6 border-t border-slate-200">
          <div className="flex gap-2 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'sales' && <SalesReportTab />}
        {activeTab === 'inventory' && <InventoryReportTab />}
        {activeTab === 'waste' && <WasteReportTab />}
        {activeTab === 'operational' && <OperationalReportTab />}
      </div>
    </div>
  );
}

