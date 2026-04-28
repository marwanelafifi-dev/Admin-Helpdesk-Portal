function getCcEmails(request) {
  const ccEmails = request?.payload?.ccEmails
  return Array.isArray(ccEmails) ? ccEmails.filter(Boolean) : []
}

function getSubmitterEmail(request) {
  return request?.requesterEmail || request?.submitterEmail || ""
}

export function simulateStatusChangeEmail(request, previousStatus, nextStatus) {
  const submitterEmail = getSubmitterEmail(request)
  const ccEmails = getCcEmails(request)
  const recipients = [submitterEmail, ...ccEmails].filter(Boolean)

  const message = {
    to: submitterEmail,
    cc: ccEmails,
    subject: `[Shipping] ${request?.title || "Request"} changed status`,
    body: {
      requestId: request?.id,
      previousStatus,
      nextStatus,
      sentAt: new Date().toISOString(),
    },
  }

  console.info("[emailService] Simulated status change email", message)
  console.info("[emailService] Recipients", recipients)

  return {
    recipients,
    message,
    sentAt: message.body.sentAt,
  }
}

export default simulateStatusChangeEmail
