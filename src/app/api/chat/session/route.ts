import { CHAT_COOKIE_NAME, isSameOriginRequest } from "@/lib/chat-security-core"

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Invalid request" }, { status: 403, headers: { "Cache-Control": "no-store" } })
  }
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": `${CHAT_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`,
    },
  })
}
