import { useState, useCallback } from "react"

export function useExpandedRows() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const isExpanded = useCallback((id: string) => expandedRows.has(id), [expandedRows])

  const collapseAll = useCallback(() => {
    setExpandedRows(new Set())
  }, [])

  return { expandedRows, toggleRow, isExpanded, collapseAll }
}
