"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ONBOARDING_ITEMS,
  OFFBOARDING_ITEMS,
  OnboardingPayloadSchema,
  OffboardingPayloadSchema,
} from "./hr.schema"
import { submitRequest } from "@/services/engineService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, UserPlus, UserMinus, User, Building2, Calendar, ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"

const BRAND = "#0F766E" // teal-700

type HRType = "onboarding" | "offboarding"

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

// ─── Onboarding Form ──────────────────────────────────────────────────────────

type OnboardingForm = z.infer<typeof OnboardingPayloadSchema>
type OffboardingForm = z.infer<typeof OffboardingPayloadSchema>

function OnboardingFormFields({ onCancel }: { onCancel: () => void }) {
  const router = useRouter()
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<OnboardingForm>({
    resolver: zodResolver(OnboardingPayloadSchema),
    defaultValues: { hrType: "onboarding", items: [] },
  })

  const onSubmit = (data: OnboardingForm) => {
    submitRequest("hr", data as unknown as Record<string, unknown>, {
      title: `Onboarding – ${data.employeeName}`,
      requesterId: "USR-001",
      requesterName: "Marwan Elafifi",
      requesterEmail: "marwan.elafifi@si-ware.com",
    })
    router.push("/hr")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register("hrType")} value="onboarding" />

      {/* Employee Details */}
      <Card>
        <SectionHeader icon={User} title="Employee Details" subtitle="Information about the new hire" />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="employeeName">Employee Name <span className="text-red-500">*</span></Label>
              <Input id="employeeName" placeholder="Full name" {...register("employeeName")} className={cn(errors.employeeName && "border-red-400")} />
              <FieldError message={errors.employeeName?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employeeId">Employee ID <span className="text-red-500">*</span></Label>
              <Input id="employeeId" placeholder="EMP-2026-XXX" {...register("employeeId")} className={cn(errors.employeeId && "border-red-400")} />
              <FieldError message={errors.employeeId?.message} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
              <Input id="department" placeholder="e.g. Engineering" {...register("department")} className={cn(errors.department && "border-red-400")} />
              <FieldError message={errors.department?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Input id="startDate" type="date" {...register("startDate")} className={cn(errors.startDate && "border-red-400")} />
              <FieldError message={errors.startDate?.message} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Items */}
      <Card>
        <SectionHeader icon={ClipboardList} title="Onboarding Items" subtitle="Select all items required for this new hire" />
        <CardContent>
          <Controller
            name="items"
            control={control}
            render={({ field }) => (
              <div className="space-y-3">
                {ONBOARDING_ITEMS.map((item) => (
                  <label key={item} className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition",
                    field.value.includes(item)
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}>
                    <input
                      type="checkbox"
                      checked={field.value.includes(item)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          field.onChange([...field.value, item])
                        } else {
                          field.onChange(field.value.filter((v) => v !== item))
                        }
                      }}
                      className="h-4 w-4 accent-teal-600"
                    />
                    <span className="text-sm font-medium">{item}</span>
                  </label>
                ))}
                <FieldError message={errors.items?.message} />
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <SectionHeader icon={Building2} title="Additional Notes" subtitle="Any extra information for this request" />
        <CardContent>
          <Textarea placeholder="Optional notes..." rows={3} {...register("notes")} />
        </CardContent>
      </Card>

      <div className="sticky bottom-0 bg-white border-t py-4 px-1 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: BRAND }} className="text-white hover:opacity-90 min-w-[160px]">
          {isSubmitting ? "Submitting..." : "Submit Onboarding Request"}
        </Button>
      </div>
    </form>
  )
}

// ─── Offboarding Form ─────────────────────────────────────────────────────────

