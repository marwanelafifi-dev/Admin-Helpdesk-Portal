"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  TRAVEL_REIMBURSEMENT_CURRENCIES,
  TRAVEL_EXPENSE_DESCRIPTIONS,
  TravelReimbursementPayloadSchema,
} from "./travelReimbursement.schema"
import { submitRequest, updateRequest, pushToServer, type EngineRequest } from "@/services/engineService"
import { createNewRequestNotifications } from "@/lib/notificationStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AlertCircle, Wallet, Upload, X, FileText, FileCheck2, Mail, CreditCard, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { CcEmailsField } from "@/components/ui/CcEmailsField"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { Checkbox } from "@/components/ui/checkbox"
import { FinanceProcessingNotice } from "./FinancePriorityField"
import { getList, getAuthorizedManagerEmail } from "@/lib/companyDataStore"
import { filesToAttachments } from "@/lib/attachments"

const BRAND = "#d97706" // amber-600 — Finance brand color
type TravelReimbursementFormValues = z.infer<typeof TravelReimbursementPayloadSchema>

const EMPTY_EXPENSE_ROW = {
  description: "Uber" as const,
  otherDescription: "",
  invoiceAmount: 0,
  invoiceCurrency: "EGP" as const,
  refundAmount: 0,
  refundCurrency: "EGP" as const,
}

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

