import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/options"
import { getPrisma } from "@/server/engine/prisma"
import type { Prisma } from "@prisma/client"

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
const MODEL = "llama-3.1-8b-instant"

const SYSTEM_PROMPT = `You are a helpful assistant for the Admin Request Platform (ARP) at SI-Ware.
Your job is to help employees submit requests by asking them the right questions and submitting on their behalf.

Available request modules and their required fields:

1. SHIPPING - For sending packages or documents
   Required: title, recipientName, recipientAddress, carrier (DHL/FedEx/UPS/Aramex/Other), description
   Optional: trackingNumber, weight, notes

2. MAINTENANCE - For reporting facility or equipment issues
   Required: title, location, issueDescription, priority (high/medium/low)
   Optional: notes

3. PURCHASE - For buying items or services
   Required: title, itemDescription, quantity, estimatedPrice, supplier
   Optional: notes, budgetCode

4. EVENT - For organizing company events
   Required: title, eventDate (YYYY-MM-DD), eventLocation, attendeesCount, eventDescription
   Optional: notes

5. TRAVEL - For business travel requests
   Required: title, destination, travelDate (YYYY-MM-DD), returnDate (YYYY-MM-DD), travelPurpose
   Optional: notes, hotelRequired

6. HR - For HR requests (onboarding or offboarding)
   Required: title, hrType (onboarding/offboarding), employeeName, employeeId, department, jobTitle
   Optional: notes, startDate or lastWorkingDay

Guidelines:
- Greet the user and ask what type of request they need
- Ask questions ONE AT A TIME — don't ask multiple questions at once
- Be friendly, concise, and professional
- Support both English and Arabic naturally
- Once you have ALL required fields, call the submit_request function
- Always confirm what you're about to submit before calling the function
- If user says something unclear, ask for clarification`

const TOOLS = [
  {
    type: "function",
    function: {
      name: "submit_request",
      description: "Submit a request on behalf of the user after collecting all required information",
      parameters: {
        type: "object",
        properties: {
          module: {
            type: "string",
            enum: ["shipping", "maintenance", "purchase", "event", "travel", "hr"],
            description: "The module/type of the request"
          },
          title: {
            type: "string",
            description: "A clear title for the request"
          },
          payload: {
            type: "object",
            description: "All collected field values for this request"
          }
        },
        required: ["module", "title", "payload"]
      }
    }
  }
]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "AI assistant not configured" }, { status: 503 })
  }

  const { messages } = await req.json() as { messages: { role: string; content: string }[] }

  try {
    // Call Groq API
    const groqRes = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        tools: TOOLS,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    if (!groqRes.ok) {
      const err = await groqRes.text()
      console.error("[ai-assistant] Groq error:", err)
      return NextResponse.json({ error: "AI service error" }, { status: 502 })
    }

    const groqData = await groqRes.json() as {
      choices: Array<{
        message: {
          role: string
          content: string | null
          tool_calls?: Array<{
            id: string
            function: { name: string; arguments: string }
          }>
        }
        finish_reason: string
      }>
    }

    const choice = groqData.choices[0]
    const message = choice.message

    // If AI wants to submit a request
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0]
      const args = JSON.parse(toolCall.function.arguments) as {
        module: string
        title: string
        payload: Record<string, unknown>
      }
      args.module = args.module.toLowerCase()

      // Submit the request via existing API
      const prisma = getPrisma()
      const newRequest = await prisma.request.create({
        data: {
          module: args.module,
          title: args.title,
          status: "new",
          payload: args.payload as Prisma.InputJsonValue,
          requesterId: session.user.id,
          statusHistory: [
            {
              status: "new",
              changedBy: session.user.id,
              changedByName: session.user.name ?? session.user.email ?? "AI Assistant",
              changedAt: new Date().toISOString(),
              comment: "Submitted via AI Assistant",
            },
          ] as Prisma.InputJsonValue,
        },
      })

      // Create notification for admins
      const adminUsers = await prisma.user.findMany({
        where: { role: "admin" },
        select: { id: true },
      })
      if (adminUsers.length > 0) {
        await prisma.notification.createMany({
          data: adminUsers.map((admin) => ({
            type: "admin_alert" as const,
            title: `New ${args.module} Request: ${args.title}`,
            message: `${session.user.name ?? session.user.email} submitted a new request via AI Assistant.`,
            userId: admin.id,
            requestId: newRequest.id,
            link: `/${args.module}/${newRequest.id}`,
          })),
        })
      }

      return NextResponse.json({
        role: "assistant",
        content: `✅ تم إرسال طلبك بنجاح!\n\n**Request ID:** ${newRequest.id}\n**Module:** ${args.module.toUpperCase()}\n**Title:** ${args.title}\n\nسيتم إشعار فريق الإدارة الآن. يمكنك متابعة طلبك من صفحة "My Requests".`,
        requestId: newRequest.id,
        module: args.module,
      })
    }

    // Normal text response
    return NextResponse.json({
      role: "assistant",
      content: message.content ?? "Sorry, I couldn't process that. Please try again.",
    })

  } catch (err) {
    console.error("[ai-assistant] Error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
