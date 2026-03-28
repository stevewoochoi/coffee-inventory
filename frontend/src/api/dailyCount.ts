import apiClient from './client'

export interface ItemCountRow {
  itemId: number
  itemName: string
  itemNameJa: string
  baseUnit: string
  stockUnit: string
  currentSystemQty: number
  dailyCounts: Record<number, number>
  systemQties: Record<number, number>
  varianceQties: Record<number, number>
  appliedFlags: Record<number, boolean>
}

export interface MonthlyResponse {
  year: number
  month: number
  rows: ItemCountRow[]
}

export interface SaveRequest {
  itemId: number
  countDate: string  // YYYY-MM-DD
  qty: number
  memo?: string
}

export interface SaveResponse {
  id: number
  itemId: number
  countDate: string
  qty: number
  systemQty: number
  varianceQty: number
  isApplied: boolean
  updatedAt: string
}

export const getMonthlyCount = async (storeId: number, year: number, month: number) => {
  const res = await apiClient.get<{ data: MonthlyResponse }>('/daily-counts/monthly', {
    params: { storeId, year, month }
  })
  return res.data.data
}

export const saveDailyCount = async (request: SaveRequest, storeId?: number) => {
  const res = await apiClient.put<{ data: SaveResponse }>('/daily-counts', request, {
    params: storeId ? { storeId } : undefined
  })
  return res.data.data
}
