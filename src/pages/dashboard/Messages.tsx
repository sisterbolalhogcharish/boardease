import MessageCenter from '../../components/messaging/MessageCenter'
import { useAuth } from '../../lib/auth'

export default function Messages() {
  const { user } = useAuth()
  return (
    <MessageCenter
      userId={user?.id?.toString()}
      emptyTitle="No conversations yet"
      emptySubtitle="Boarder inquiries about your boarding houses will appear here."
      emptyActionLabel="Go to dashboard"
      emptyActionTo="/dashboard"
    />
  )
}
