import MessageCenter from '../../components/messaging/MessageCenter'
import { useAuth } from '../../lib/auth'

export default function BoarderMessages() {
  const { user } = useAuth()
  return (
    <MessageCenter
      userId={user?.id?.toString()}
      emptyTitle="No messages yet"
      emptySubtitle="Start a conversation by tapping “Contact Owner” on a boarding house you're interested in."
      emptyActionLabel="Browse Houses"
      emptyActionTo="/boarder/browse"
    />
  )
}
