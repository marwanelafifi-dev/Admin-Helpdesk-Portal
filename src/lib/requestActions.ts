import Link from "next/link"

export function getEditLink(requestId: string, module: string): string {
  const moduleMap: Record<string, string> = {
    hr: `/hr/new?id=${requestId}`,
    maintenance: `/maintenance/new?id=${requestId}`,
    purchase: `/purchase/new?id=${requestId}`,
    event: `/event/new?id=${requestId}`,
    travel: `/travel/new?id=${requestId}`,
    shipping: `/shipping/new?id=${requestId}`,
  }
  return moduleMap[module] || `/requests/${requestId}`
}

export function getDetailLink(requestId: string, module: string): string {
  return `/requests/${requestId}?source=${module}`
}
