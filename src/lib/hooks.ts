import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import * as api from './api'
import { useLandlordHouse } from './landlordHouse'

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

/**
 * Warm the Explore (/search) cache the instant the user *hovers* the nav
 * link, so by the time the click lands and the page mounts the data is
 * already in memory — no skeleton flash, no spinner. This is the correct
 * way to make Explore feel instant; the earlier approach (baking a stale
 * array into a global) fought react-query's cache keys and never hit.
 */
export function usePrefetchSearch() {
  const qc = useQueryClient()
  return useCallback(() => {
    const key = ['houses', api.defaultSearchFilters(), 'recommended'] as const
    // Skip if fresh data is already cached (e.g. second hover).
    if (qc.getQueryData(key)) return
    void qc.prefetchQuery({ queryKey: key, queryFn: () => api.getHouses(api.defaultSearchFilters(), 'recommended'), staleTime: 30_000 })
  }, [qc])
}

export function useReviews(houseId?: string) {
  return useQuery({ queryKey: ['reviews', houseId], queryFn: () => api.getReviews(houseId) })
}

/* --------------------- Owner-scoped landlord reads ------------------ */
/*
 * These all pull the signed-in landlord's id from `LandlordHouseProvider` and
 * hand it to the API, which resolves their boarding house server-side. A
 * landlord with no house yet resolves to "nothing", so the console shows real
 * zeros instead of the seeded demo house.
 */

export function useDashboard() {
  const { userId, loading } = useLandlordHouse()
  return useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => api.getDashboardOverview({ userId }),
    enabled: !loading,
  })
}

export function useAnalytics() {
  const { userId, loading } = useLandlordHouse()
  return useQuery({
    queryKey: ['analytics', userId],
    queryFn: () => api.getAnalytics({ userId }),
    enabled: !loading,
  })
}

export function usePayments(opts?: { status?: string; month?: string; q?: string }) {
  const { userId, loading } = useLandlordHouse()
  return useQuery({
    queryKey: ['payments', opts, userId],
    queryFn: () => api.getPayments({ ...(opts as { status?: never; month?: string; q?: string } | undefined), userId }),
    enabled: !loading,
  })
}

export function usePaymentMonths() {
  const { userId, loading } = useLandlordHouse()
  return useQuery({
    queryKey: ['payment-months', userId],
    queryFn: () => api.getPaymentMonths({ userId }),
    enabled: !loading,
  })
}

export function useBoarders(opts?: { q?: string; gender?: 'male' | 'female'; roomId?: string }) {
  const { userId, loading } = useLandlordHouse()
  return useQuery({
    queryKey: ['boarders', opts, userId],
    queryFn: () => api.getBoarders({ ...opts, userId }),
    enabled: !loading,
  })
}

export function useRooms() {
  const { userId, loading } = useLandlordHouse()
  return useQuery({
    queryKey: ['rooms', userId],
    queryFn: () => api.getRooms({ userId }),
    enabled: !loading,
  })
}

export function useRoomStatus() {
  const { userId, loading } = useLandlordHouse()
  return useQuery({
    queryKey: ['room-status', userId],
    queryFn: () => api.getRooms({ userId }),
    enabled: !loading,
  })
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

/** Unviewed-favorites count for the sidebar "Favorites [n]" badge. */
export function useUnviewedFavorites(userId?: string) {
  return useQuery({
    queryKey: ['favorites-unviewed', userId],
    queryFn: () => api.getUnviewedFavoritesCount(userId!),
    enabled: !!userId,
  })
}

/** Called when the boarder opens the Favorites page — clears the badge
 *  without touching the saved favorites themselves. */
export function useMarkFavoritesViewed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.markFavoritesViewed(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['favorites-unviewed'] }),
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
  // Scoped to the signed-in landlord. Without this the API always answered
  // "no plan", so a landlord could subscribe, have the admin approve it, and
  // still see every paid feature locked forever.
  const { userId } = useLandlordHouse()
  return useQuery({
    queryKey: ['subscription', userId],
    queryFn: () => api.getSubscription({ userId }),
  })
}