function OffboardingFormFields({ onCancel }: { onCancel: () => void }) {
  const router = useRouter()
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<OffboardingForm>({
    resolver: zodResolver(OffboardingPayloadSchema),
    defaultValues: { hrType: "offboarding", items: [] },
  })

  const onSubmit = (data: OffboardingForm) => {
    submitRequest("hr", data as unknown as Record<string, unknown>, {
      title: `Offboarding – ${data.employeeName}`,
      requesterId: "USR-001",
      requesterName: "Marwan Elafifi",
      requesterEmail: "marwan.elafifi@si-ware.com",
    })
    router.push("/hr")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register("hrType")} value="offboarding" />

      {/* Employee Details */}
      <Card>
        <SectionHeader icon={User} title="Employee Details" subtitle="Information about the leaver" />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="employeeName">Employee Name <span className="text-red-500">*</span></Label>
              <Input id="employeeName" placeholder="Full name" {...register("employeeName")} className={cn(errors.employeeName && "border-red-400")} />
              <FieldError message={errors.employeeName?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employeeId">Employee ID <span className="text-red-500">*</span></Label>
              <Input id="employeeId" placeholder="EMP-XXXX-XXX" {...register("employeeId")} className={cn(errors.employeeId && "border-red-400")} />
              <FieldError message={errors.employeeId?.message} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
              <Input id="department" placeholder="e.g. Marketing" {...register("department")} className={cn(errors.department && "border-red-400")} />
              <FieldError message={errors.department?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastWorkingDay" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Last Working Day <span className="text-red-500">*</span>
              </Label>
              <Input id="lastWorkingDay" type="date" {...register("lastWorkingDay")} className={cn(errors.lastWorkingDay && "border-red-400")} />
              <FieldError message={errors.lastWorkingDay?.message} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offboarding Items */}
      <Card>
        <SectionHeader icon={ClipboardList} title="Offboarding Items" subtitle="Select all items to be completed for this leaver" />
        <CardContent>
          <Controller
            name="items"
            control={control}
            render={({ field }) => (
              <div className="space-y-3">
                {OFFBOARDING_ITEMS.map((item) => (
                  <label key={item} className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition",
                    field.value.includes(item)
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}>
                    <input
                      type="checkbox"
                      checked={field.value.includes(item)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          field.onChange([...field.value, item])
                        } else {
                          field.onChange(field.value.filter((v) => v !== item))
                        }
                      }}
                      className="h-4 w-4 accent-purple-600"
                    />
                    <span className="text-sm font-medium">{item}</span>
                  </label>
                ))}
                <FieldError message={errors.items?.message} />
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <SectionHeader icon={Building2} title="Additional Notes" subtitle="Any extra information for this request" />
        <CardContent>
          <Textarea placeholder="Optional notes..." rows={3} {...register("notes")} />
        </CardContent>
      </Card>

      <div className="sticky bottom-0 bg-white border-t py-4 px-1 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-purple-700 text-white hover:opacity-90 min-w-[160px]">
          {isSubmitting ? "Submitting..." : "Submit Offboarding Request"}
        </Button>
      </div>
    </form>
  )
}

// ─── Main HR Form ─────────────────────────────────────────────────────────────

export function HRForm({ defaultType = "onboarding", onCancel }: { defaultType?: HRType; onCancel?: () => void }) {
  const router = useRouter()
  const [hrType, setHrType] = useState<HRType>(defaultType)
  const handleCancel = onCancel ?? (() => router.push("/hr"))

  return (
    <div className="space-y-5 max-w-3xl mx-auto pb-12">
      {/* Type Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setHrType("onboarding")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 text-sm font-semibold transition",
            hrType === "onboarding"
              ? "border-teal-600 bg-teal-50 text-teal-700"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          )}
        >
          <UserPlus className="h-4 w-4" />
          Onboarding
        </button>
        <button
          type="button"
          onClick={() => setHrType("offboarding")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 text-sm font-semibold transition",
            hrType === "offboarding"
              ? "border-purple-600 bg-purple-50 text-purple-700"
              : "border-gray-200 text-gray-600 hover:border-gray-300"
          )}
        >
          <UserMinus className="h-4 w-4" />
          Offboarding
        </button>
      </div>

      {hrType === "onboarding"
        ? <OnboardingFormFields onCancel={handleCancel} />
        : <OffboardingFormFields onCancel={handleCancel} />
      }
    </div>
  )
}

export default HRForm
