export function getPaginationParams(url: string, defaults?: { page?: number; limit?: number }) {
  const { searchParams } = new URL(url)

  const rawPage = Number.parseInt(searchParams.get("page") || "", 10)
  const rawLimit = Number.parseInt(searchParams.get("limit") || "", 10)

  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : (defaults?.page ?? 1)
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, 100)
    : (defaults?.limit ?? 10)

  const offset = (page - 1) * limit

  return { page, limit, offset }
}
