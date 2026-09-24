'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MapPin, AlertCircle, CheckCircle2, Download, Eye, Clock, MessageCircle, Paperclip } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getRequests, updateStatus, updateAdminCc, type EngineRequest, type RequestStatus } from '@/services/engineService';
import { HrTravelLetter } from '@/modules/hr/hrTravelLetter.schema';
import { fmtDate, fmtDateTime } from '@/lib/utils';
import { commentsAPI } from '@/lib/apiClient';
import { createRequestUpdateNotifications } from '@/lib/notificationStore';
import { getAuthorizedManagerEmail } from '@/lib/companyDataStore';
import RequestDetailPage from '@/app/(dashboard)/requests/[id]/page';
import { CommentsTab, type Comment } from '@/components/request/CommentsTab';
import { InlineStatusSelect } from '@/components/ui/InlineStatusSelect';

const HR_LETTER_STATUS_LABELS: Record<string, string> = {
  new: 'New', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
};
const HR_LETTER_STATUS_COLORS: Record<string, string> = {
  new: 'bg-sky-100 text-sky-700', in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700', cancelled: 'bg-red-100 text-red-600',
};
const HR_LETTER_STATUS_DOTS: Record<string, string> = {
  new: 'bg-sky-500', in_progress: 'bg-blue-500', completed: 'bg-emerald-500', cancelled: 'bg-red-500',
};

// This route serves every HR-portal request detail link. Requests belonging
// to the hr_travel_letter module get the specialized Travel Reference view
// below; every other HR module falls back to the shared request detail page
// (same component used by /requests/[id] elsewhere in the app).
export default function HrRequestDetailRouter() {
  const params = useParams();
  const id = params?.id as string;
  const { data: session } = useSession();
  const [checkedModule, setCheckedModule] = useState<string | null>(null);

  useEffect(() => {
    const found = getRequests().find((r) => r.id === id);
    setCheckedModule(found?.module ?? "");
  }, [id]);

  if (checkedModule === null) return <div className="text-center py-8">Loading...</div>;
  // The Administration Team can see that a Travel request handed work off to
  // People Team, but it must not be able to open the letter itself. The
  // shared detail page otherwise renders this as the misleading "not found".
  if (id.startsWith("HRLTR-") && (checkedModule === "" || session?.user?.role === "Administration Team")) {
    return <HrTravelLetterAccessRestricted />;
  }
  if (checkedModule !== "hr_travel_letter") return <RequestDetailPage />;

  return <HrTravelLetterDetail id={id} />;
}

function HrTravelLetterAccessRestricted() {
  const router = useRouter();

  return (
    <Card className="mx-auto mt-10 max-w-2xl border-amber-200">
      <CardContent className="flex flex-col items-center px-8 py-12 text-center">
        <AlertCircle className="mb-4 h-10 w-10 text-amber-600" />
        <h1 className="text-xl font-semibold text-slate-900">People Team request — access restricted</h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600">
          This HR Travel Letter is managed by the People Team. The linked Travel request confirms that it was created,
          but Administration Team members do not have permission to view its contents.
        </p>
        <Button className="mt-6" variant="outline" onClick={() => router.back()}>
          Return to Travel Request
        </Button>
      </CardContent>
    </Card>
  );
}

// Passport / Invitation Letter / Visa Document are uploaded and registered on
// disk under the *original Travel request's* ID (they're copied by reference
// into the HR Letter's payload, not re-uploaded) — so we link using the
// attachment's own stored `url`, which already encodes the correct owning
// request ID, rather than the HR Letter's own id.
function AttachmentLink({ attachment }: { attachment: { name: string; url: string } }) {
  const isDownloadUrl = attachment.url.endsWith("/download")
  const previewUrl = isDownloadUrl ? attachment.url.slice(0, -"/download".length) : attachment.url
  const downloadUrl = attachment.url
  return (
    <div className="mt-3 w-full sm:mt-0 sm:w-auto sm:text-right">
      <Badge className="mb-2 bg-green-600">Uploaded</Badge>
      <p className="mb-2 max-w-full truncate text-xs text-gray-600 sm:max-w-[220px]" title={attachment.name}>{attachment.name}</p>
      <div className="flex flex-wrap items-center justify-start gap-x-3 gap-y-1 sm:justify-end">
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
        >
          <Eye className="h-3 w-3" /> Preview
        </a>
        <a
          href={downloadUrl}
          download={attachment.name}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
        >
          <Download className="h-3 w-3" /> Download
        </a>
      </div>
    </div>
  );
}

