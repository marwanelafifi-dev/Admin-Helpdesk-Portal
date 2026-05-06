import { useState, useEffect } from "react"

export function useNewRequestsAndTasks() {
  const [newRequestsCount, setNewRequestsCount] = useState(0)
  const [newTasksCount, setNewTasksCount] = useState(0)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Check for new requests
    try {
      const requestsData = localStorage.getItem("admin_requests")
      if (requestsData) {
        const requests = JSON.parse(requestsData)
        const newRequests = requests.filter((r: any) => r.status === "new")
        setNewRequestsCount(newRequests.length)
      }
    } catch (e) {
      setNewRequestsCount(0)
    }

    // Check for new tasks
    try {
      const tasksData = localStorage.getItem("admin_tasks")
      if (tasksData) {
        const tasks = JSON.parse(tasksData)
        const newTasks = tasks.filter((t: any) => t.status === "todo")
        setNewTasksCount(newTasks.length)
      }
    } catch (e) {
      setNewTasksCount(0)
    }
  }, [])

  // Re-check when localStorage changes (listen for storage events)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const requestsData = localStorage.getItem("admin_requests")
        if (requestsData) {
          const requests = JSON.parse(requestsData)
          const newRequests = requests.filter((r: any) => r.status === "new")
          setNewRequestsCount(newRequests.length)
        }
      } catch (e) {
        setNewRequestsCount(0)
      }

      try {
        const tasksData = localStorage.getItem("admin_tasks")
        if (tasksData) {
          const tasks = JSON.parse(tasksData)
          const newTasks = tasks.filter((t: any) => t.status === "todo")
          setNewTasksCount(newTasks.length)
        }
      } catch (e) {
        setNewTasksCount(0)
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  return {
    newRequestsCount,
    newTasksCount,
    hasNewRequests: newRequestsCount > 0,
    hasNewTasks: newTasksCount > 0,
  }
}
