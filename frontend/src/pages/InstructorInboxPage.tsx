import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import SideNav from '../components/SideNav';
import { Alert } from '../components/Alerts';
import { useAuth } from '../contexts/AuthContext';
import { Course, InboxConversationSummary, InboxMessage, InboxUserSummary } from '../types';
import * as inboxApi from '../services/inbox';
import * as courseApi from '../services/courses';

const resolveRequestError = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: unknown; message?: unknown } | undefined;
    if (typeof data?.error === 'string' && data.error.trim()) return data.error;
    if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const fullName = (user: { first_name: string; last_name: string }) => {
  const name = `${user.first_name} ${user.last_name}`.trim();
  return name || 'Unknown';
};

const formatTimestamp = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

const InstructorInboxPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<InboxConversationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);

  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [recipients, setRecipients] = useState<InboxUserSummary[]>([]);
  const [recipientId, setRecipientId] = useState<number | ''>('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [composeCourseId, setComposeCourseId] = useState<number | ''>('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeBusy, setComposeBusy] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const selectedCounterparty = selectedConversation?.participants?.[0] ?? null;

  const loadConversations = async () => {
    setLoadingConversations(true);
    setError(null);
    try {
      const data = await inboxApi.getInboxConversations(80);
      setConversations(data);
    } catch (err) {
      setError(resolveRequestError(err, 'Failed to load inbox.'));
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId: number) => {
    setLoadingMessages(true);
    setError(null);
    try {
      const data = await inboxApi.getConversationMessages(conversationId, 200);
      setMessages(data);
    } catch (err) {
      setError(resolveRequestError(err, 'Failed to load messages.'));
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'instructor' && user.role !== 'admin') {
      navigate('/');
      return;
    }

    loadConversations();

    const interval = setInterval(() => {
      loadConversations();
      if (selectedId) {
        loadMessages(selectedId);
      }
    }, 15000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, selectedId]);

  const handleSelectConversation = async (id: number) => {
    setSelectedId(id);
    await loadMessages(id);
    try {
      await inboxApi.markConversationRead(id);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
      );
    } catch {
      // Non-blocking.
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!selectedId) return;
    const body = composerText.trim();
    if (!body) return;
    if (sending) return;

    setSending(true);
    setError(null);
    try {
      const message = await inboxApi.sendMessage(selectedId, body);
      setMessages((prev) => [...prev, message]);
      setComposerText('');
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? {
                ...c,
                last_message_body: message.body,
                last_message_at: message.created_at,
                last_message_sender_id: message.sender_id,
                unread_count: 0,
                updated_at: new Date().toISOString()
              }
            : c
        )
      );
    } catch (err) {
      setError(resolveRequestError(err, 'Failed to send message.'));
    } finally {
      setSending(false);
    }
  };

  const openCompose = async () => {
    setComposeOpen(true);
    setError(null);
    try {
      if (!recipients.length) {
        const data = await inboxApi.getInboxRecipients();
        setRecipients(data);
      }
      if (!courses.length) {
        const instructorCourses = await courseApi.getInstructorCourses();
        setCourses(instructorCourses);
      }
    } catch (err) {
      setError(resolveRequestError(err, 'Failed to load compose data.'));
    }
  };

  const closeCompose = () => {
    setComposeOpen(false);
    setRecipientId('');
    setComposeCourseId('');
    setComposeSubject('');
    setComposeBody('');
  };

  const handleCreateConversation = async (e: FormEvent) => {
    e.preventDefault();
    if (composeBusy) return;
    if (!user) return;
    if (!recipientId) {
      setError('Choose a recipient.');
      return;
    }

    const body = composeBody.trim();
    if (!body) {
      setError('Message body is required.');
      return;
    }

    setComposeBusy(true);
    setError(null);
    try {
      const resp = await inboxApi.createConversation({
        recipient_id: Number(recipientId),
        course_id: composeCourseId ? Number(composeCourseId) : null,
        subject: composeSubject.trim() || null,
        body
      });
      closeCompose();
      await loadConversations();
      setSelectedId(resp.conversation_id);
      await loadMessages(resp.conversation_id);
    } catch (err) {
      setError(resolveRequestError(err, 'Failed to start conversation.'));
    } finally {
      setComposeBusy(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex">
      <SideNav activePage="inbox" />

      <main className="flex-1 relative z-10 h-screen overflow-hidden pl-16 transition-all duration-300">
        <header className="absolute top-0 left-0 w-full pl-[calc(4rem+1.5rem)] pr-6 md:pl-[calc(4rem+2.5rem)] md:pr-10 py-6 flex items-center justify-between z-20 pointer-events-none">
          <div className="floating-tile animate-fade-in-up pointer-events-auto">
            <h1 className="text-lg text-zinc-900 font-bold tracking-tight flex items-center">
              Apollo
              <span className="text-zinc-400 mx-2 text-sm font-light">//</span>
              Inbox
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="status-dot acid" />
              <span className="txt-label">MESSAGING</span>
            </div>
          </div>

          <div className="flex items-center gap-3 animate-fade-in-up delay-100 pointer-events-auto">
            <button className="btn-primary text-sm" onClick={openCompose}>
              New Message
            </button>
          </div>
        </header>

        <div className="h-full overflow-y-auto px-6 md:px-10 pb-6 pt-32 scroll-smooth">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Conversation list */}
            <div className="lg:col-span-4 glass-card p-0 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
                <div>
                  <p className="txt-label">Inbox</p>
                  <p className="text-sm font-semibold text-zinc-900 mt-1">
                    {loadingConversations ? 'Loading...' : `${conversations.length} thread${conversations.length === 1 ? '' : 's'}`}
                  </p>
                </div>
                <button className="btn-secondary text-sm" onClick={loadConversations} disabled={loadingConversations}>
                  {loadingConversations ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              <div className="max-h-[72vh] overflow-y-auto">
                {conversations.map((c) => {
                  const active = c.id === selectedId;
                  const counterparty = c.participants?.[0];
                  const title = counterparty ? fullName(counterparty) : 'Conversation';
                  const subtitle = c.course_title ? c.course_title : c.subject ? c.subject : 'General';
                  const lastTime = c.last_message_at ? formatTimestamp(c.last_message_at) : '';
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleSelectConversation(c.id)}
                      className={`w-full text-left px-4 py-3 border-b border-zinc-100 hover:bg-zinc-50 transition-colors ${active ? 'bg-zinc-50' : 'bg-white'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-zinc-900 truncate">{title}</p>
                            {c.unread_count > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-acid text-zinc-900 border border-acid/40">
                                {c.unread_count}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{subtitle}</p>
                          {c.last_message_body && (
                            <p className="text-[12px] text-zinc-600 mt-1 truncate">{c.last_message_body}</p>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 font-mono shrink-0">{lastTime}</p>
                      </div>
                    </button>
                  );
                })}

                {!loadingConversations && conversations.length === 0 && (
                  <div className="p-6 text-center">
                    <p className="txt-label">No messages yet</p>
                    <p className="text-sm text-zinc-500 mt-2">
                      Start a conversation with a student to begin.
                    </p>
                    <button className="btn-primary text-sm mt-4" onClick={openCompose}>
                      New Message
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Message view */}
            <div className="lg:col-span-8 glass-card p-0 rounded-2xl overflow-hidden flex flex-col min-h-[72vh]">
              <div className="p-4 border-b border-zinc-200 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="txt-label">Thread</p>
                  <p className="text-sm font-semibold text-zinc-900 mt-1 truncate">
                    {selectedCounterparty ? fullName(selectedCounterparty) : 'Select a conversation'}
                  </p>
                  {selectedConversation?.course_title && (
                    <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
                      {selectedConversation.course_title}
                    </p>
                  )}
                </div>
                {selectedId && (
                  <button
                    className="btn-secondary text-sm"
                    onClick={() => loadMessages(selectedId)}
                    disabled={loadingMessages}
                  >
                    {loadingMessages ? 'Loading...' : 'Reload'}
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-white">
                {!selectedId && (
                  <div className="h-full flex items-center justify-center text-zinc-500">
                    Select a thread on the left.
                  </div>
                )}

                {selectedId && loadingMessages && (
                  <div className="text-zinc-500">Loading messages...</div>
                )}

                {selectedId && !loadingMessages && messages.length === 0 && (
                  <div className="text-zinc-500">No messages yet.</div>
                )}

                {selectedId &&
                  messages.map((m) => {
                    const isMine = m.sender_id === user.id;
                    const senderName = isMine ? 'You' : `${m.sender_first_name} ${m.sender_last_name}`.trim();
                    return (
                      <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 border shadow-sm ${isMine
                            ? 'bg-zinc-900 text-white border-zinc-900'
                            : 'bg-zinc-50 text-zinc-900 border-zinc-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <p className={`text-[10px] font-mono ${isMine ? 'text-zinc-200' : 'text-zinc-500'}`}>
                              {senderName}
                            </p>
                            <p className={`text-[10px] font-mono ${isMine ? 'text-zinc-200' : 'text-zinc-400'}`}>
                              {formatTimestamp(m.created_at)}
                            </p>
                          </div>
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                        </div>
                      </div>
                    );
                  })}
                <div ref={bottomRef} />
              </div>

              <form
                onSubmit={handleSendMessage}
                className="border-t border-zinc-200 bg-zinc-50 p-4 flex items-end gap-3"
              >
                <textarea
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder={selectedId ? 'Write a message...' : 'Select a conversation to reply...'}
                  className="w-full min-h-[44px] max-h-32 px-3 py-2 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:border-zinc-400 text-sm resize-none disabled:bg-zinc-100"
                  disabled={!selectedId || sending}
                />
                <button className="btn-primary text-sm" disabled={!selectedId || sending || !composerText.trim()}>
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Compose modal */}
      {composeOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={closeCompose} />
          <div className="relative w-full max-w-xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <p className="txt-label">Compose</p>
                <p className="text-sm font-semibold text-zinc-900 mt-1">New Message</p>
              </div>
              <button className="btn-secondary text-sm" onClick={closeCompose}>
                Close
              </button>
            </div>

            <form onSubmit={handleCreateConversation} className="p-5 space-y-4">
              <div>
                <label className="txt-label">To</label>
                <select
                  className="input mt-1"
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value ? Number(e.target.value) : '')}
                  disabled={composeBusy}
                >
                  <option value="">Select a student...</option>
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {fullName(r)} ({r.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="txt-label">Subject (optional)</label>
                <input
                  className="input mt-1"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="e.g. Homework 1 feedback"
                  disabled={composeBusy}
                />
              </div>

              <div>
                <label className="txt-label">Course (optional)</label>
                <select
                  className="input mt-1"
                  value={composeCourseId}
                  onChange={(e) => setComposeCourseId(e.target.value ? Number(e.target.value) : '')}
                  disabled={composeBusy}
                >
                  <option value="">General</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="txt-label">Message</label>
                <textarea
                  className="w-full mt-1 min-h-[120px] px-3 py-2 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-200 focus:border-zinc-400 text-sm resize-none disabled:bg-zinc-100"
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your message..."
                  disabled={composeBusy}
                />
                <p className="text-[11px] text-zinc-400 font-mono mt-1">
                  {composeBody.length} / 5000
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary text-sm" onClick={closeCompose} disabled={composeBusy}>
                  Cancel
                </button>
                <button className="btn-primary text-sm" disabled={composeBusy}>
                  {composeBusy ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorInboxPage;
