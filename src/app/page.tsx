import { cookies } from "next/headers";
import ChatInterface from "@/components/ChatInterface";

export default async function Home() {
  // Read user profile and session from cookies (SSR)
  const cookieStore = await cookies();
  // Note: syncKeyHash is stored in cookie but not currently used (kept for future use)
  const syncKeyHash = cookieStore.get("temps_sync_key_hash")?.value;
  const displayName = cookieStore.get("temps_display_name")?.value;
  const sessionId = cookieStore.get("temps_current_session_id")?.value;

  // Pass server-side data to client component
  // This eliminates the need for client-side loading
  return (
    <ChatInterface
      initialSyncKey={syncKeyHash}
      initialDisplayName={displayName}
      initialSessionId={sessionId}
    />
  );
}
