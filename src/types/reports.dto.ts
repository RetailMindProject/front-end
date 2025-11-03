export type ReportFilters = {
  dateFrom: string; dateTo: string;
  categoryIds: string[]; brandIds: string[]; productIds: string[];
  paymentMethods: string[]; cashierIds: string[]; shiftIds: string[];
  customerSegments: string[]; netMode: boolean; includeDiscounts: boolean;
};

export type KpiItem = {
  id: string; label: string; value: string | number; delta?: number; help?: string;
};

export type SalesRow = {
  date: string; invoiceId: string; cashier: string;
  itemsCount: number; subtotal: number; discount: number; tax: number; total: number;
  paymentMethod: string; customer?: string;
};


