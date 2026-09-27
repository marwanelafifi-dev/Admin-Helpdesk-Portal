/** Browser-safe approval state rules shared by UI and server workflows. */
export function hasRecordedApproval(request: {
  statusHistory?: Array<{ comment?: string | null }>
}): boolean {
  return (request.statusHistory ?? []).some((entry) =>
    /^Approved by (Direct|Authorized) Manager/i.test(entry.comment ?? "")
  )
}
