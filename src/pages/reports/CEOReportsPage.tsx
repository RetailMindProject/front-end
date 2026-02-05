import { useState } from 'react';
import { FileText, Package, Trash2, Activity } from 'lucide-react';
import SalesReportTab from './tabs/SalesReportTab';
import InventoryReportTab from './tabs/InventoryReportTab';
import WasteReportTab from './tabs/WasteReportTab';
import OperationalReportTab from './tabs/OperationalReportTab';
import PageHeader from "../../components/PageHeader";

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
      <PageHeader
        title="Reports"
        icon={<FileText className="h-6 w-6 text-white" />}
        right={
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white/70 text-slate-700 hover:bg-white hover:shadow-sm'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Tab Content */}
      <div className="p-6 pt-0">
        {activeTab === 'sales' && <SalesReportTab />}
        {activeTab === 'inventory' && <InventoryReportTab />}
        {activeTab === 'waste' && <WasteReportTab />}
        {activeTab === 'operational' && <OperationalReportTab />}
      </div>
    </div>
  );
}

