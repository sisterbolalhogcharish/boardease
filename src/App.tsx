import { Navigate, Route, Routes } from 'react-router-dom'
import { CompareDock } from './components/boarder/HouseActions'
import { useAuth } from './lib/auth'
import LandlordSignup from './pages/LandlordSignup'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Search from './pages/Search'
import HouseDetails from './pages/HouseDetails'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import { PlanProvider } from './components/dashboard/PlanGate'
import { LandlordHouseProvider } from './lib/landlordHouse'
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import AdminLandlords from './pages/admin/AdminLandlords'
import AdminReceipts from './pages/admin/AdminReceipts'
import AdminPlans from './pages/admin/AdminPlans'
import AdminSettings from './pages/admin/AdminSettings'import AdminMessages from './pages/admin/AdminMessages'
import AdminLogin from './pages/admin/AdminLogin'
import Overview from './pages/dashboard/Overview'
import MyBoardingHouse from './pages/dashboard/MyBoardingHouse'
import Rooms from './pages/dashboard/Rooms'
import Boarders from './pages/dashboard/Boarders'
import Payments from './pages/dashboard/Payments'
import Analytics from './pages/dashboard/Analytics'
import Reports from './pages/dashboard/Reports'
import Reviews from './pages/dashboard/Reviews'
import Subscription from './pages/dashboard/Subscription'
import SubscriptionHistory from './pages/dashboard/SubscriptionHistory'
import Settings from './pages/dashboard/Settings'
import AIAssistant from './pages/dashboard/AIAssistant'
import OwnerReservations from './pages/dashboard/Reservations'
import OwnerMessages from './pages/dashboard/Messages'
import BoarderDashboardLayout from './pages/boarder/BoarderDashboardLayout'
import BoarderHome from './pages/boarder/BoarderHome'
import BoarderPayments from './pages/boarder/BoarderPayments'
import BoarderReviews from './pages/boarder/BoarderReviews'
import BoarderBrowse from './pages/boarder/BoarderBrowse'
import BoarderFavorites from './pages/boarder/BoarderFavorites'
import BoarderCompare from './pages/boarder/BoarderCompare'
import BoarderReservations from './pages/boarder/BoarderReservations'
import BoarderMessages from './pages/boarder/BoarderMessages'
import BoarderProfile from './pages/boarder/BoarderProfile'
import VirtualAssistant from './components/boarder/VirtualAssistant'

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: 'landlord' | 'boarder' | 'admin' }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (requiredRole && user.role !== requiredRole) {
    const fallbacks: Record<string, string> = { landlord: '/dashboard', boarder: '/boarder', admin: '/admin' }
    return <Navigate to={fallbacks[user.role] ?? '/'} replace />
  }
  return <>{children}</>
}

function BoarderOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user || user.role !== 'boarder') return null
  return <>{children}</>
}

export default function App() {
  return (
    <>
      <Routes>
        {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/search" element={<Search />} />
      <Route path="/houses/:id" element={<HouseDetails />} />
      <Route path="/login" element={<Login />} />
      <Route path="/boardease-admin" element={<AdminLogin />} />
      <Route path="/landlord/signup" element={<LandlordSignup />} />

      {/* Landlord dashboard — protected */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole="landlord">
            <LandlordHouseProvider>
              <PlanProvider>
                <DashboardLayout />
              </PlanProvider>
            </LandlordHouseProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="my-house" element={<MyBoardingHouse />} />
        <Route path="rooms" element={<Rooms />} />
        <Route path="boarders" element={<Boarders />} />
        <Route path="reservations" element={<OwnerReservations />} />
        <Route path="messages" element={<OwnerMessages />} />
        <Route path="payments" element={<Payments />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="subscription" element={<Subscription />} />        <Route path="subscription/history" element={<SubscriptionHistory />} />
        <Route path="settings" element={<Settings />} />
        <Route path="ai" element={<AIAssistant />} />
      </Route>

      {/* Admin dashboard — protected */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="landlords" element={<AdminLandlords />} />
        <Route path="receipts" element={<AdminReceipts />} />
        <Route path="plans" element={<AdminPlans />} />
        <Route path="messages" element={<AdminMessages />} />        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Boarder dashboard — protected */}
      <Route
        path="/boarder"
        element={
          <ProtectedRoute requiredRole="boarder">
            <BoarderDashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<BoarderHome />} />
        <Route path="browse" element={<BoarderBrowse />} />
        <Route path="favorites" element={<BoarderFavorites />} />
        <Route path="compare" element={<BoarderCompare />} />
        <Route path="reservations" element={<BoarderReservations />} />
        <Route path="payments" element={<BoarderPayments />} />
        <Route path="reviews" element={<BoarderReviews />} />
        <Route path="messages" element={<BoarderMessages />} />
        <Route path="profile" element={<BoarderProfile />} />
      </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Global discovery helpers — compare dock is public-facing; VirtualAssistant is boarder-only and only appears after login */}
      <CompareDock />
      <BoarderOnly>
        <VirtualAssistant />
      </BoarderOnly>
    </>
  )
}