function HrTravelLetterDetail({ id }: { id: string }) {
  const [request, setRequest] = useState<EngineRequest | null>(null);
  const [travelRequest, setTravelRequest] = useState<EngineRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'comments' | 'attachments'>('details');
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    const allRequests = getRequests();
    const currentRequest = allRequests.find(r => r.id === id);

    if (currentRequest && currentRequest.module === 'hr_travel_letter') {
      setRequest(currentRequest);

      // Find linked travel request
      const payload = currentRequest.payload as HrTravelLetter;
      if (payload.linkedTravelRequestId) {
        const travel = allRequests.find(r => r.id === payload.linkedTravelRequestId);
        setTravelRequest(travel || null);
      }
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    setCommentsLoading(true);
    commentsAPI.list(id)
      .then((result) => setComments(Array.isArray(result?.data) ? result.data : []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!request) return <div className="text-center py-8 text-red-600">HR Letter request not found</div>;

  const payload = request.payload as HrTravelLetter;
  const missingDocs = !payload.passportAttachment || !payload.invitationLetterAttachment;
  const attachments = [payload.passportAttachment, payload.invitationLetterAttachment, ...(payload.visaDocumentAttachment ?? [])]
    .filter((attachment): attachment is NonNullable<typeof attachment> => Boolean(attachment));
  const canManageCc = (session?.user?.permissions ?? []).includes('manage_cc')
    || (session?.user?.permissions ?? []).includes('*')
    || session?.user?.role === 'Full Access'
    || session?.user?.role?.startsWith('People Team')
    || session?.user?.email?.toLowerCase() === request.requesterEmail?.toLowerCase();
  const canChangeStatus = (session?.user?.permissions ?? []).includes('update_status')
    || (session?.user?.permissions ?? []).includes('*')
    || session?.user?.role === 'Full Access';

  const handleAddComment = async (content: string, files: File[]) => {
    if (!session?.user?.id) return;
    const comment = await commentsAPI.create(request.id, content, session.user.id, session.user.name || 'User', session.user.email || '', files);
    setComments((current) => [...current, comment]);
  };

  const handleStatusChange = async (status: RequestStatus) => {
    const updated = await updateStatus(request.id, status, session?.user?.name || session?.user?.email || 'System');
    if (updated) setRequest(updated);
  };

  const handleComplete = async () => {
    if (missingDocs || completing) return;
    setCompleting(true);

    const actionUserId = session?.user?.id || 'USR-UNKNOWN';
    const actionUserName = session?.user?.name || session?.user?.email || 'People Team';
    const actionUserEmail = session?.user?.email || undefined;

    await updateStatus(request.id, 'completed', actionUserName);

    // Notify the Travel request's thread — Administration Team, the
    // requester, and the Direct Manager all need to know the letter is
    // ready, and this is where they'll already be watching for updates.
    const travelId = payload.linkedTravelRequestId;
    if (travelId) {
      const managerEmail = payload.directManagerName
        ? getAuthorizedManagerEmail(payload.directManagerName)
        : undefined;

      try {
        await commentsAPI.create(
          travelId,
          'HR Letter is ready. Please contact the People Team to collect your business trip letter.',
          actionUserId,
          actionUserName,
          actionUserEmail || 'hr@si-ware.com',
        );
      } catch {
        // Best-effort — the request is already marked completed either way.
      }

      createRequestUpdateNotifications({
        requestId: travelId,
        requestTitle: travelRequest?.title || request.title.replace(/^HR Letter - /, ''),
        module: 'travel',
        requestOwnerId: travelRequest?.requesterId || request.requesterId,
        requestOwnerEmail: travelRequest?.requesterEmail || request.requesterEmail,
        actionUserId,
        actionUserName,
        actionUserEmail,
        preview: 'HR Letter is ready',
        updateType: 'comment',
        ccEmails: managerEmail ? [managerEmail] : [],
      });
    }

    router.push('/departments/hr/services');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:space-y-6 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{request.title}</h1>
          <div className="mt-2">
            <InlineStatusSelect
              currentStatus={request.status}
              statuses={['new', 'in_progress', 'completed', 'cancelled']}
              statusLabels={HR_LETTER_STATUS_LABELS}
              statusColors={HR_LETTER_STATUS_COLORS}
              statusDot={HR_LETTER_STATUS_DOTS}
              onStatusChange={(status) => void handleStatusChange(status as RequestStatus)}
              canUpdateStatus={canChangeStatus}
            />
          </div>
        </div>
        <div className="text-left text-sm text-gray-600 sm:text-right">
          <p>Request ID: <span className="font-mono font-semibold">{request.id}</span></p>
          <p>Created: {fmtDateTime(request.createdAt)}</p>
        </div>
      </div>

      {/* 📋 TRAVEL REFERENCE (Read-only) */}
      <div className="flex gap-1 border-b px-0 sm:gap-6 sm:px-2">
        {[
          ['details', 'Details'],
          ['activity', `Activity (${request.statusHistory?.length ?? 0})`],
          ['comments', `Comments (${comments.length})`],
          ['attachments', `Attachments (${attachments.length})`],
        ].map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab as typeof activeTab)} className={`flex-1 whitespace-nowrap border-b-2 px-1 py-3 text-xs font-medium sm:flex-none sm:px-0 sm:text-sm ${activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>
            {tab === 'attachments' ? <><span className="sm:hidden">Files ({attachments.length})</span><span className="hidden sm:inline">{label}</span></> : label}
          </button>
        ))}
      </div>

      {activeTab === 'activity' && (
        <Card><CardContent className="space-y-4 py-6">
          {(request.statusHistory ?? []).length ? request.statusHistory!.map((entry, index) => {
            const isSystemCreation = index === 0 && entry.status === 'new' && entry.changedBy === 'System';
            return (
              <div key={`${entry.changedAt}-${index}`} className="flex gap-3 border-b pb-4 last:border-0">
                <Clock className="mt-0.5 h-5 w-5 text-blue-600" />
                <div className="text-sm">
                  <p className="font-medium">{isSystemCreation ? 'HR Travel Letter created' : `Status changed to ${entry.status.replace(/_/g, ' ')}`}</p>
                  {isSystemCreation && <p className="text-slate-600">Automatically created by the system from the linked Travel request.</p>}
                  <p className="text-slate-600">By {entry.changedBy || 'System'} · {fmtDateTime(entry.changedAt)}</p>
                </div>
              </div>
            );
          }) : <p className="py-8 text-center text-sm text-slate-500">No activity yet.</p>}
        </CardContent></Card>
      )}

      {activeTab === 'comments' && <CommentsTab
        requestId={request.id}
        comments={comments}
        onAddComment={handleAddComment}
        currentUserId={session?.user?.id}
        isLoading={commentsLoading}
        ccEmails={Array.isArray((request.payload as any)?.ccEmails) ? (request.payload as any).ccEmails : []}
        adminCc={request.adminCc ?? []}
        canEditCc={Boolean(canManageCc)}
        onAdminCcChange={(emails) => {
          updateAdminCc(request.id, emails);
          setRequest((current) => current ? { ...current, adminCc: emails } : current);
        }}
      />}

      {activeTab === 'attachments' && (
        <Card><CardContent className="space-y-3 py-6">
          {attachments.length ? attachments.map((attachment) => <div key={attachment.url} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4"><span className="flex min-w-0 items-start gap-2 text-sm font-medium"><Paperclip className="mt-0.5 h-4 w-4 shrink-0" /><span className="break-all">{attachment.name}</span></span><AttachmentLink attachment={attachment} /></div>) : <p className="py-8 text-center text-sm text-slate-500">No attachments available.</p>}
        </CardContent></Card>
      )}

      {activeTab === 'details' && <>
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Travel Request Reference
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Request Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-blue-200">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Request ID</p>
              <p className="font-mono text-sm font-semibold">{payload.linkedTravelRequestId}</p>
              <p className="mt-1 text-xs text-gray-500">
                Source Travel request is restricted to the Administration Team.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Submitted By</p>
              <p className="font-medium">{travelRequest?.requesterName || request.requesterName}</p>
              <p className="text-xs text-gray-600">{travelRequest?.requesterEmail || request.requesterEmail}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Travel Request Dates</p>
              <p className="font-medium text-sm">
                <span className="block">Created: {travelRequest ? fmtDateTime(travelRequest.createdAt) : '—'}</span>
                <span className="block text-gray-600">Modified: {travelRequest ? fmtDateTime(travelRequest.updatedAt) : '—'}</span>
              </p>
            </div>
          </div>

          {/* Travel Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Purpose of Trip</p>
              <p className="font-medium text-gray-900 whitespace-pre-wrap break-words">{payload.travelPurpose}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Destination</p>
              <p className="font-medium text-gray-900">{payload.destination}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Travel Dates</p>
              <p className="font-medium text-gray-900">
                {fmtDate(payload.travelDateFrom)} → {fmtDate(payload.travelDateTo)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Cost Center</p>
              <p className="font-medium text-gray-900">{payload.costCenter}</p>
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Direct Manager</p>
              <p className="font-medium text-gray-900">{payload.directManagerName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 📄 REQUIRED ATTACHMENTS */}
      <Card className={`border-l-4 ${missingDocs ? 'border-l-red-500' : 'border-l-green-500'}`}>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {missingDocs ? (
              <AlertCircle className="h-5 w-5 text-red-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
            Required Documents
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            {missingDocs ? '⚠️ Missing required documents' : '✅ All required documents provided'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Passport */}
          <div className={`flex flex-col gap-3 rounded-lg border-2 p-3 sm:flex-row sm:items-start sm:gap-4 sm:p-4 ${
            payload.passportAttachment
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex-1">
              <p className="text-sm font-semibold flex items-center gap-2">
                🛂 Passport <span className="text-red-600 text-lg">*</span>
              </p>
              <p className="text-xs text-gray-600 mt-1">Copy or scan of passport biographical page</p>
            </div>
            {payload.passportAttachment ? (
              <AttachmentLink attachment={payload.passportAttachment} />
            ) : (
              <Badge variant="outline" className="self-start bg-red-100 text-red-800 border-red-300 sm:self-auto">
                Missing
              </Badge>
            )}
          </div>

          {/* Invitation Letter */}
          <div className={`flex flex-col gap-3 rounded-lg border-2 p-3 sm:flex-row sm:items-start sm:gap-4 sm:p-4 ${
            payload.invitationLetterAttachment
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex-1">
              <p className="text-sm font-semibold flex items-center gap-2">
                📧 Invitation Letter <span className="text-red-600 text-lg">*</span>
              </p>
              <p className="text-xs text-gray-600 mt-1">Official invitation from host organization</p>
            </div>
            {payload.invitationLetterAttachment ? (
              <AttachmentLink attachment={payload.invitationLetterAttachment} />
            ) : (
              <Badge variant="outline" className="self-start bg-red-100 text-red-800 border-red-300 sm:self-auto">
                Missing
              </Badge>
            )}
          </div>

          {/* Optional Visa Document */}
          <div className="flex flex-col gap-3 rounded-lg border-2 border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-start sm:gap-4 sm:p-4">
            <div className="flex-1">
              <p className="text-sm font-semibold">📋 Visa Document</p>
              <p className="text-xs text-gray-600 mt-1">If visa is required for destination (optional)</p>
            </div>
            {payload.visaDocumentAttachment?.length ? (
              <AttachmentLink attachment={payload.visaDocumentAttachment[0]!} />
            ) : (
              <Badge variant="outline" className="self-start bg-amber-100 text-amber-800 border-amber-300 sm:self-auto">
                Optional
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status & Actions */}
      <div className="flex gap-2 justify-between items-center p-4 bg-gray-50 rounded-lg border">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            Back
          </Button>
        </div>
      </div>
      </>}
    </div>
  );
}
