export type TaskStatus = "todo" | "in_progress" | "in_review" | "completed" | "cancelled"

// Administration team roles only
export const ADMIN_TEAM_ROLES = ["Administration Team", "Full Access"]

export interface TaskAttachment {
  id: string
  name: string
  url: string
  uploadedAt: string
}

export interface TaskActivity {
  id: string
  type: "created" | "status_changed" | "comment_added" | "attachment_added" | "assigned"
  changedBy: string
  changedAt: string
  description: string
  oldValue?: string
  newValue?: string
}

export interface TaskComment {
  id: string
  author: string
  content: string
  attachments?: TaskAttachment[]
  createdAt: string
  updatedAt?: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  assignedTo: string
  assignedBy: string
  createdAt: string
  updatedAt: string
  comments: TaskComment[]
  attachments: TaskAttachment[]
  activity: TaskActivity[]
  priority?: "low" | "medium" | "high"
  /** Email addresses copied on all task notifications. */
  ccEmails?: string[]
}

const TASKS_KEY = "admin_tasks"

export function getTasks(): Task[] {
  if (typeof window === "undefined") return []
  const tasks = localStorage.getItem(TASKS_KEY)
  return tasks ? JSON.parse(tasks) : []
}

// Single chokepoint for persisting tasks. Also broadcasts a same-tab event
// so the Sidebar / dashboard badges refresh without a page reload — the
// native `storage` event only fires in OTHER tabs.
function saveTasks(tasks: Task[]): void {
  if (typeof window === "undefined") return
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
  try { window.dispatchEvent(new Event("arp:storage")) } catch {}
}

export function createTask(task: Omit<Task, "id" | "createdAt" | "updatedAt" | "comments" | "activity"> & { attachments?: TaskAttachment[] }): Task {
  const id = `TSK-${Date.now()}`
  const now = new Date().toISOString()

  const newTask: Task = {
    ...task,
    id,
    createdAt: now,
    updatedAt: now,
    comments: [],
    attachments: task.attachments || [],
    activity: [
      {
        id: `ACT-${Date.now()}`,
        type: "created",
        changedBy: task.assignedBy,
        changedAt: now,
        description: `Task created by ${task.assignedBy}`,
      },
    ],
  }

  if (typeof window !== "undefined") {
    const tasks = getTasks()
    tasks.push(newTask)
    saveTasks(tasks)
  }

  return newTask
}

export function updateTaskStatus(taskId: string, newStatus: TaskStatus, changedBy: string): Task | null {
  if (typeof window === "undefined") return null

  const tasks = getTasks()
  const task = tasks.find((t) => t.id === taskId)
  if (!task) return null

  const oldStatus = task.status
  const now = new Date().toISOString()

  task.status = newStatus
  task.updatedAt = now
  task.activity.push({
    id: `ACT-${Date.now()}`,
    type: "status_changed",
    changedBy,
    changedAt: now,
    description: `Status changed from ${oldStatus} to ${newStatus}`,
    oldValue: oldStatus,
    newValue: newStatus,
  })

  saveTasks(tasks)
  return task
}

export function addTaskComment(taskId: string, author: string, content: string, attachments?: TaskAttachment[]): Task | null {
  if (typeof window === "undefined") return null

  const tasks = getTasks()
  const task = tasks.find((t) => t.id === taskId)
  if (!task) return null

  const now = new Date().toISOString()
  const commentId = `CMT-${Date.now()}`

  task.comments.push({
    id: commentId,
    author,
    content,
    attachments,
    createdAt: now,
  })

  task.activity.push({
    id: `ACT-${Date.now()}`,
    type: "comment_added",
    changedBy: author,
    changedAt: now,
    description: `${author} added a comment`,
  })

  task.updatedAt = now
  saveTasks(tasks)
  return task
}

export function addTaskAttachment(taskId: string, attachment: TaskAttachment, addedBy: string): Task | null {
  if (typeof window === "undefined") return null

  const tasks = getTasks()
  const task = tasks.find((t) => t.id === taskId)
  if (!task) return null

  const now = new Date().toISOString()

  task.attachments.push(attachment)

  task.activity.push({
    id: `ACT-${Date.now()}`,
    type: "attachment_added",
    changedBy: addedBy,
    changedAt: now,
    description: `${addedBy} added attachment: ${attachment.name}`,
  })

  task.updatedAt = now
  saveTasks(tasks)
  return task
}

export function getTaskById(taskId: string): Task | undefined {
  return getTasks().find((t) => t.id === taskId)
}

export function deleteTask(taskId: string): boolean {
  if (typeof window === "undefined") return false

  const tasks = getTasks()
  const filtered = tasks.filter((t) => t.id !== taskId)
  saveTasks(filtered)
  return filtered.length < tasks.length
}
