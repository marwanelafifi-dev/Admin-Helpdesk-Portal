"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Plus, Search, CheckCircle2, Clock, AlertCircle, Trash2, MessageSquare, Paperclip, AlertTriangle } from "lucide-react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useNewRequestsAndTasks } from "@/hooks/useNewRequestsAndTasks"
import { NewItemsAlert } from "@/components/ui/NewItemsAlert"
import { cn } from "@/lib/utils"
import { getTasks, createTask, updateTaskStatus, addTaskComment, type Task, type TaskStatus, type TaskAttachment, ADMIN_TEAM_ROLES } from "@/services/taskService"

const STATUS_COLORS: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  todo: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
  in_progress: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  in_review: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  completed: "Completed",
  cancelled: "Cancelled",
}

const STATUS_ICONS: Record<TaskStatus, React.ElementType> = {
  todo: Clock,
  in_progress: Clock,
  in_review: AlertCircle,
  completed: CheckCircle2,
  cancelled: AlertCircle,
}

interface ExtendedTask extends Task {
  _expanded?: boolean
}

export default function TasksPage() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<ExtendedTask[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all")
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [showNewTaskForm, setShowNewTaskForm] = useState(false)
  const [adminTeamMembers, setAdminTeamMembers] = useState<{ name: string; role: string }[]>([])
  const [roleError, setRoleError] = useState<string | null>(null)
  const [newTaskData, setNewTaskData] = useState({
    title: "",
    description: "",
    assignedTo: "",
  })
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachment[]>([])
  const [commentAttachments, setCommentAttachments] = useState<Record<string, TaskAttachment[]>>({})
  const { newRequestsCount, newTasksCount } = useNewRequestsAndTasks()

  useEffect(() => {
    setTasks(getTasks() as ExtendedTask[])
    // Fetch real assignable users (those with page:tasks permission)
    fetch("/api/users/assignable")
      .then((r) => r.json())
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setAdminTeamMembers(
            data.map((u: { name: string; role: string }) => ({
              name: u.name,
              role: u.role.toLowerCase().replace(/\s+/g, "_"),
            }))
          )
        }
      })
      .catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      const matchSearch = task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description.toLowerCase().includes(search.toLowerCase()) ||
        task.id.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || task.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [tasks, search, statusFilter])

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      inReview: tasks.filter((t) => t.status === "in_review").length,
      completed: tasks.filter((t) => t.status === "completed").length,
    }
  }, [tasks])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isComment?: boolean, taskId?: string) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const att = {
          id: `ATT-${Date.now()}-${Math.random()}`,
          name: file.name,
          url: event.target?.result as string,
          uploadedAt: new Date().toISOString(),
        }
        if (isComment && taskId) {
          setCommentAttachments({
            ...commentAttachments,
            [taskId]: [...(commentAttachments[taskId] || []), att],
          })
        } else {
          setTaskAttachments([...taskAttachments, att])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleCreateTask = () => {
    setRoleError(null)

    if (!newTaskData.title.trim()) {
      setRoleError("Task title is required")
      return
    }

    if (!newTaskData.assignedTo.trim()) {
      setRoleError("Team member selection is required")
      return
    }

    // Validate that assigned member is in admin team
    const assignedMember = adminTeamMembers.find(
      (member) => member.name.toLowerCase() === newTaskData.assignedTo.toLowerCase()
    )

    if (!assignedMember) {
      setRoleError(`"${newTaskData.assignedTo}" is not found in the administration team`)
      return
    }

    if (!ADMIN_TEAM_ROLES.includes(assignedMember.role)) {
      setRoleError(`"${newTaskData.assignedTo}" has role "${assignedMember.role}" but only Admin/Manager roles are allowed for team tasks`)
      return
    }

    const task = createTask({
      title: newTaskData.title,
      description: newTaskData.description,
      status: "todo",
      assignedTo: newTaskData.assignedTo,
      assignedBy: session?.user?.name || "Current User",
      attachments: taskAttachments,
    })
    setTasks([...tasks, task as ExtendedTask])
    setNewTaskData({ title: "", description: "", assignedTo: "" })
    setTaskAttachments([])
    setShowNewTaskForm(false)
    setRoleError(null)
  }

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    const updatedTask = updateTaskStatus(taskId, newStatus, "Current User")
    if (updatedTask) {
      setTasks(tasks.map((t) => (t.id === taskId ? updatedTask as ExtendedTask : t)))
    }
  }

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId)
  }

  const handleAddComment = (taskId: string) => {
    if (!commentText[taskId]?.trim()) return

    const updatedTask = addTaskComment(
      taskId,
      session?.user?.name || "Current User",
      commentText[taskId],
      commentAttachments[taskId]
    )
    if (updatedTask) {
      setTasks(tasks.map((t) => (t.id === taskId ? updatedTask as ExtendedTask : t)))
      setCommentText({ ...commentText, [taskId]: "" })
      setCommentAttachments({ ...commentAttachments, [taskId]: [] })
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Team Tasks</h1>
            <p className="text-gray-600 mt-2">Manage and track tasks across the administration team</p>
          </div>
          {(newRequestsCount > 0 || newTasksCount > 0) && (
            <NewItemsAlert requestsCount={newRequestsCount} tasksCount={newTasksCount} variant="icon" className="ml-4" />
          )}
          <Button
            onClick={() => setShowNewTaskForm(!showNewTaskForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white ml-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* New Task Form */}
      {showNewTaskForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Create New Task</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Role Error Message */}
            {roleError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900 text-sm">Validation Error</p>
                  <p className="text-red-700 text-sm mt-1">{roleError}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
              <Input
                placeholder="Enter task title..."
                value={newTaskData.title}
                onChange={(e) => {
                  setNewTaskData({ ...newTaskData, title: e.target.value })
                  setRoleError(null)
                }}
                className="border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                placeholder="Enter task description..."
                value={newTaskData.description}
                onChange={(e) => {
                  setNewTaskData({ ...newTaskData, description: e.target.value })
                  setRoleError(null)
                }}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            {/* Attachments Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Attachments (Optional)</label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="file"
                  id="task-file-input"
                  multiple
                  onChange={(e) => handleFileUpload(e, false)}
                  className="hidden"
                />
                <button
                  onClick={() => document.getElementById("task-file-input")?.click()}
                  className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Paperclip className="h-4 w-4" />
                  Add File
                </button>
              </div>
              {taskAttachments.length > 0 && (
                <div className="space-y-2">
                  {taskAttachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                      <a href={att.url} className="text-blue-600 hover:underline flex items-center gap-1">
                        <Paperclip className="h-3 w-3" /> {att.name}
                      </a>
                      <button
                        onClick={() => setTaskAttachments(taskAttachments.filter((a) => a.id !== att.id))}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign To (Admin/Manager only)
              </label>
              <select
                value={newTaskData.assignedTo}
                onChange={(e) => {
                  setNewTaskData({ ...newTaskData, assignedTo: e.target.value })
                  setRoleError(null)
                }}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select a team member...</option>
                {adminTeamMembers.map((member) => (
                  <option key={member.name} value={member.name}>
                    {member.name} ({member.role})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">Only administration team members (Admin/Manager roles) can be assigned</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateTask} className="bg-blue-600 hover:bg-blue-700 text-white">
                Create Task
              </Button>
              <Button onClick={() => {
                setShowNewTaskForm(false)
                setRoleError(null)
              }} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-0 bg-gradient-to-br from-slate-50 to-slate-100 shadow-sm">
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-gray-700 uppercase">Total Tasks</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-slate-50 to-slate-100 shadow-sm">
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-gray-700 uppercase">To Do</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.todo}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm">
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-blue-700 uppercase">In Progress</p>
            <p className="text-3xl font-bold text-blue-900 mt-2">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100 shadow-sm">
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-amber-700 uppercase">In Review</p>
            <p className="text-3xl font-bold text-amber-900 mt-2">{stats.inReview}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 shadow-sm">
          <CardContent className="p-6">
            <p className="text-xs font-semibold text-emerald-700 uppercase">Completed</p>
            <p className="text-3xl font-bold text-emerald-900 mt-2">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-sm font-semibold text-gray-700 self-center">Status:</span>
        {(["all", "todo", "in_progress", "in_review", "completed", "cancelled"] as const).map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
            className="text-xs"
          >
            {status === "all" ? "All" : STATUS_LABELS[status as TaskStatus]}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search tasks by title, description, or ID..."
          className="pl-10 border-gray-300"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tasks List */}
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No tasks found</p>
              <p className="text-gray-400 text-sm mt-1">Create a new task or adjust your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((task) => {
                const StatusIcon = STATUS_ICONS[task.status]
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "border rounded-lg p-4 transition-all hover:shadow-md",
                      STATUS_COLORS[task.status].border,
                      STATUS_COLORS[task.status].bg
                    )}
                  >
                    {/* Task Header */}
                    <div
                      className="flex items-start justify-between gap-4 cursor-pointer"
                      onClick={() => toggleExpand(task.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={cn("h-4 w-4", STATUS_COLORS[task.status].text)} />
                          <h3 className="font-semibold text-gray-900">{task.title}</h3>
                          <Badge className={cn("border-0 text-xs", STATUS_COLORS[task.status].bg, STATUS_COLORS[task.status].text)}>
                            {STATUS_LABELS[task.status]}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>{task.id}</span>
                          <span>•</span>
                          <span>Assigned to: {task.assignedTo}</span>
                          {task.comments.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" /> {task.comments.length}
                              </span>
                            </>
                          )}
                          {task.attachments.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Paperclip className="h-3 w-3" /> {task.attachments.length}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "text-xs font-medium px-3 py-1 rounded-lg border-0 cursor-pointer focus:outline-none",
                            STATUS_COLORS[task.status].bg,
                            STATUS_COLORS[task.status].text
                          )}
                        >
                          <option value="todo">{STATUS_LABELS.todo}</option>
                          <option value="in_progress">{STATUS_LABELS.in_progress}</option>
                          <option value="in_review">{STATUS_LABELS.in_review}</option>
                          <option value="completed">{STATUS_LABELS.completed}</option>
                          <option value="cancelled">{STATUS_LABELS.cancelled}</option>
                        </select>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedTaskId === task.id && (
                      <div className="mt-4 pt-4 border-t border-gray-300 space-y-4">
                        {/* Comments Section */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" /> Comments ({task.comments.length})
                          </h4>
                          {task.comments.length > 0 ? (
                            <div className="space-y-3">
                              {task.comments.map((comment) => (
                                <div key={comment.id} className="bg-white rounded p-3 border border-gray-200">
                                  <div className="flex items-start justify-between mb-1">
                                    <p className="font-medium text-sm text-gray-900">{comment.author}</p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(comment.createdAt).toLocaleDateString("en-US", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </p>
                                  </div>
                                  <p className="text-sm text-gray-700">{comment.content}</p>
                                  {comment.attachments && comment.attachments.length > 0 && (
                                    <div className="mt-2 flex gap-2">
                                      {comment.attachments.map((att) => (
                                        <a
                                          key={att.id}
                                          href={att.url}
                                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                          <Paperclip className="h-3 w-3" /> {att.name}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No comments yet</p>
                          )}
                          {/* Comment Input Form */}
                          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                            <textarea
                              placeholder="Add a comment..."
                              value={commentText[task.id] || ""}
                              onChange={(e) =>
                                setCommentText({ ...commentText, [task.id]: e.target.value })
                              }
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={3}
                            />

                            {/* Comment Attachments */}
                            <div>
                              <button
                                onClick={() => {
                                  const fileInput = document.getElementById(`comment-file-input-${task.id}`) as HTMLInputElement
                                  fileInput?.click()
                                }}
                                className="px-2 py-1 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-50 flex items-center gap-1"
                              >
                                <Paperclip className="h-3 w-3" />
                                Add Attachment
                              </button>
                              <input
                                id={`comment-file-input-${task.id}`}
                                type="file"
                                multiple
                                onChange={(e) => handleFileUpload(e, true, task.id)}
                                className="hidden"
                              />
                              {commentAttachments[task.id]?.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {commentAttachments[task.id].map((att) => (
                                    <div
                                      key={att.id}
                                      className="flex items-center justify-between text-xs bg-gray-50 p-1.5 rounded"
                                    >
                                      <a href={att.url} className="text-blue-600 hover:underline flex items-center gap-1">
                                        <Paperclip className="h-3 w-3" /> {att.name}
                                      </a>
                                      <button
                                        onClick={() =>
                                          setCommentAttachments({
                                            ...commentAttachments,
                                            [task.id]: commentAttachments[task.id].filter((a) => a.id !== att.id),
                                          })
                                        }
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => handleAddComment(task.id)}
                              disabled={!commentText[task.id]?.trim()}
                              className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                              Add Comment
                            </button>
                          </div>
                        </div>

                        {/* Activity Tab */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Activity</h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {task.activity.map((act) => (
                              <div key={act.id} className="text-xs bg-white rounded p-2 border border-gray-200">
                                <p className="font-medium text-gray-900">{act.description}</p>
                                <p className="text-gray-500 mt-0.5">
                                  {act.changedBy} • {new Date(act.changedAt).toLocaleDateString("en-US", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Attachments */}
                        {task.attachments.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <Paperclip className="h-4 w-4" /> Attachments ({task.attachments.length})
                            </h4>
                            <div className="flex gap-2 flex-wrap">
                              {task.attachments.map((att) => (
                                <a
                                  key={att.id}
                                  href={att.url}
                                  className="text-xs bg-white border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 flex items-center gap-1"
                                >
                                  <Paperclip className="h-3 w-3" /> {att.name}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
