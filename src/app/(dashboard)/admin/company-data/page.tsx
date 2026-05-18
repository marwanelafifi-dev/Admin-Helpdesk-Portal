"use client"

import { useEffect, useRef, useState } from "react"
import { Building2, Layers, Users, Truck, Plus, X, Upload, Download, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getCompanyData,
  saveList,
  type CompanyDataKey,
  type CompanyData,
} from "@/lib/companyDataStore"
import * as XLSX from "xlsx"

type SectionConfig = {
  key: CompanyDataKey
  label: string
  description: string
  icon: React.ElementType
  iconColor: string
  iconBg: string
}

const SECTIONS: SectionConfig[] = [
  {
    key: "suppliers",
    label: "Suppliers",
    description: "Supplier names used in Shipping and Purchase forms",
    icon: Building2,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
  },
  {
    key: "cost_centers",
    label: "Cost Centers",
    description: "Cost center codes used across request forms",
    icon: Layers,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-50",
  },
  {
    key: "managers",
    label: "Managers",
    description: "Direct managers available for approval selection in Shipping Receiving",
    icon: Users,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
  },
  {
    key: "carriers",
    label: "Carriers",
    description: "Shipping carrier options (e.g. DHL, FedEx, UPS)",
    icon: Truck,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
  },
]

function exportToCsv(items: string[], filename: string) {
  const content = items.join("\n")
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function parseImportFile(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) { resolve([]); return }

        if (file.name.endsWith(".csv") || file.type === "text/csv") {
          // CSV: first column of each non-empty row
          const text = typeof data === "string" ? data : new TextDecoder().decode(data as ArrayBuffer)
          const items = text
            .split(/\r?\n/)
            .map((row) => row.split(",")[0].replace(/^"|"$/g, "").trim())
            .filter(Boolean)
          resolve(items)
        } else {
          // XLSX / XLS
          const workbook = XLSX.read(data, { type: "array" })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: 1 }) as unknown[][]
          const items = rows
            .map((row) => String(row[0] ?? "").trim())
            .filter(Boolean)
          resolve(items)
        }
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    if (file.name.endsWith(".csv") || file.type === "text/csv") {
      reader.readAsText(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  })
}

function LookupSection({
  config,
  items,
  onChange,
}: {
  config: SectionConfig
  items: string[]
  onChange: (key: CompanyDataKey, items: string[]) => void
}) {
  const { key, label, description, icon: Icon, iconColor, iconBg } = config
  const [newItem, setNewItem] = useState("")
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function addItem() {
    const val = newItem.trim()
    if (!val || items.includes(val)) return
    onChange(key, [...items, val])
    setNewItem("")
  }

  function removeItem(item: string) {
    onChange(key, items.filter((i) => i !== item))
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setImportStatus("Importing…")
    setImportSuccess(false)
    try {
      const parsed = await parseImportFile(file)
      const existing = new Set(items)
      const newItems = parsed.filter((v) => !existing.has(v))
      const dupes = parsed.length - newItems.length
      const merged = [...items, ...newItems]
      onChange(key, merged)
      setImportStatus(
        `${newItems.length} item${newItems.length !== 1 ? "s" : ""} imported${dupes > 0 ? `, ${dupes} duplicate${dupes !== 1 ? "s" : ""} skipped` : ""}`
      )
      setImportSuccess(true)
    } catch {
      setImportStatus("Import failed — check file format")
      setImportSuccess(false)
    }
    setTimeout(() => setImportStatus(null), 5000)
  }

  return (
    <Card>
      <CardHeader className="pb-4 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div>
              <CardTitle className="text-base">{label}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleImport}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => exportToCsv(items, `${key}.csv`)}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>
        {importStatus && (
          <div className={`flex items-center gap-1.5 text-xs mt-2 px-1 ${importSuccess ? "text-emerald-600" : "text-red-600"}`}>
            {importSuccess && <Check className="h-3.5 w-3.5" />}
            {importStatus}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Add new item */}
        <div className="flex gap-2">
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={`Add new ${label.toLowerCase().replace(/s$/, "")}…`}
            className="flex-1"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem() } }}
          />
          <Button type="button" size="sm" onClick={addItem} disabled={!newItem.trim()} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>

        {/* List */}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No items yet. Add manually or import from a file.
          </p>
        ) : (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </Label>
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between px-3 py-2 rounded-md border bg-card hover:bg-muted/40 transition-colors group"
                >
                  <span className="text-sm font-medium">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 hover:text-red-600 text-muted-foreground"
                    title="Remove"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground pt-1">
          Import supports <strong>.csv</strong>, <strong>.xlsx</strong>, or <strong>.xls</strong> — first column is used as the item name.
        </p>
      </CardContent>
    </Card>
  )
}

export default function CompanyDataPage() {
  const [data, setData] = useState<CompanyData>({
    suppliers: [],
    cost_centers: [],
    managers: [],
    carriers: [],
  })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setData(getCompanyData())
    setLoaded(true)
  }, [])

  function handleChange(key: CompanyDataKey, items: string[]) {
    const updated = { ...data, [key]: items }
    setData(updated)
    saveList(key, items)
  }

  if (!loaded) return null

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Company Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage lookup values used across request forms. Changes apply immediately — no rebuild required.
        </p>
      </div>

      <div className="space-y-5">
        {SECTIONS.map((section) => (
          <LookupSection
            key={section.key}
            config={section}
            items={data[section.key]}
            onChange={handleChange}
          />
        ))}
      </div>
    </div>
  )
}
