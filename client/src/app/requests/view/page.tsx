"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/Card';
import Badge from '@/components/Badge';
import Button from '@/components/Button';
import TextArea from '@/components/TextArea';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { api, ApiError } from '@/lib/api';

type RequestRecord = {
  id: string;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  created_at: string;
  ai_priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY' | null;
  ai_summary?: string | null;
  ai_recommended_action?: string | null;
  ai_response_draft?: string | null;
  tenant?: {
    id: string;
    full_name: string;
    email: string;
    role: 'TENANT' | 'MANAGER';
  };
};

type MessageRecord = {
  id: string;
  body: string;
  created_at: string;
  read_at?: string | null;
  sender: {
    id: string;
    full_name: string;
    role: 'TENANT' | 'MANAGER';
  };
};

const badgeVariantFromPriority = (priority?: string | null) => {
  switch (priority) {
    case 'EMERGENCY':
      return 'emergency' as const;
    case 'HIGH':
      return 'high' as const;
    case 'MEDIUM':
      return 'medium' as const;
    case 'LOW':
      return 'low' as const;
    default:
      return 'default' as const;
  }
};

const badgeVariantFromStatus = (status: RequestRecord['status']) => {
  switch (status) {
    case 'RESOLVED':
      return 'success' as const;
    case 'IN_PROGRESS':
      return 'info' as const;
    case 'CLOSED':
      return 'default' as const;
    default:
      return 'medium' as const;
  }
};

export default function RequestDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const requestId = searchParams.get('id') ?? '';

  const [request, setRequest] = useState<RequestRecord | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);

  const dashboardHref = user?.role === 'MANAGER' ? '/manager/dashboard' : '/tenant/dashboard';

  const loadRequestData = useCallback(async (showSpinner = false) => {
    if (!token || !requestId) return;

    if (showSpinner) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const [requestData, messageData] = await Promise.all([
        api<RequestRecord>(`/api/maintenance/${requestId}`, { token }),
        api<MessageRecord[]>(`/api/maintenance/${requestId}/messages`, { token }),
      ]);
      setRequest(requestData);
      setMessages(messageData);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
        setError('Request not found or you do not have access to it.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load request details.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, requestId]);

  useEffect(() => {
    void loadRequestData(true);
  }, [loadRequestData]);

  useEffect(() => {
    if (user?.role === 'MANAGER' && request?.ai_response_draft && draft.trim().length === 0) {
      setDraft(request.ai_response_draft);
    }
  }, [user?.role, request?.ai_response_draft, draft]);

  const canSend = useMemo(() => draft.trim().length > 0 && draft.trim().length <= 2000, [draft]);

  const handleSend = async () => {
    if (!token || !requestId || !canSend) return;

    setSending(true);
    setMessageError(null);

    try {
      await api(`/api/maintenance/${requestId}/messages`, {
        method: 'POST',
        token,
        body: { body: draft.trim() },
      });
      setDraft('');
      await loadRequestData(false);
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleAiDraft = () => {
    if (request?.ai_response_draft) {
      setDraft(request.ai_response_draft);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="space-y-4 p-6 text-center">
          <h1 className="text-2xl font-semibold text-white">Request unavailable</h1>
          <p className="text-gray-300">{error ?? 'This request could not be loaded.'}</p>
          <div className="flex justify-center gap-3">
            <Link href={dashboardHref}>
              <Button>Back to dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/70">Maintenance request</p>
          <h1 className="text-3xl font-bold text-white">{request.title}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={dashboardHref}>
            <Button variant="secondary">Back</Button>
          </Link>
          <Button variant="secondary" onClick={() => loadRequestData(false)} disabled={refreshing}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge label={request.status.replace('_', ' ')} variant={badgeVariantFromStatus(request.status)} />
                <Badge label={request.ai_priority ?? 'AI Pending'} variant={badgeVariantFromPriority(request.ai_priority)} />
              </div>
              <p className="text-sm text-gray-400">Created {new Date(request.created_at).toLocaleString()}</p>
              {request.tenant ? (
                <p className="text-sm text-gray-300">
                  Tenant: <span className="font-medium text-white">{request.tenant.full_name}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Description</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-100">{request.description}</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">AI Summary</p>
                <p className="mt-3 text-sm leading-6 text-gray-100">{request.ai_summary || 'No AI summary available yet.'}</p>
              </div>
              <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-200/80">AI Recommended Action</p>
                <p className="mt-3 text-sm leading-6 text-gray-100">
                  {request.ai_recommended_action || 'No recommended action available yet.'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="space-y-5 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Request thread</h2>
              <p className="text-sm text-gray-400">REST-based messaging for the MVP, refresh any time to pull updates.</p>
            </div>
            <Badge label={`${messages.length} message${messages.length === 1 ? '' : 's'}`} variant="info" />
          </div>

          <div className="max-h-[28rem] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-4">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-gray-400">
                No messages yet. Start the thread below.
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.sender.id === user?.id;
                return (
                  <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-lg ${
                        isOwn
                          ? 'bg-cyan-500/20 text-cyan-50 ring-1 ring-cyan-400/30'
                          : 'bg-white/10 text-gray-100 ring-1 ring-white/10'
                      }`}
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold">{message.sender.full_name}</span>
                        <Badge label={message.sender.role} variant={message.sender.role === 'MANAGER' ? 'info' : 'default'} />
                        <span className="text-gray-400">{new Date(message.created_at).toLocaleString()}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-medium text-white">Send a message</h3>
              {user?.role === 'MANAGER' && request.ai_response_draft ? (
                <Button variant="secondary" size="sm" onClick={handleAiDraft}>
                  Draft AI Reply
                </Button>
              ) : null}
            </div>

            <TextArea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={user?.role === 'MANAGER' ? 'Write a reply to the tenant...' : 'Add more detail for the manager...'}
              rows={6}
              maxLength={2000}
            />
            <div className="flex items-center justify-between gap-3 text-xs text-gray-400">
              <span>{draft.trim().length}/2000 characters</span>
              {user?.role === 'MANAGER' ? <span>AI text is editable and never auto-sends.</span> : null}
            </div>
            {messageError ? <p className="text-sm text-red-300">{messageError}</p> : null}
            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="secondary" onClick={() => router.refresh()}>
                Refresh page
              </Button>
              <Button onClick={handleSend} disabled={!canSend || sending}>
                {sending ? 'Sending...' : 'Send message'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
