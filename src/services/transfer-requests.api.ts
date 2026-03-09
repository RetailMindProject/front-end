import { type ApiResponse, inventoryManagerApiClient, storeManagerApiClient } from "./api.client";

export type TransferRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface TransferRequestItemDTO {
  productId: number;
  quantity: number;
}

export interface TransferRequestDTO {
  requestId: number;
  status: TransferRequestStatus;
  requestedAt: string;
  requesterName?: string;
  items?: TransferRequestItemDTO[];
  note?: string;
}

export interface CreateTransferRequestDTO {
  storeId?: number;
  items: Array<{
    productId: number;
    quantity: number;
  }>;
}

export const transferRequestsApi = {
    async createRequest(dto: CreateTransferRequestDTO): Promise<ApiResponse<TransferRequestDTO>> {
        return storeManagerApiClient.post<TransferRequestDTO>(
            "/api/inventory/transfer-requests",
            {
              fromLocation: "WAREHOUSE",
              toLocation: "STORE",
              items: dto.items,
            }
          );
    },
  
    async getPending(): Promise<ApiResponse<TransferRequestDTO[]>> {
      return inventoryManagerApiClient.get<TransferRequestDTO[]>(
        "/api/inventory/transfer-requests?status=PENDING"
      );
    },
  
    async getById(requestId: number): Promise<ApiResponse<TransferRequestDTO>> {
      return inventoryManagerApiClient.get<TransferRequestDTO>(
        `/api/inventory/transfer-requests/${requestId}`
      );
    },
  
    async approve(requestId: number): Promise<ApiResponse<TransferRequestDTO>> {
      return inventoryManagerApiClient.post<TransferRequestDTO>(
        `/api/inventory/transfer-requests/${requestId}/approve`
      );
    },
  
    async reject(requestId: number, reason?: string): Promise<ApiResponse<TransferRequestDTO>> {
      return inventoryManagerApiClient.post<TransferRequestDTO>(
        `/api/inventory/transfer-requests/${requestId}/reject`,
        reason ? { reason } : {}
      );
    },
  };

