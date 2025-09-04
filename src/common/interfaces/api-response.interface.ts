export interface ApiResponse<T = any> {
  errCode: string;
  reason: string;
  result: 'SUCCESS' | 'ERROR';
  data?: T;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ErrorResponse {
  errCode: string;
  reason: string;
  result: 'ERROR';
  timestamp: string;
  path: string;
  method: string;
}
