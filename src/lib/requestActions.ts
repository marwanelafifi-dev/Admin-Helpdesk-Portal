import Link from "next/link"
import { requestDetailPathForModule } from "@/lib/functionRegistry"

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
  const sourceByModule: Record<string, string> = {
    finance_reimbursement: "reimbursement",
    finance_travel_reimbursement: "travel-reimbursement",
    finance_invoice_payment: "invoices",
    hr_general: "departments/hr/general",
    hr_letter: "departments/hr/letter",
    hr_travel_letter: "departments/hr/letter",
  }
  const source = sourceByModule[module] ?? module
  return `${requestDetailPathForModule(module, requestId)}?source=${encodeURIComponent(source)}`
}
