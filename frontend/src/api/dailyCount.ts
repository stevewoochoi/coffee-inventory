import apiClient from './client'

export interface ItemCountRow {
  itemId: number
  itemName: string
  itemNameJa: string
  dailyCounts: Record<number, number>
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
  updatedAt: string
}

export const getMonthlyCount = async (storeId: number, year: number, month: number) => {
  const res = await apiClient.get<{ data: MonthlyResponse }>('/daily-counts/monthly', {
    params: { storeId, year, month }
  })
  return res.data.data
}

export const saveDailyCount = async (request: SaveRequest) => {
  const res = await apiClient.put<{ data: SaveResponse }>('/daily-counts', request)
  return res.data.data
}
