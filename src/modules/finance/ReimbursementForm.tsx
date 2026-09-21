"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  REIMBURSEMENT_CURRENCIES,
  ReimbursementPayloadSchema,
} from "./reimbursement.schema"
import { submitRequest, updateRequest, pushToServer, type EngineRequest } from "@/services/engineService"
import { createNewRequestNotifications } from "@/lib/notificationStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AlertCircle, Wallet, Upload, X, FileText, FileCheck2, Mail, CreditCard, UserCheck, Check, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { CcEmailsField } from "@/components/ui/CcEmailsField"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { Checkbox } from "@/components/ui/checkbox"
import { FinanceProcessingNotice } from "./FinancePriorityField"
import { getList, getManagerEmail } from "@/lib/companyDataStore"
import { filesToAttachments } from "@/lib/attachments"

const BRAND = "#d97706" // amber-600 — Finance brand color
type ReimbursementFormValues = z.infer<typeof ReimbursementPayloadSchema>

const EMPTY_EXPENSE_ROW = { po: "", description: "", costCenter: "", currency: "EGP" as const, amount: 0 }

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

export function ReimbursementForm({ onCancel, editingRequest, isEditing }: { onCancel?: () => void; editingRequest?: EngineRequest | null; isEditing?: boolean }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [supportingDocFile, setSupportingDocFile] = useState<File | null>(null)
  const [creditCardStatementFile, setCreditCardStatementFile] = useState<File | null>(null)
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([])
  const [supportingDocError, setSupportingDocError] = useState<string | null>(null)
  const [creditCardStatementError, setCreditCardStatementError] = useState<string | null>(null)
  const [managers, setManagers] = useState<string[]>([])
  const [costCenters, setCostCenters] = useState<string[]>([])
  useEffect(() => {
    setManagers(getList("managers"))
    setCostCenters(getList("cost_centers"))
  }, [])

  const { register, control, handleSubmit, watch, setError, formState: { errors, isSubmitting }, reset } = useForm<ReimbursementFormValues>({
    resolver: zodResolver(ReimbursementPayloadSchema),
    defaultValues: { priority: "Normal", poOption: "has_po", expenseRows: [{ ...EMPTY_EXPENSE_ROW }], paidByPersonalCreditCard: false, ccEmails: [] },
  })

  const { fields: expenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({ control, name: "expenseRows" })
  const poOption = watch("poOption")
  const expenseRows = useWatch({ control, name: "expenseRows" }) ?? []
  const paidByPersonalCreditCard = watch("paidByPersonalCreditCard")
  const totalsByCurrency = (() => {
    const totals: Partial<Record<(typeof REIMBURSEMENT_CURRENCIES)[number], number>> = {}
    for (const row of expenseRows) {
      if (!row?.currency) continue
      const amount = Number(row.amount)
      totals[row.currency] = (totals[row.currency] ?? 0) + (Number.isFinite(amount) ? amount : 0)
    }
    return totals
  })()

  useEffect(() => {
    if (isEditing && editingRequest?.payload) {
      const payload = editingRequest.payload as any
      reset({
        requestTitle: editingRequest.title || "",
        priority: payload.priority || "Normal",
        poOption: payload.poOption || "has_po",
        directManager: payload.directManager || "",
        expenseRows: Array.isArray(payload.expenseRows) && payload.expenseRows.length > 0
          ? payload.expenseRows
          : [{
              po: Array.isArray(payload.poNumbers) ? payload.poNumbers[0] ?? "" : "",
              description: editingRequest.title || "",
              costCenter: payload.costCenter || "",
              amount: payload.amount || 0,
              currency: payload.currency || "EGP",
            }],
        paidByPersonalCreditCard: payload.paidByPersonalCreditCard || false,
      })
    }
  }, [editingRequest, isEditing, reset])

  const handleCancel = onCancel ?? (() => router.push("/departments/finance/reimbursement"))

  const onSubmit = async (data: ReimbursementFormValues) => {
    if (data.poOption === "no_po" && !data.directManager?.trim()) {
      setError("directManager", { type: "manual", message: "Direct Manager is required when there is no PO" })
      return
    }
    if (!isEditing && !supportingDocFile) {
      setSupportingDocError("Supporting documents are required to submit a reimbursement request.")
      return
    }
    setSupportingDocError(null)
    if (data.paidByPersonalCreditCard) {
      if (!isEditing && !creditCardStatementFile) {
        setCreditCardStatementError("Payment evidence for the company expense is required when paid by personal credit card.")
        return
      }
    }
    setCreditCardStatementError(null)

    // Auto-CC the Direct Manager (only relevant when there's no PO — that's
    // the only case a Direct Manager is on the request at all).
    const managerEmail = data.poOption === "no_po" && data.directManager ? getManagerEmail(data.directManager) : undefined
    if (managerEmail) {
      const existing = data.ccEmails ?? []
      const lower = new Set(existing.map((e) => e.toLowerCase()))
      if (!lower.has(managerEmail.toLowerCase())) {
        data.ccEmails = [...existing, managerEmail]
      }
    }

    const currencies = Array.from(new Set(data.expenseRows.map((row) => row.currency)))
    const payload = {
      ...data,
      poNumbers: data.poOption === "has_po"
        ? Array.from(new Set(data.expenseRows.map((row) => row.po?.trim()).filter(Boolean)))
        : [],
      costCenter: Array.from(new Set(data.expenseRows.map((row) => row.costCenter))).join(", "),
      amount: data.expenseRows.reduce((sum, row) => sum + row.amount, 0),
      currency: currencies.length === 1 ? currencies[0] : undefined,
      totalsByCurrency: Object.fromEntries(REIMBURSEMENT_CURRENCIES.map((currency) => [currency, totalsByCurrency[currency] ?? 0])),
      directManagerEmail: managerEmail ?? "",
    }

    let redirectTo: string | null = null
    try {
      if (isEditing && editingRequest) {
        updateRequest(editingRequest.id, {
          ...payload,
        }, {
          title: data.requestTitle,
          requesterId: editingRequest.requesterId,
          requesterName: editingRequest.requesterName,
          requesterEmail: editingRequest.requesterEmail,
        })
      } else {
        // 1. Create request first (server-assigns the ID)
        const newReq = await submitRequest("finance_reimbursement", {
          ...payload,
        } as any, {
          title: data.requestTitle,
          requesterId: session?.user?.id || "USR-001",
          requesterName: session?.user?.name || session?.user?.email || "Current User",
          requesterEmail: session?.user?.email || "user@si-ware.com",
        })

        // 2. Upload the invoice, company-expense payment evidence (when
        // applicable), and any additional files, then patch them in.
        const namedFiles: File[] = []
        if (supportingDocFile) namedFiles.push(supportingDocFile)
        if (creditCardStatementFile) namedFiles.push(creditCardStatementFile)
        const filesToUpload = [...namedFiles, ...additionalFiles]
        if (filesToUpload.length > 0) {
          const attachments = await filesToAttachments(filesToUpload, newReq.id)
          let idx = 0
          const supportingDocument = supportingDocFile ? attachments[idx++] : undefined
          const creditCardStatement = creditCardStatementFile ? attachments[idx++] : undefined
          const additionalAttachments = attachments.slice(idx)
          const updated = updateRequest(newReq.id, { ...payload, supportingDocument, creditCardStatement, additionalAttachments } as any, { title: data.requestTitle })
          if (updated) {
            void pushToServer(updated)
          }
        }

        createNewRequestNotifications({
          requestId: newReq.id,
          requestTitle: newReq.title,
          module: "finance_reimbursement",
          requesterId: newReq.requesterId,
          requesterName: newReq.requesterName,
          requesterEmail: newReq.requesterEmail,
          ccEmails: data.ccEmails,
          managerEmail: managerEmail,
        })
      }
      redirectTo = "/departments/finance/reimbursement"
    } catch (error) {
      console.error(isEditing ? "Failed to update request:" : "Failed to create request:", error)
    }
    if (redirectTo) {
      router.push(redirectTo)
      router.refresh()
    }
  }

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Request Title */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="requestTitle">Request Title <span className="text-red-500">*</span></Label>
              <Input id="requestTitle" placeholder="e.g. Client Dinner — Cairo Trip" {...register("requestTitle")} className={cn(errors.requestTitle && "border-red-400")} />
              <FieldError message={errors.requestTitle?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Processing time */}
        <FinanceProcessingNotice hasApproval={poOption === "no_po"} />

        {/* PO or No PO */}
        <Card>
          <SectionHeader icon={FileCheck2} title="Purchase Order" subtitle="Does this reimbursement have a Purchase Order?" />
          <CardContent className="space-y-4">
            <Controller
              name="poOption"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { value: "has_po" as const, label: "Has PO", icon: FileCheck2, caption: "Reference a Purchase Order" },
                      { value: "no_po" as const, label: "No PO", icon: UserCheck, caption: "Route to Direct Manager" },
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

            {poOption === "no_po" && (
              <div className="space-y-1.5">
                <Label>Direct Manager <span className="text-red-500">*</span></Label>
                <Controller
                  name="directManager"
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      options={managers}
                      placeholder="Select direct manager"
                      hasError={!!errors.directManager}
                    />
                  )}
                />
                <FieldError message={errors.directManager?.message} />
                <p className="text-xs text-muted-foreground">Since there&apos;s no PO, this request will need your Direct Manager&apos;s approval. The selected manager is automatically CC&apos;d and will receive an approval email once Finance moves this request to Awaiting Approval.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense rows */}
        <Card>
          <SectionHeader icon={Wallet} title="Expense Details" subtitle="Complete every field and add a row for each expense" />
          <CardContent className="space-y-4">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    {poOption === "has_po" && <th className="border-b px-3 py-3">PO <span className="text-red-500">*</span></th>}
                    <th className="border-b px-3 py-3">Description <span className="text-red-500">*</span></th>
                    <th className="border-b px-3 py-3">Cost Center <span className="text-red-500">*</span></th>
                    <th className="w-32 border-b px-3 py-3">Currency <span className="text-red-500">*</span></th>
                    <th className="w-40 border-b px-3 py-3">Amount <span className="text-red-500">*</span></th>
                    <th className="w-14 border-b px-2 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {expenseFields.map((expenseField, index) => {
                    const rowErrors = errors.expenseRows?.[index]
                    return (
                      <tr key={expenseField.id} className="align-top">
                        {poOption === "has_po" && (
                          <td className="border-b px-3 py-3">
                            <Input placeholder="PO number" {...register(`expenseRows.${index}.po`)} className={cn(rowErrors?.po && "border-red-400")} />
                            <FieldError message={rowErrors?.po?.message} />
                          </td>
                        )}
                        <td className="border-b px-3 py-3">
                          <Input placeholder="Expense description" {...register(`expenseRows.${index}.description`)} className={cn(rowErrors?.description && "border-red-400")} />
                          <FieldError message={rowErrors?.description?.message} />
                        </td>
                        <td className="border-b px-3 py-3">
                          <Controller
                            name={`expenseRows.${index}.costCenter`}
                            control={control}
                            render={({ field }) => (
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className={cn(rowErrors?.costCenter && "border-red-400")}>
                                  <SelectValue placeholder="Select cost center" />
                                </SelectTrigger>
                                <SelectContent>
                                  {costCenters.map((costCenter) => <SelectItem key={costCenter} value={costCenter}>{costCenter}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          <FieldError message={rowErrors?.costCenter?.message} />
                        </td>
                        <td className="border-b px-3 py-3">
                          <Controller
                            name={`expenseRows.${index}.currency`}
                            control={control}
                            render={({ field }) => (
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className={cn(rowErrors?.currency && "border-red-400")}>
                                  <SelectValue placeholder="Currency" />
                                </SelectTrigger>
                                <SelectContent>
                                  {REIMBURSEMENT_CURRENCIES.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          <FieldError message={rowErrors?.currency?.message} />
                        </td>
                        <td className="border-b px-3 py-3">
                          <Input type="number" min="0.01" step="0.01" placeholder="0.00" {...register(`expenseRows.${index}.amount`, { valueAsNumber: true })} className={cn(rowErrors?.amount && "border-red-400")} />
                          <FieldError message={rowErrors?.amount?.message} />
                        </td>
                        <td className="border-b px-2 py-3 text-center">
                          <Button type="button" variant="ghost" size="icon" disabled={expenseFields.length === 1} onClick={() => removeExpense(index)} aria-label={`Remove expense row ${index + 1}`}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-amber-50/70 font-semibold text-amber-950">
                    <td colSpan={poOption === "has_po" ? 3 : 2} className="px-3 py-3 text-right">Total by currency</td>
                    <td colSpan={2} className="px-3 py-3">
                      <div className="flex flex-wrap gap-x-5 gap-y-1">
                        {REIMBURSEMENT_CURRENCIES.map((currency) => (
                          <span key={currency}>{currency}: {(totalsByCurrency[currency] ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        ))}
                      </div>
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
            <Button type="button" variant="outline" onClick={() => appendExpense({ ...EMPTY_EXPENSE_ROW })} className="gap-2">
              <Plus className="h-4 w-4" /> Add Expense Row
            </Button>
          </CardContent>
        </Card>

        {/* Personal Credit Card */}
        <Card>
          <SectionHeader icon={CreditCard} title="Payment Method" subtitle="Are you paid by Personal Credit Card?" />
          <CardContent className="space-y-4">
            <Controller
              name="paidByPersonalCreditCard"
              control={control}
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="paidByPersonalCreditCard"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <Label htmlFor="paidByPersonalCreditCard" className="cursor-pointer">
                    Paid by Personal Credit Card
                  </Label>
                </div>
              )}
            />

            {paidByPersonalCreditCard && (
              <>
                <div className="space-y-1.5">
                  <Label>Payment Evidence — Company Expense Only <span className="text-red-500">*</span></Label>
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                    Upload a bank receipt or a cropped transaction screenshot showing only this company expense
                    (merchant, date, amount, and currency).
                    Hide account/card numbers, balances, and unrelated transactions.
                  </div>
                  <input
                    id="creditCardStatement"
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setCreditCardStatementFile(e.target.files[0])
                        setCreditCardStatementError(null)
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("creditCardStatement")?.click()}
                    className={cn(
                      "w-full px-6 py-8 border-2 border-dashed rounded-lg transition-all duration-200 flex flex-col items-center justify-center gap-2",
                      creditCardStatementFile ? "border-amber-400 bg-amber-50/60 hover:bg-amber-50" : "border-amber-300 hover:border-amber-500 hover:bg-amber-50"
                    )}
                  >
                    {creditCardStatementFile ? (
                      <>
                        <FileText className="h-5 w-5 text-amber-600" />
                        <span className="text-sm font-semibold text-amber-700">{creditCardStatementFile.name}</span>
                        <span className="text-xs text-amber-500">Click to replace</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-amber-600" />
                        <span className="text-sm font-medium text-gray-700">Click to browse files</span>
                        <span className="text-xs text-muted-foreground">Bank receipt or cropped transaction screenshot (required)</span>
                      </>
                    )}
                  </button>
                  <FieldError message={creditCardStatementError ?? undefined} />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Supporting Documents */}
        <Card>
          <SectionHeader icon={FileCheck2} title="Attach Invoice" subtitle="Upload proof of the expense" />
          <CardContent>
            <div className="space-y-3">
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                If you have a hard copy, please provide it to the Finance Team.
              </p>
              <input
                id="supportingDocument"
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setSupportingDocFile(e.target.files[0])
                    setSupportingDocError(null)
                  }
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById("supportingDocument")?.click()}
                className={cn(
                  "w-full px-6 py-8 border-2 border-dashed rounded-lg transition-all duration-200 flex flex-col items-center justify-center gap-2",
                  supportingDocFile ? "border-amber-400 bg-amber-50/60 hover:bg-amber-50" : "border-amber-300 hover:border-amber-500 hover:bg-amber-50"
                )}
              >
                {supportingDocFile ? (
                  <>
                    <FileText className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-700">{supportingDocFile.name}</span>
                    <span className="text-xs text-amber-500">Click to replace</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-amber-600" />
                    <span className="text-sm font-medium text-gray-700">Click to browse files</span>
                    <span className="text-xs text-muted-foreground">Supporting document (required)</span>
                  </>
                )}
              </button>
              <FieldError message={supportingDocError ?? undefined} />
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
            {isSubmitting ? (isEditing ? "Updating..." : "Submitting...") : (isEditing ? "Update Request" : "Submit General Reimbursement Request")}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ReimbursementForm
