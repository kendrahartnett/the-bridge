import { cleanupExpiredChatMetadata, cronAuthorized } from "@/lib/chat-cleanup"
import { deleteExpiredRateLimits, deleteExpiredSessions } from "@/lib/chat-session-store"

export const maxDuration = 30

export async function GET(request: Request) {
  if (!cronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } })
  }

  try {
    const deleted = await cleanupExpiredChatMetadata({ deleteExpiredSessions, deleteExpiredRateLimits })
    return Response.json({ ok: true, deleted }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    console.error("[chat-cleanup] cleanup_error: storage_unavailable")
    return Response.json({ error: "Cleanup unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }
}
