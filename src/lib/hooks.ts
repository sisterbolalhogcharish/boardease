import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'

/* ------------------------------- Queries -------------------------- */
export function useHouses(filters?: api.SearchFilters, sort?: api.SortKey) {
  return useQuery({
    queryKey: ['houses', filters, sort],
    queryFn: () => api.getHouses(filters, sort),
  })
}

export function useFeaturedHouses() {
  return useQuery({ queryKey: ['featured'], queryFn: api.getFeaturedHouses })
}

export function useHouse(id: string | undefined) {
  return useQuery({ queryKey: ['house', id], queryFn: () => api.getHouse(id!), enabled: !!id })
}

export function useSimilarHouses(id: string | undefined) {
  return useQuery({ queryKey: ['similar', id], queryFn: () => api.getSimilarHouses(id!), enabled: !!id })
}

export function useLocations() {
  return useQuery({ queryKey: ['locations'], queryFn: api.getLocations })
}

export function useReviews(houseId?: string) {
  return useQuery({ queryKey: ['reviews', houseId], queryFn: () => api.getReviews(houseId) })
}

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: api.getDashboardOverview })
}

export function useAnalytics() {
  return useQuery({ queryKey: ['analytics'], queryFn: api.getAnalytics })
}

export function usePayments(opts?: { status?: string; month?: string; q?: string }) {
  return useQuery({
    queryKey: ['payments', opts],
    queryFn: () => api.getPayments(opts as { status?: never; month?: string; q?: string } | undefined),
  })
}

export function usePaymentMonths() {
  return useQuery({ queryKey: ['payment-months'], queryFn: api.getPaymentMonths })
}

export function useBoarders(opts?: { q?: string; gender?: 'male' | 'female'; roomId?: string }) {
  return useQuery({ queryKey: ['boarders', opts], queryFn: () => api.getBoarders(opts) })
}

export function useRooms() {
  return useQuery({ queryKey: ['rooms'], queryFn: api.getRooms })
}

export function useRoomStatus() {
  return useQuery({ queryKey: ['room-status'], queryFn: api.getRooms })
}

export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: api.getNotifications })
}

export function useSubscription() {
  return useQuery({ queryKey: ['subscription'], queryFn: api.getSubscription })
}

export function useAssistant() {
  return useMutation({
    mutationFn: (question: string) => api.askAssistant(question),
  })
}

/* ------------------------------ Mutations ------------------------- */
export function useMarkPaymentPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, method }: { id: string; method: string }) => api.markPaymentPaid(id, method),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useAddRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof api.addRoom>[0]) => api.addRoom(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['room-status'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['houses'] })
    },
  })
}

export function useDeleteRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteRoom(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['room-status'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['houses'] })
    },
  })
}

export function useUpdateRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.updateRoom>[1] }) => api.updateRoom(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['room-status'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['houses'] })
    },
  })
}

export function useAddBoarder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof api.addBoarder>[0]) => api.addBoarder(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boarders'] })
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['room-status'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useRemoveBoarder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.removeBoarder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boarders'] })
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['room-status'] })
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['needs-attention'] })
    },
  })
}

export function useNeedsAttention() {
  return useQuery({ queryKey: ['needs-attention'], queryFn: async () => {
    const payments = await api.getPayments({ status: 'overdue' })
    const pending = await api.getPayments({ status: 'pending' })
    return [...payments, ...pending].map(p => ({
      id: p.id, name: p.boarderName, roomNo: p.roomNo,
      amount: p.amount, status: p.status as 'overdue' | 'pending',
    })).sort((a, b) => (a.status === 'overdue' ? -1 : 1) - (b.status === 'overdue' ? -1 : 1))
  }})
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.markNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
