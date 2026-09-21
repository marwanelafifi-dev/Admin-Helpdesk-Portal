"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, Controller } from "react-hook-form"
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
import { AlertCircle, Upload, X, FileText, CreditCard, Mail, UserCheck, FileCheck2, FileSignature, Check, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { CcEmailsField } from "@/components/ui/CcEmailsField"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { PoNumbersField } from "@/components/ui/PoNumbersField"
import { FinanceProcessingNotice } from "./FinancePriorityField"
import { ApproverField } from "./ApproverField"
import { getList } from "@/lib/companyDataStore"
import { filesToAttachments } from "@/lib/attachments"

const BRAND = "#d97706" // amber-600 — Finance brand color
const CURRENCY_OPTIONS: string[] = [...INVOICE_PAYMENT_CURRENCIES]

type InvoicePaymentFormValues = z.infer<typeof InvoicePaymentPayloadSchema>

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
    defaultValues: { currency: "USD", priority: "Normal", poOrContract: "po", poNumbers: [], approverEmail: "", approverName: "", ccEmails: [] },
  })

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
        supplier: payload.supplier || "",
        poOrContract: payload.poOrContract || "po",
        poNumbers: Array.isArray(payload.poNumbers) ? payload.poNumbers : [],
        otherDetails: payload.otherDetails || "",
        amount: payload.amount || 0,
        currency: payload.currency || "USD",
        paymentTerms: payload.paymentTerms || "",
        paymentMethod: payload.paymentMethod === "Ramp" ? "Company Credit Card" : payload.paymentMethod || undefined,
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
    if (data.poOrContract === "po" && (!data.poNumbers || data.poNumbers.length === 0)) {
      setError("poNumbers", { type: "manual", message: "At least one PO number is required" })
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

    let redirectTo: string | null = null
    try {
      if (isEditing && editingRequest) {
        updateRequest(editingRequest.id, { ...data, directManagerEmail, directManager }, {
          title: data.requestTitle,
          requesterId: editingRequest.requesterId,
          requesterName: editingRequest.requesterName,
          requesterEmail: editingRequest.requesterEmail,
        })
      } else {
        // 1. Create request first (server-assigns the ID)
        const newReq = await submitRequest("finance_invoice_payment", { ...data, directManagerEmail, directManager } as any, {
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
          const updated = updateRequest(newReq.id, { ...data, directManagerEmail, directManager, invoiceFile: uploadedInvoiceFile, additionalAttachments } as any, { title: data.requestTitle })
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
    <div className="space-y-5 max-w-3xl mx-auto">
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
              <Label>Supplier <span className="text-red-500">*</span></Label>
              <Controller
                name="supplier"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={suppliers}
                    placeholder="Select supplier"
                    hasError={!!errors.supplier}
                  />
                )}
              />
              <FieldError message={errors.supplier?.message} />
            </div>

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

            {poOrContract === "po" && (
              <div className="space-y-1.5">
                <Label>PO Number(s) <span className="text-red-500">*</span></Label>
                <Controller
                  name="poNumbers"
                  control={control}
                  render={({ field }) => (
                    <PoNumbersField value={field.value ?? []} onChange={field.onChange} hasError={!!errors.poNumbers} />
                  )}
                />
                <FieldError message={errors.poNumbers?.message} />
              </div>
            )}

            {poOrContract === "other" && (
              <div className="space-y-1.5">
                <Label htmlFor="otherDetails">Details (optional)</Label>
                <Input id="otherDetails" placeholder="Add any relevant details" {...register("otherDetails")} />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount <span className="text-red-500">*</span></Label>
                <Input id="amount" type="number" min="0" step="0.01" placeholder="0.00" {...register("amount", { valueAsNumber: true })} className={cn(errors.amount && "border-red-400")} />
                <FieldError message={errors.amount?.message} />
              </div>

              <div className="space-y-1.5">
                <Label>Currency <span className="text-red-500">*</span></Label>
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      options={CURRENCY_OPTIONS}
                      placeholder="Select currency"
                      hasError={!!errors.currency}
                    />
                  )}
                />
                <FieldError message={errors.currency?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="paymentTerms">Payment Terms <span className="text-red-500">*</span></Label>
                <Input id="paymentTerms" placeholder="e.g. Net 30" {...register("paymentTerms")} className={cn(errors.paymentTerms && "border-red-400")} />
                <FieldError message={errors.paymentTerms?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paymentMethod">Method <span className="text-red-500">*</span></Label>
                <Controller
                  name="paymentMethod"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={cn(errors.paymentMethod && "border-red-400")}>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.paymentMethod?.message} />
              </div>
            </div>
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