export function useAssistant() {
  return useMutation({
    mutationFn: (question: string) => api.askAssistant(question),
  })
}

/* ------------------ Subscription receipts & support ---------------- */

export function useSubscriptionReceipts() {
  const { userId } = useLandlordHouse()
  return useQuery({
    queryKey: ['subscription-receipts', userId],
    queryFn: () => api.getSubscriptionReceipts(userId!),
    enabled: !!userId,
  })
}

export function useSubmitSubscriptionReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof api.submitSubscriptionReceipt>[0]) => api.submitSubscriptionReceipt(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription-receipts'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useSupportMessages() {
  const { userId } = useLandlordHouse()
  return useQuery({
    queryKey: ['support-messages', userId],
    queryFn: () => api.getSupportMessages(userId!),
    enabled: !!userId,
  })
}

export function useSendSupportMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof api.sendSupportMessage>[0]) => api.sendSupportMessage(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support-messages'] }),
  })
}

/* --------------------------- Admin queries ------------------------- */

export function useAdminReceipts(status?: string) {
  return useQuery({ queryKey: ['admin-receipts', status], queryFn: () => api.getAdminReceipts(status) })
}

export function useReviewAdminReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: 'approved' | 'rejected'; notes?: string }) =>
      api.reviewAdminReceipt(id, status, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-receipts'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      qc.invalidateQueries({ queryKey: ['admin-landlords'] })
    },
  })
}

export function useAdminMessages() {
  return useQuery({ queryKey: ['admin-messages'], queryFn: api.getAdminMessages })
}

export function useReplyAdminMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) => api.replyAdminMessage(id, reply),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-messages'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })
}

/* -------------------- My Boarding House mutations ------------------ */

/** Invalidating `['landlord-house']` refreshes the console header, sidebar and
 *  the My Boarding House page in one go. */
function invalidateHouse(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['landlord-house'] })
  qc.invalidateQueries({ queryKey: ['houses'] })
  qc.invalidateQueries({ queryKey: ['featured'] })
  qc.invalidateQueries({ queryKey: ['locations'] })
}

export function useSaveLandlordHouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: api.LandlordHouseInput) => api.saveLandlordHouse(input),
    onSuccess: () => invalidateHouse(qc),
  })
}

export function useAddLandlordHouseImages() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, images }: { userId: number | string; images: string[] }) =>
      api.addLandlordHouseImages(userId, images),
    onSuccess: () => invalidateHouse(qc),
  })
}

export function useReorderLandlordHouseImages() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, ids }: { userId: number | string; ids: string[] }) =>
      api.reorderLandlordHouseImages(userId, ids),
    onSuccess: () => invalidateHouse(qc),
  })
}

export function useDeleteLandlordHouseImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, imageId }: { userId: number | string; imageId: string }) =>
      api.deleteLandlordHouseImage(userId, imageId),
    onSuccess: () => invalidateHouse(qc),
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
  // The Rooms form has no idea which property it belongs to — the API resolves
  // the house from the signed-in landlord instead.
  const { userId } = useLandlordHouse()
  return useMutation({
    mutationFn: (input: Parameters<typeof api.addRoom>[0]) => api.addRoom({ ...input, userId }),
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
  const { userId, loading } = useLandlordHouse()
  return useQuery({
    queryKey: ['needs-attention', userId],
    enabled: !loading,
    queryFn: async () => {
      const payments = await api.getPayments({ status: 'overdue', userId })
      const pending = await api.getPayments({ status: 'pending', userId })
      return [...payments, ...pending].map(p => ({
        id: p.id, name: p.boarderName, roomNo: p.roomNo,
        amount: p.amount, status: p.status as 'overdue' | 'pending',
      })).sort((a, b) => (a.status === 'overdue' ? -1 : 1) - (b.status === 'overdue' ? -1 : 1))
    },
  })
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
      qc.invalidateQueries({ queryKey: ['favorites-unviewed'] })
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

export function useUpdateLandlordProfile(userId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: api.LandlordProfilePatch) => api.updateLandlordProfile(patch),
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
