'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MapPin, AlertCircle, CheckCircle2, Download, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getRequests, updateStatus, type EngineRequest } from '@/services/engineService';
import { HrTravelLetter } from '@/modules/hr/hrTravelLetter.schema';
import { fmtDate, fmtDateTime } from '@/lib/utils';
import { commentsAPI } from '@/lib/apiClient';
import { createRequestUpdateNotifications } from '@/lib/notificationStore';
import { getAuthorizedManagerEmail } from '@/lib/companyDataStore';
import RequestDetailPage from '@/app/(dashboard)/requests/[id]/page';

// This route serves every HR-portal request detail link. Requests belonging
// to the hr_travel_letter module get the specialized Travel Reference view
// below; every other HR module falls back to the shared request detail page
// (same component used by /requests/[id] elsewhere in the app).
export default function HrRequestDetailRouter() {
  const params = useParams();
  const id = params?.id as string;
  const [checkedModule, setCheckedModule] = useState<string | null>(null);

  useEffect(() => {
    const found = getRequests().find((r) => r.id === id);
    setCheckedModule(found?.module ?? "");
  }, [id]);

  if (checkedModule === null) return <div className="text-center py-8">Loading...</div>;
  if (checkedModule !== "hr_travel_letter") return <RequestDetailPage />;

  return <HrTravelLetterDetail id={id} />;
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
    <div className="text-right">
      <Badge className="bg-green-600 mb-2">Uploaded</Badge>
      <p className="text-xs text-gray-600 mb-2 max-w-[220px] truncate" title={attachment.name}>{attachment.name}</p>
      <div className="flex items-center justify-end gap-3">
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

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!request) return <div className="text-center py-8 text-red-600">HR Letter request not found</div>;

  const payload = request.payload as HrTravelLetter;
  const missingDocs = !payload.passportAttachment || !payload.invitationLetterAttachment;

  const handleComplete = async () => {
    if (missingDocs || completing) return;
    setCompleting(true);

    const actionUserId = session?.user?.id || 'USR-UNKNOWN';
    const actionUserName = session?.user?.name || session?.user?.email || 'HR Team';
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
          'HR Letter is ready. Please contact the HR Team to collect your business trip letter.',
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
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{request.title}</h1>
          <p className="text-gray-600 mt-1">
            <Badge variant={request.status === 'completed' ? 'secondary' : 'default'}>
              {request.status}
            </Badge>
          </p>
        </div>
        <div className="text-right text-sm text-gray-600">
          <p>Request ID: <span className="font-mono font-semibold">{request.id}</span></p>
          <p>Created: {fmtDateTime(request.createdAt)}</p>
        </div>
      </div>

      {/* 📋 TRAVEL REFERENCE (Read-only) */}
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
              {travelRequest ? (
                <Link
                  href={`/admin/all-requests?search=${payload.linkedTravelRequestId}`}
                  className="text-blue-600 hover:underline font-bold text-base block"
                  target="_blank"
                >
                  {payload.linkedTravelRequestId} ↗
                </Link>
              ) : (
                <p className="font-mono text-sm">{payload.linkedTravelRequestId}</p>
              )}
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
              <p className="font-medium text-gray-900">{payload.travelPurpose}</p>
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
          <div className={`flex items-start gap-4 p-4 rounded-lg border-2 ${
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
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                Missing
              </Badge>
            )}
          </div>

          {/* Invitation Letter */}
          <div className={`flex items-start gap-4 p-4 rounded-lg border-2 ${
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
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                Missing
              </Badge>
            )}
          </div>

          {/* Optional Visa Document */}
          <div className="flex items-start gap-4 p-4 rounded-lg border-2 bg-amber-50 border-amber-200">
            <div className="flex-1">
              <p className="text-sm font-semibold">📋 Visa Document</p>
              <p className="text-xs text-gray-600 mt-1">If visa is required for destination (optional)</p>
            </div>
            {payload.visaDocumentAttachment?.length ? (
              <AttachmentLink attachment={payload.visaDocumentAttachment[0]!} />
            ) : (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                Optional
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status & Actions */}
      <div className="flex gap-2 justify-between items-center p-4 bg-gray-50 rounded-lg border">
        <div>
          <p className="text-sm text-gray-600">
            Status: <span className="font-semibold">{request.status}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            Back
          </Button>
          <Button
            onClick={handleComplete}
            disabled={missingDocs || completing || request.status === 'completed'}
            className={missingDocs ? 'opacity-50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {completing ? 'Completing…' : 'Mark as Completed'}
          </Button>
        </div>
      </div>
    </div>
  );
}
