// The Bridge only serves Chicago, so times are entered and shown in Chicago time
// no matter where the server runs.
export const CHICAGO_TZ = "America/Chicago"

function chicagoOffsetMinutes(at: Date): number {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TZ,
    timeZoneName: "longOffset",
  })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value // e.g. "GMT-05:00"
  const m = name?.match(/GMT([+-])(\d{2}):(\d{2})/)
  if (!m) return 0
  const sign = m[1] === "-" ? -1 : 1
  return sign * (Number(m[2]) * 60 + Number(m[3]))
}

/** "2026-10-24T11:30" (Chicago wall-clock time) -> Date */
export function chicagoLocalToDate(local: string): Date {
  const [d, t] = local.split("T")
  const [y, mo, da] = d.split("-").map(Number)
  const [h, mi] = t.split(":").map(Number)
  const asUtc = Date.UTC(y, mo - 1, da, h, mi)
  // Two passes so the offset is right on daylight-saving change days.
  let offset = chicagoOffsetMinutes(new Date(asUtc))
  offset = chicagoOffsetMinutes(new Date(asUtc - offset * 60_000))
  return new Date(asUtc - offset * 60_000)
}

export function formatWindow(start: Date, end: Date): string {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  })
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TZ,
    hour: "numeric",
    minute: "2-digit",
  })
  const sameDay = day.format(start) === day.format(end)
  return sameDay
    ? `${day.format(start)}, ${time.format(start)} – ${time.format(end)}`
    : `${day.format(start)} ${time.format(start)} – ${day.format(end)} ${time.format(end)}`
}

/** "Oct 24, 2026, 3:15 PM" in Chicago time: when something happened to a request. */
export function formatDateTime(at: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: CHICAGO_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(at)
}
