"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  INVOICE_PAYMENT_CURRENCIES,
  PAYMENT_METHODS,
  InvoicePaymentPayloadSchema,
} from "./invoicePayment.schema"
import { submitRequest, updateRequest, pushToServer, type EngineRequest } from "@/services/engineService"
import { createNewRequestNotifications } from "@/lib/notificationStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AlertCircle, Upload, X, FileText, CreditCard, Mail, UserCheck, FileCheck2, FileSignature, Check, MoreHorizontal, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { CcEmailsField } from "@/components/ui/CcEmailsField"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { FinanceProcessingNotice } from "./FinancePriorityField"
import { ApproverField } from "./ApproverField"
import { getList } from "@/lib/companyDataStore"
import { filesToAttachments } from "@/lib/attachments"

const BRAND = "#d97706" // amber-600 — Finance brand color
const CURRENCY_OPTIONS: string[] = [...INVOICE_PAYMENT_CURRENCIES]

type InvoicePaymentFormValues = z.infer<typeof InvoicePaymentPayloadSchema>

const EMPTY_INVOICE_ROW = { supplier: "", poNumber: "", otherDescription: "", amount: 0, currency: "USD" as const, paymentTerms: "", paymentMethod: "Wire Transfer" as const }

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {message}
    </p>
  )
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <CardHeader className="pb-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${BRAND}18` }}>
          <Icon className="h-5 w-5" style={{ color: BRAND }} />
        </div>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </CardHeader>
  )
}

