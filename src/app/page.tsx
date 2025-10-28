import { cookies } from "next/headers";
import ChatInterface from "@/components/ChatInterface";

export default async function Home() {
  // Read user profile and session from cookies (SSR)
  const cookieStore = await cookies();
  const syncKey = cookieStore.get("temps_sync_key")?.value;
  const displayName = cookieStore.get("temps_display_name")?.value;
  const sessionId = cookieStore.get("temps_current_session_id")?.value;

  // Pass server-side data to client component
  // This eliminates the need for client-side loading
  return (
    <ChatInterface
      initialSyncKey={syncKey}
      initialDisplayName={displayName}
      initialSessionId={sessionId}
    />
  );
}