export function TravelReimbursementForm({ onCancel, editingRequest, isEditing }: { onCancel?: () => void; editingRequest?: EngineRequest | null; isEditing?: boolean }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [supportingDocFile, setSupportingDocFile] = useState<File | null>(null)
  const [creditCardStatementFile, setCreditCardStatementFile] = useState<File | null>(null)
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([])
  const [supportingDocError, setSupportingDocError] = useState<string | null>(null)
  const [creditCardStatementError, setCreditCardStatementError] = useState<string | null>(null)
  const [authorizedManagers, setAuthorizedManagers] = useState<string[]>([])
  const [costCenters, setCostCenters] = useState<string[]>([])
  const [expenseDescriptions, setExpenseDescriptions] = useState<string[]>([...TRAVEL_EXPENSE_DESCRIPTIONS])
  useEffect(() => {
    setAuthorizedManagers(getList("authorized_managers"))
    setCostCenters(getList("cost_centers"))
    const configured = getList("travel_expense_descriptions")
    setExpenseDescriptions(configured.includes("Others") ? configured : [...configured, "Others"])
  }, [])

  const { register, control, handleSubmit, watch, setError, formState: { errors, isSubmitting }, reset } = useForm<TravelReimbursementFormValues>({
    resolver: zodResolver(TravelReimbursementPayloadSchema),
    defaultValues: { priority: "Normal", expenseRows: [{ ...EMPTY_EXPENSE_ROW }], paidByPersonalCreditCard: false, ccEmails: [] },
  })

  const { fields: expenseFields, append: appendExpense, remove: removeExpense } = useFieldArray({ control, name: "expenseRows" })
  const expenseRows = useWatch({ control, name: "expenseRows" }) ?? []
  const paidByPersonalCreditCard = watch("paidByPersonalCreditCard")
  const refundTotalsByCurrency = expenseRows.reduce((totals, row) => ({
    ...totals,
    [row.refundCurrency]: totals[row.refundCurrency] + (Number.isFinite(Number(row.refundAmount)) ? Number(row.refundAmount) : 0),
  }), { USD: 0, EUR: 0, EGP: 0 })

  useEffect(() => {
    if (isEditing && editingRequest?.payload) {
      const payload = editingRequest.payload as any
      reset({
        requestTitle: editingRequest.title || "",
        priority: payload.priority || "Normal",
        costCenter: payload.costCenter || "",
        expenseRows: Array.isArray(payload.expenseRows) && payload.expenseRows.length > 0
          ? payload.expenseRows.map((row: Record<string, any>) => {
              const legacyCurrency = (["USD", "EUR", "EGP"] as const).find((currency) => Number(row[`${currency.toLowerCase()}Amount`] ?? 0) > 0) ?? "EGP"
              const legacyAmount = Number(row[`${legacyCurrency.toLowerCase()}Amount`] ?? 0)
              return {
                ...row,
                invoiceAmount: row.invoiceAmount ?? legacyAmount,
                invoiceCurrency: row.invoiceCurrency ?? legacyCurrency,
                refundAmount: row.refundAmount ?? legacyAmount,
                refundCurrency: row.refundCurrency === "USD" || row.refundCurrency === "EUR" || row.refundCurrency === "EGP" ? row.refundCurrency : legacyCurrency,
              }
            })
          : [{
              description: "Others",
              otherDescription: editingRequest.title || "Legacy expense",
              invoiceAmount: payload.amount || 0,
              invoiceCurrency: payload.currency === "USD" || payload.currency === "EUR" || payload.currency === "EGP" ? payload.currency : "EGP",
              refundAmount: payload.amount || 0,
              refundCurrency: payload.currency === "USD" || payload.currency === "EUR" || payload.currency === "EGP" ? payload.currency : "EGP",
            }],
        authorizedManager: payload.authorizedManager || "",
        paidByPersonalCreditCard: payload.paidByPersonalCreditCard || false,
      })
    }
  }, [editingRequest, isEditing, reset])

  const handleCancel = onCancel ?? (() => router.push("/departments/finance/travel-reimbursement"))

  const onSubmit = async (data: TravelReimbursementFormValues) => {
    if (!isEditing && !supportingDocFile) {
      setSupportingDocError("Supporting documents are required to submit a travel reimbursement request.")
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

    // Auto-CC the Authorized Manager. Resolves the manager name to an email
    // via Company Data and appends it to ccEmails (case-insensitive dedupe).
    const managerEmail = data.authorizedManager ? getAuthorizedManagerEmail(data.authorizedManager) : undefined
    if (managerEmail) {
      const existing = data.ccEmails ?? []
      const lower = new Set(existing.map((e) => e.toLowerCase()))
      if (!lower.has(managerEmail.toLowerCase())) {
        data.ccEmails = [...existing, managerEmail]
      }
    }

    const payload = {
      ...data,
      amount: refundTotalsByCurrency.USD + refundTotalsByCurrency.EUR + refundTotalsByCurrency.EGP,
      currency: undefined,
      totalsByCurrency: refundTotalsByCurrency,
      refundTotalsByCurrency,
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
        const newReq = await submitRequest("finance_travel_reimbursement", {
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
          module: "finance_travel_reimbursement",
          requesterId: newReq.requesterId,
          requesterName: newReq.requesterName,
          requesterEmail: newReq.requesterEmail,
          ccEmails: data.ccEmails,
          managerEmail: managerEmail,
        })
      }
      redirectTo = "/departments/finance/travel-reimbursement"
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
              <Input id="requestTitle" placeholder="e.g. Client Visit — London Trip" {...register("requestTitle")} className={cn(errors.requestTitle && "border-red-400")} />
              <FieldError message={errors.requestTitle?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Processing time */}
        <FinanceProcessingNotice hasApproval />

        {/* Approval */}
        <Card>
          <SectionHeader icon={Wallet} title="Approval" subtitle="Your Authorized Manager will be asked to approve this request" />
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Authorized Manager <span className="text-red-500">*</span></Label>
              <Controller
                name="authorizedManager"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={authorizedManagers}
                    placeholder="Select authorized manager"
                    hasError={!!errors.authorizedManager}
                  />
                )}
              />
              <FieldError message={errors.authorizedManager?.message} />
              <p className="text-xs text-muted-foreground">The selected manager is automatically CC&apos;d and will receive an approval email.</p>
            </div>
          </CardContent>
        </Card>

        {/* Cost Center */}
        <Card>
          <SectionHeader icon={Wallet} title="Cost Center" subtitle="Which cost center should this be charged to?" />
          <CardContent>
            <div className="space-y-1.5">
              <Label>Cost Center <span className="text-red-500">*</span></Label>
              <Controller
                name="costCenter"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={costCenters}
                    placeholder="Select cost center"
                    hasError={!!errors.costCenter}
                  />
                )}
              />
              <FieldError message={errors.costCenter?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Expense rows */}
        <Card>
          <SectionHeader icon={Wallet} title="Expense Details" subtitle="Add a row for each travel expense" />
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full table-fixed border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="w-[31%] border-b px-2 py-3">Description <span className="text-red-500">*</span></th>
                    <th className="w-[15%] border-b px-2 py-3">Invoice Amount <span className="text-red-500">*</span></th>
                    <th className="w-[14%] border-b px-2 py-3">Invoice Currency <span className="text-red-500">*</span></th>
                    <th className="w-[15%] border-b px-2 py-3">Refund Amount <span className="text-red-500">*</span></th>
                    <th className="w-[14%] border-b px-2 py-3">Refund Currency <span className="text-red-500">*</span></th>
                    <th className="w-11 border-b px-1 py-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {expenseFields.map((expenseField, index) => {
                    const rowErrors = errors.expenseRows?.[index]
                    const selectedDescription = expenseRows[index]?.description
                    return (
                      <tr key={expenseField.id} className="align-top">
                        <td className="border-b px-2 py-3">
                          <div className="flex items-start gap-2">
                            <div className={cn("min-w-0", selectedDescription === "Others" ? "w-1/2 shrink-0" : "w-full")}>
                              <Controller
                                name={`expenseRows.${index}.description`}
                                control={control}
                                render={({ field }) => (
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <SelectTrigger className={cn(rowErrors?.description && "border-red-400")}>
                                      <SelectValue placeholder="Select description" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {expenseDescriptions.map((description) => <SelectItem key={description} value={description}>{description}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              <FieldError message={rowErrors?.description?.message} />
                            </div>
                            {selectedDescription === "Others" && (
                              <div className="min-w-0 flex-1">
                                <Input placeholder="Enter description" {...register(`expenseRows.${index}.otherDescription`)} className={cn(rowErrors?.otherDescription && "border-red-400")} />
                                <FieldError message={rowErrors?.otherDescription?.message} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="border-b px-2 py-3">
                          <Input type="number" min="0" step="0.01" placeholder="0.00" {...register(`expenseRows.${index}.invoiceAmount`, { valueAsNumber: true })} className={cn(rowErrors?.invoiceAmount && "border-red-400")} aria-label={`Invoice amount for row ${index + 1}`} />
                          <FieldError message={rowErrors?.invoiceAmount?.message} />
                        </td>
                        <td className="border-b px-2 py-3">
                          <Controller name={`expenseRows.${index}.invoiceCurrency`} control={control} render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange}><SelectTrigger aria-label={`Invoice currency for row ${index + 1}`}><SelectValue placeholder="Currency" /></SelectTrigger><SelectContent>{TRAVEL_REIMBURSEMENT_CURRENCIES.map((currency) => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent></Select>
                          )} />
                          <FieldError message={rowErrors?.invoiceCurrency?.message} />
                        </td>
                        <td className="border-b px-2 py-3">
                          <Input type="number" min="0" step="0.01" placeholder="0.00" {...register(`expenseRows.${index}.refundAmount`, { valueAsNumber: true })} className={cn(rowErrors?.refundAmount && "border-red-400")} aria-label={`Refund amount for row ${index + 1}`} />
                          <FieldError message={rowErrors?.refundAmount?.message} />
                        </td>
                        <td className="border-b px-2 py-3">
                          <Controller
                            name={`expenseRows.${index}.refundCurrency`}
                            control={control}
                            render={({ field }) => (
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger aria-label={`Refund currency for row ${index + 1}`}>
                                  <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                  {TRAVEL_REIMBURSEMENT_CURRENCIES.map((currency) => (
                                    <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          <FieldError message={rowErrors?.refundCurrency?.message} />
                        </td>
                        <td className="border-b px-1 py-3 text-center">
                          <Button type="button" variant="ghost" size="icon" disabled={expenseFields.length === 1} onClick={() => removeExpense(index)} aria-label={`Remove expense row ${index + 1}`}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="bg-amber-50/70 font-bold text-slate-950">
                    <td className="px-2 py-3 text-right text-xs">Refund totals</td>
                    <td colSpan={4} className="px-2 py-3">
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        {TRAVEL_REIMBURSEMENT_CURRENCIES.map((currency) => (
                          <span key={currency}>{currency}: {refundTotalsByCurrency[currency].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
            {isSubmitting ? (isEditing ? "Updating..." : "Submitting...") : (isEditing ? "Update Request" : "Submit Travel Reimbursement Request")}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default TravelReimbursementForm