export function InvoicePaymentForm({ onCancel, editingRequest, isEditing }: { onCancel?: () => void; editingRequest?: EngineRequest | null; isEditing?: boolean }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null)
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([])
  const [invoiceFileError, setInvoiceFileError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<string[]>([])
  useEffect(() => {
    setSuppliers(getList("suppliers"))
  }, [])

  const { register, control, handleSubmit, watch, setValue, setError, formState: { errors, isSubmitting }, reset } = useForm<InvoicePaymentFormValues>({
    resolver: zodResolver(InvoicePaymentPayloadSchema),
    defaultValues: { priority: "Normal", poOrContract: "po", poNumbers: [], invoiceRows: [{ ...EMPTY_INVOICE_ROW }], approverEmail: "", approverName: "", ccEmails: [] },
  })

  const { fields: invoiceFields, append: appendInvoice, remove: removeInvoice } = useFieldArray({ control, name: "invoiceRows" })
  const invoiceRows = useWatch({ control, name: "invoiceRows" }) ?? []
  const invoiceTotalsByCurrency = invoiceRows.reduce<Record<string, number>>((totals, row) => {
    const currency = row.currency || "USD"
    totals[currency] = (totals[currency] ?? 0) + (Number.isFinite(Number(row.amount)) ? Number(row.amount) : 0)
    return totals
  }, {})
  const poOrContract = watch("poOrContract")
  const approverEmail = watch("approverEmail")
  const approverName = watch("approverName")
  const role = session?.user?.role as string | undefined
  const isFinanceTeam = role === "Finance Team"

  useEffect(() => {
    if (isEditing && editingRequest?.payload) {
      const payload = editingRequest.payload as any
      reset({
        requestTitle: editingRequest.title || "",
        priority: payload.priority || "Normal",
        poOrContract: payload.poOrContract || "po",
        invoiceRows: Array.isArray(payload.invoiceRows) && payload.invoiceRows.length > 0 ? payload.invoiceRows : [{ supplier: payload.supplier || "", poNumber: Array.isArray(payload.poNumbers) ? payload.poNumbers[0] || "" : "", otherDescription: payload.otherDetails || "", amount: payload.amount || 0, currency: payload.currency || "USD", paymentTerms: payload.paymentTerms || "", paymentMethod: payload.paymentMethod === "Ramp" ? "Company Credit Card" : payload.paymentMethod || "Wire Transfer" }],
        approverEmail: payload.approverEmail || "",
        approverName: payload.approverName || "",
      })
    }
  }, [editingRequest, isEditing, reset])

  const handleCancel = onCancel ?? (() => router.push("/departments/finance/invoices"))

  const onSubmit = async (data: InvoicePaymentFormValues) => {
    if (!isEditing && !invoiceFile) {
      setInvoiceFileError("The invoice file is required to submit an invoice payment request.")
      return
    }
    setInvoiceFileError(null)
    if (data.poOrContract === "po" && data.invoiceRows.some((row) => !row.poNumber?.trim())) {
      setError("invoiceRows", { type: "manual", message: "Enter a PO number for every invoice row" })
      return
    }

    // If Finance set an approver, auto-CC them and stamp the generic
    // directManager fields the platform's approval-email infra already
    // reads (see resolveRequestManagerEmail/Name in approvalNotify.ts) —
    // no changes needed there since this reuses the same fields.
    const approverEmailTrimmed = isFinanceTeam ? data.approverEmail?.trim() : undefined
    if (approverEmailTrimmed) {
      const existing = data.ccEmails ?? []
      const lower = new Set(existing.map((e) => e.toLowerCase()))
      if (!lower.has(approverEmailTrimmed.toLowerCase())) {
        data.ccEmails = [...existing, approverEmailTrimmed]
      }
    }
    const directManagerEmail = approverEmailTrimmed ?? ""
    const directManager = approverEmailTrimmed ? (data.approverName?.trim() || approverEmailTrimmed) : ""

    const primaryRow = data.invoiceRows[0]
    const payload = { ...data, supplier: primaryRow.supplier, poNumbers: data.invoiceRows.map((row) => row.poNumber).filter(Boolean), amount: data.invoiceRows.reduce((sum, row) => sum + Number(row.amount || 0), 0), currency: primaryRow.currency, paymentTerms: primaryRow.paymentTerms, paymentMethod: primaryRow.paymentMethod, directManagerEmail, directManager }
    let redirectTo: string | null = null
    try {
      if (isEditing && editingRequest) {
        updateRequest(editingRequest.id, payload, {
          title: data.requestTitle,
          requesterId: editingRequest.requesterId,
          requesterName: editingRequest.requesterName,
          requesterEmail: editingRequest.requesterEmail,
        })
      } else {
        // 1. Create request first (server-assigns the ID)
        const newReq = await submitRequest("finance_invoice_payment", payload as any, {
          title: data.requestTitle,
          requesterId: session?.user?.id || "USR-001",
          requesterName: session?.user?.name || session?.user?.email || "Current User",
          requesterEmail: session?.user?.email || "user@si-ware.com",
        })

        // 2. Upload the invoice file (required) + any additional files, then patch them in
        const filesToUpload = invoiceFile ? [invoiceFile, ...additionalFiles] : additionalFiles
        if (filesToUpload.length > 0) {
          const attachments = await filesToAttachments(filesToUpload, newReq.id)
          const uploadedInvoiceFile = invoiceFile ? attachments[0] : undefined
          const additionalAttachments = invoiceFile ? attachments.slice(1) : attachments
          const updated = updateRequest(newReq.id, { ...payload, invoiceFile: uploadedInvoiceFile, additionalAttachments } as any, { title: data.requestTitle })
          if (updated) {
            void pushToServer(updated)
          }
        }

        createNewRequestNotifications({
          requestId: newReq.id,
          requestTitle: newReq.title,
          module: "finance_invoice_payment",
          requesterId: newReq.requesterId,
          requesterName: newReq.requesterName,
          requesterEmail: newReq.requesterEmail,
          ccEmails: data.ccEmails,
          managerEmail: directManagerEmail,
        })
      }
      redirectTo = "/departments/finance/invoices"
    } catch (error) {
      console.error(isEditing ? "Failed to update request:" : "Failed to create request:", error)
    }
    if (redirectTo) {
      router.push(redirectTo)
      router.refresh()
    }
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Request Title */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="requestTitle">Request Title <span className="text-red-500">*</span></Label>
              <Input id="requestTitle" placeholder="e.g. Office Cleaning Services — August Invoice" {...register("requestTitle")} className={cn(errors.requestTitle && "border-red-400")} />
              <FieldError message={errors.requestTitle?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Processing time */}
        <FinanceProcessingNotice hasApproval={!!approverEmail} />

        {/* Approval — Finance Team only */}
        {isFinanceTeam && (
          <Card>
            <SectionHeader icon={UserCheck} title="Approval" subtitle="Finance Team only — optionally require sign-off before this invoice moves to In Progress" />
            <CardContent>
              <ApproverField
                email={approverEmail}
                name={approverName}
                onChange={({ email, name }) => {
                  setValue("approverEmail", email)
                  setValue("approverName", name)
                }}
              />
              <p className="text-xs text-muted-foreground mt-3">Any portal user or a typed email address. The approver is automatically CC&apos;d and will receive an approval email once this request is moved to Awaiting Approval.</p>
            </CardContent>
          </Card>
        )}

        {/* Invoice Details */}
        <Card>
          <SectionHeader icon={CreditCard} title="Invoice Details" subtitle="Which vendor invoice should be paid?" />
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
                <Label>PO or Contract <span className="text-red-500">*</span></Label>
                <Controller
                  name="poOrContract"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-3 gap-3">
                      {(
                        [
                          { value: "po" as const, label: "PO", icon: FileCheck2, caption: "Backed by a Purchase Order" },
                          { value: "contract" as const, label: "Contract", icon: FileSignature, caption: "Backed by a Contract" },
                          { value: "other" as const, label: "Other", icon: MoreHorizontal, caption: "Something else" },
                        ]
                      ).map(({ value: optionValue, label, icon: Icon, caption }) => {
                        const isActive = field.value === optionValue
                        return (
                          <button
                            key={optionValue}
                            type="button"
                            onClick={() => field.onChange(optionValue)}
                            className={cn(
                              "relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-3.5 font-medium transition-all",
                              isActive
                                ? "border-amber-500 bg-amber-50 text-amber-900 shadow-sm ring-2 ring-amber-200"
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                            )}
                          >
                            {isActive && (
                              <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-50">
                                <Check className="h-3 w-3 text-amber-600" />
                              </span>
                            )}
                            <Icon className={cn("h-5 w-5", isActive ? "text-amber-600" : "text-gray-400")} />
                            <span className="text-sm font-semibold">{label}</span>
                            <span className={cn("text-[11px]", isActive ? "text-amber-700" : "text-gray-400")}>{caption}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                />
            </div>

            <div className="overflow-visible rounded-lg border">
              <table className="w-full table-fixed text-sm">
                <thead className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="border-b px-2 py-3">Supplier <span className="text-red-500">*</span></th>
                    {poOrContract === "po" && <th className="border-b px-2 py-3">PO Number <span className="text-red-500">*</span></th>}
                    {poOrContract === "other" && <th className="border-b px-2 py-3">Description</th>}
                    <th className="border-b px-2 py-3">Invoice Amount <span className="text-red-500">*</span></th>
                    <th className="w-[13%] border-b px-2 py-3">Currency <span className="text-red-500">*</span></th>
                    <th className="w-[16%] border-b px-2 py-3">Payment Terms <span className="text-red-500">*</span></th>
                    <th className="w-[17%] border-b px-2 py-3">Payment Method <span className="text-red-500">*</span></th>
                    <th className="w-10 border-b px-1 py-3" />
                  </tr>
                </thead>
                <tbody>{invoiceFields.map((invoiceField, index) => <tr key={invoiceField.id} className="align-top border-b last:border-0">
                  <td className="px-2 py-3"><Controller name={`invoiceRows.${index}.supplier`} control={control} render={({ field }) => <SearchableSelect value={field.value ?? ""} onChange={field.onChange} options={suppliers} placeholder="Select supplier" hasError={!!errors.invoiceRows?.[index]?.supplier} />} /><FieldError message={errors.invoiceRows?.[index]?.supplier?.message} /></td>
                  {poOrContract === "po" && <td className="px-2 py-3"><Input placeholder="PO number" {...register(`invoiceRows.${index}.poNumber`)} className={cn(errors.invoiceRows?.[index]?.poNumber && "border-red-400")} /><FieldError message={errors.invoiceRows?.[index]?.poNumber?.message} /></td>}
                  {poOrContract === "other" && <td className="px-2 py-3"><Input placeholder="Optional description" {...register(`invoiceRows.${index}.otherDescription`)} /></td>}
                  <td className="px-2 py-3"><Input type="number" min="0" step="0.01" placeholder="0.00" {...register(`invoiceRows.${index}.amount`, { valueAsNumber: true })} className={cn(errors.invoiceRows?.[index]?.amount && "border-red-400")} /><FieldError message={errors.invoiceRows?.[index]?.amount?.message} /></td>
                  <td className="px-2 py-3"><Controller name={`invoiceRows.${index}.currency`} control={control} render={({ field }) => <SearchableSelect value={field.value ?? ""} onChange={field.onChange} options={CURRENCY_OPTIONS} placeholder="Currency" hasError={!!errors.invoiceRows?.[index]?.currency} />} /></td>
                  <td className="px-2 py-3"><Input placeholder="e.g. Net 30" {...register(`invoiceRows.${index}.paymentTerms`)} className={cn(errors.invoiceRows?.[index]?.paymentTerms && "border-red-400")} /><FieldError message={errors.invoiceRows?.[index]?.paymentTerms?.message} /></td>
                  <td className="px-2 py-3"><Controller name={`invoiceRows.${index}.paymentMethod`} control={control} render={({ field }) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder="Method" /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>} /></td>
                  <td className="px-1 py-3 text-center"><Button type="button" variant="ghost" size="icon" disabled={invoiceFields.length === 1} onClick={() => removeInvoice(index)}><Trash2 className="h-4 w-4 text-red-500" /></Button></td>
                </tr>)}</tbody>
                <tfoot><tr className="border-t bg-amber-50/70 font-bold text-slate-950"><td colSpan={poOrContract === "contract" ? 2 : 3} className="px-3 py-3 text-right text-xs">Amount totals by currency</td><td colSpan={4} className="px-3 py-3"><div className="flex flex-wrap gap-x-5 gap-y-1 text-xs">{Object.entries(invoiceTotalsByCurrency).map(([currency, amount]) => <span key={currency}>{currency}: {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>)}</div></td></tr></tfoot>
              </table>
            </div>
            <Button type="button" variant="outline" className="gap-2" onClick={() => appendInvoice({ ...EMPTY_INVOICE_ROW })}><Plus className="h-4 w-4" /> Add Invoice Row</Button>
          </CardContent>
        </Card>

        {/* Attach Invoice */}
        <Card>
          <SectionHeader icon={FileText} title="Attach Invoice" subtitle="Upload the vendor invoice" />
          <CardContent>
            <div className="space-y-3">
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                If you have a hard copy, please provide it to the Finance Team.
              </p>
              <input
                id="invoiceFile"
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setInvoiceFile(e.target.files[0])
                    setInvoiceFileError(null)
                  }
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById("invoiceFile")?.click()}
                className={cn(
                  "w-full px-6 py-8 border-2 border-dashed rounded-lg transition-all duration-200 flex flex-col items-center justify-center gap-2",
                  invoiceFile ? "border-amber-400 bg-amber-50/60 hover:bg-amber-50" : "border-amber-300 hover:border-amber-500 hover:bg-amber-50"
                )}
              >
                {invoiceFile ? (
                  <>
                    <FileText className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-700">{invoiceFile.name}</span>
                    <span className="text-xs text-amber-500">Click to replace</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-amber-600" />
                    <span className="text-sm font-medium text-gray-700">Click to browse files</span>
                    <span className="text-xs text-muted-foreground">Vendor invoice document (required)</span>
                  </>
                )}
              </button>
              <FieldError message={invoiceFileError ?? undefined} />
            </div>
          </CardContent>
        </Card>

        {/* Additional Attachments */}
        <Card>
          <SectionHeader icon={Upload} title="Additional Attachments" subtitle="Any other supporting documents" />
          <CardContent>
            <div className="space-y-3">
              <input
                id="additional-attachments"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) setAdditionalFiles((prev) => [...prev, ...Array.from(e.target.files!)])
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById("additional-attachments")?.click()}
                className="w-full px-6 py-8 border-2 border-dashed rounded-lg transition-all duration-200 flex flex-col items-center justify-center gap-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              >
                <Upload className="h-6 w-6 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Click to browse files</span>
                <span className="text-xs text-muted-foreground">Optional supporting documents</span>
              </button>

              {additionalFiles.length > 0 && (
                <div className="space-y-1.5">
                  {additionalFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                      <button
                        type="button"
                        onClick={() => setAdditionalFiles(additionalFiles.filter((_, i) => i !== idx))}
                        className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                      >
                        <X className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CC Notifications */}
        <Card>
          <SectionHeader icon={Mail} title="CC Notifications" subtitle="Additional recipients for email updates on this request" />
          <CardContent>
            <Controller
              control={control}
              name="ccEmails"
              render={({ field }) => (
                <CcEmailsField value={field.value ?? []} onChange={field.onChange} />
              )}
            />
          </CardContent>
        </Card>

        <div className="form-footer border-t bg-gray-50 py-4 px-1 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: BRAND }} className="text-white hover:opacity-90 min-w-[160px]">
            {isSubmitting ? (isEditing ? "Updating..." : "Submitting...") : (isEditing ? "Update Request" : "Submit Invoice Payment Request")}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default InvoicePaymentForm
