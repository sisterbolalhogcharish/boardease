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

export function useNotifications(userId?: string) {
  return useQuery({ queryKey: ['notifications', userId], queryFn: () => api.getNotifications(userId) })
}

/* ---------------------- Boarder-side queries ---------------------- */
export function useAccommodation(userId?: string) {
  return useQuery({
    queryKey: ['accommodation', userId],
    queryFn: () => api.getAccommodation(userId!),
    enabled: !!userId,
  })
}

export function useBoarderPayments(userId?: string) {
  return useQuery({
    queryKey: ['boarder-payments', userId],
    queryFn: () => api.getBoarderPayments(userId!),
    enabled: !!userId,
  })
}

export function useBoarderReviews(userId?: string) {
  return useQuery({
    queryKey: ['boarder-reviews', userId],
    queryFn: () => api.getBoarderReviews(userId!),
    enabled: !!userId,
  })
}

export function useBoarderProfile(userId?: string) {
  return useQuery({
    queryKey: ['boarder-profile', userId],
    queryFn: () => api.getBoarderProfile(userId!),
    enabled: !!userId,
  })
}

export function useFavorites(userId?: string) {
  return useQuery({
    queryKey: ['favorites', userId],
    queryFn: () => api.getFavorites(userId!),
    enabled: !!userId,
  })
}

export function usePublicRooms(houseId?: string) {
  return useQuery({
    queryKey: ['public-rooms', houseId],
    queryFn: () => api.getPublicRooms(houseId!),
    enabled: !!houseId,
  })
}

export function useReservations(userId?: string) {
  return useQuery({
    queryKey: ['reservations', userId],
    queryFn: () => api.getReservations(userId!),
    enabled: !!userId,
  })
}

export function useOwnerReservations(ownerId?: string) {
  return useQuery({
    queryKey: ['owner-reservations', ownerId],
    queryFn: () => api.getOwnerReservations(ownerId!),
    enabled: !!ownerId,
  })
}

export function useConversations(userId?: string) {
  return useQuery({
    queryKey: ['conversations', userId],
    queryFn: () => api.getConversations(userId!),
    enabled: !!userId,
  })
}

export function useConversationThread(id?: string, userId?: string) {
  return useQuery({
    queryKey: ['conversation', id, userId],
    queryFn: () => api.getConversationThread(id!, userId!),
    enabled: !!id && !!userId,
  })
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
    mutationFn: (userId?: string) => api.markNotificationsRead(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

/* --------------------- Boarder-side mutations --------------------- */
export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) => api.markNotificationRead(id, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useToggleFavorite(userId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ houseId, favorited }: { houseId: string; favorited: boolean }) =>
      favorited ? api.removeFavorite(userId!, houseId) : api.addFavorite(userId!, houseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites', userId] })
      qc.invalidateQueries({ queryKey: ['favorites'] })
    },
  })
}

export function useSaveReview(userId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof api.saveReview>[0]) => api.saveReview(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['boarder-reviews', userId] })
      qc.invalidateQueries({ queryKey: ['reviews', variables.houseId] })
      qc.invalidateQueries({ queryKey: ['house', variables.houseId] })
      qc.invalidateQueries({ queryKey: ['houses'] })
    },
  })
}

export function useUpdateProfile(userId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Parameters<typeof api.updateBoarderProfile>[0]) => api.updateBoarderProfile(patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boarder-profile', userId] }),
  })
}

export function useCreateReservation(userId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof api.createReservation>[0]) => api.createReservation(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations', userId] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useCancelReservation(userId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.cancelReservation(id, userId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations', userId] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useRespondToReservation(ownerId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, response }: { id: string; status: 'approved' | 'declined'; response?: string }) =>
      api.respondToReservation(id, ownerId!, status, response),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-reservations', ownerId] })
      qc.invalidateQueries({ queryKey: ['accommodation'] })
      qc.invalidateQueries({ queryKey: ['reservations'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useStartConversation(userId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof api.startConversation>[0]) => api.startConversation(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations', userId] }),
  })
}

export function useSendMessage(userId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ conversationId, body }: { conversationId: string; body: string }) =>
      api.sendMessage(conversationId, userId!, body),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['conversation', variables.conversationId, userId] })
      qc.invalidateQueries({ queryKey: ['conversations', userId] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkConversationRead(userId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (conversationId: string) => api.markConversationRead(conversationId, userId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations', userId] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
