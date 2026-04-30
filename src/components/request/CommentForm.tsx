"use client"

import { useState, useRef } from "react"
import { Send, FileUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface CommentFormProps {
  onSubmit: (content: string, attachments: File[]) => Promise<void>
  isLoading?: boolean
  placeholder?: string
}

export function CommentForm({
  onSubmit,
  isLoading = false,
  placeholder = "Add a comment... Use @mention to tag someone",
}: CommentFormProps) {
  const [content, setContent] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() && attachments.length === 0) return

    try {
      setIsSubmitting(true)
      console.log("CommentForm.handleSubmit:", { content: content.trim(), attachmentsCount: attachments.length })
      await onSubmit(content, attachments)
      setContent("")
      setAttachments([])
    } catch (error) {
      console.error("CommentForm error:", error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files || [])])
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="min-h-24 resize-none"
          disabled={isSubmitting}
        />
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Attachments ({attachments.length})</p>
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, idx) => (
              <Badge key={idx} variant="secondary" className="flex items-center gap-2">
                <FileUp className="h-3 w-3" />
                <span className="truncate max-w-[150px] text-xs">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="ml-1 hover:text-red-600"
                  disabled={isSubmitting}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
            disabled={isSubmitting}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
            className="gap-2"
          >
            <FileUp className="h-4 w-4" />
            Attach File
          </Button>
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={(!content.trim() && attachments.length === 0) || isSubmitting}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          {isSubmitting ? "Posting..." : "Comment"}
        </Button>
      </div>
    </form>
  )
}
