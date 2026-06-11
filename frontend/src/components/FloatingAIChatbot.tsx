"use client";

import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, Sparkles, MessageCircle, Send, Wand2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGuidedReporting } from '../hooks/useGuidedReporting';
import { streamChatWithAssistant } from '../utils/api';
import { getGuidedReportingSystemPrompt, isReportingRoute } from '../utils/guidedReporting';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type FormFieldSuggestion = {
  field: string;
  value: string;
};

const POLICY_MATRIX: Array<{
  route: RegExp;
  roleRules: Record<string, string>;
  defaultRule: string;
}> = [
  {
    route: /^\/students/,
    roleRules: {
      admin: 'Allow guidance for student CRUD, verification checks, and record quality assurance.',
      'dean-of-students': 'Focus on student discipline context, profile interpretation, and intervention guidance.',
      secretary: 'Focus on data entry quality and profile updates without punitive recommendations.',
      'chief-security-officer': 'Only suggest read-only student lookups unless user explicitly has edit controls.',
      staff: 'Focus on lookup and reporting pathways; avoid advising direct record governance actions.',
    },
    defaultRule: 'Provide safe student-directory guidance and require confirmation before sensitive updates.',
  },
  {
    route: /^\/cases/,
    roleRules: {
      admin: 'Allow full case workflow guidance from intake to closure including governance checks.',
      'dean-of-students': 'Prioritize adjudication steps, sanctions policy consistency, and student fairness.',
      'assistant-dean': 'Focus on investigation progress, evidence quality, and escalation criteria.',
      secretary: 'Focus on intake formatting, timeline updates, and documentation completeness.',
      'chief-security-officer': 'Focus on incident facts, evidence handling, and safety escalation.',
    },
    defaultRule: 'Provide case management guidance with strict evidence-first recommendations.',
  },
  {
    route: /^\/inbox/,
    roleRules: {
      admin: 'Guide analytics, trend interpretation, and export quality checks.',
      'dean-of-students': 'Guide decision-ready summaries and fairness-aware interpretation.',
      secretary: 'Guide clean report preparation and formatting for meetings.',
    },
    defaultRule: 'Guide report filters, exports, and concise interpretation of metrics.',
  },
  {
    route: /^\/admin/,
    roleRules: {
      admin: 'Allow user management, role governance, and policy-driven account operations guidance.',
    },
    defaultRule: 'Do not suggest privileged admin actions unless clearly available to this role.',
  },
  {
    route: /^\/settings/,
    roleRules: {
      admin: 'Allow account/security guidance and profile maintenance flows.',
    },
    defaultRule: 'Focus on personal account settings and safe profile maintenance.',
  },
  {
    route: /^\/make-report/,
    roleRules: {
      student: 'Guide logged-in reporting with step-by-step intake for disciplinary or maintenance issues.',
      general_user: 'Guide incident reporting, clarify whether a student is involved, and explain anonymous handling.',
    },
    defaultRule: 'Run guided reporting: category, narrative, title, location, date, category-specific details, anonymity choice, then review before submit.',
  },
  {
    route: /^\/anonymous-report/,
    roleRules: {},
    defaultRule: 'Guide anonymous reporting step by step. Never ask for identity. Explain tracking codes and optional contact email for updates only.',
  },
];

function getLocationAwareSystemPrompt(pathname: string, role: string | undefined) {
  const roleKey = (role || 'unknown').toLowerCase();
  const matchedPolicy = POLICY_MATRIX.find((entry) => entry.route.test(pathname));
  const contextualRule = matchedPolicy?.roleRules[roleKey] || matchedPolicy?.defaultRule || 'Guide only the currently visible route with practical, low-risk steps.';

  return [
    'You are Campus Reports AI for a university discipline-management platform.',
    'Always identify yourself as "Campus Reports AI" and never call yourself "AI Assistant".',
    'Structure responses with short headings and bullets when possible for readability.',
    'Respond in under 8 bullet points or 1 short paragraph unless asked for depth.',
    'Never invent records, IDs, law, or institutional policy text.',
    'If you are unsure, ask for confirmation and state exactly what to verify in the UI.',
    'When the user asks to fill forms, prefer exact visible field labels/names and include one optional XML block exactly once: <form_suggestion>[{"field":"fieldName","value":"proposed value"}]</form_suggestion>.',
    'Only include fields that are likely visible on this page, skip unknown fields, and avoid guessing hidden/system fields.',
    `User role: ${role || 'unknown'}. Respect least privilege and avoid unauthorized actions.`,
    `Current route: ${pathname}. ${contextualRule}`,
  ].join(' ');
}

function storageKey(pathname: string, userId: string | undefined) {
  return `ai_chat:${userId || 'anonymous'}:${pathname}`;
}

function parseFormSuggestion(text: string): FormFieldSuggestion[] {
  const match = text.match(/<form_suggestion>([\s\S]*?)<\/form_suggestion>/i);
  if (!match?.[1]) return [];

  try {
    const parsed = JSON.parse(match[1]) as Array<{ field?: string; value?: string }>;
    return parsed
      .filter((item) => typeof item.field === 'string' && typeof item.value === 'string')
      .map((item) => ({ field: item.field!.trim(), value: item.value! }))
      .filter((item) => item.field.length > 0);
  } catch {
    return [];
  }
}

function stripFormSuggestion(text: string) {
  return text.replace(/<form_suggestion>[\s\S]*?<\/form_suggestion>/gi, '').trim();
}

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function getGreetingFallback(input: string) {
  const normalized = normalize(input);
  if (!normalized) return null;
  const greetingPattern = /^(hi|hello|hey|good morning|good afternoon|good evening|yo|hola)\b[!.! ]*$/i;
  if (!greetingPattern.test(normalized)) return null;

  return "I'm Campus Reports AI 👋. I can help with search, reports, cases, students, and form guidance on this page.";
}

function findBestFieldElement(field: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null {
  const normalizedField = normalize(field);
  const controls = Array.from(document.querySelectorAll('input, textarea, select')) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
  const visibleControls = controls.filter((control) => !(control instanceof HTMLInputElement && control.type === 'hidden') && !control.disabled);

  const byNameOrId = visibleControls.find((control) => {
    const values = [control.name, control.id, control.getAttribute('aria-label') || '', control.getAttribute('placeholder') || ''];
    return values.some((value) => normalize(value || '') === normalizedField);
  });

  if (byNameOrId) return byNameOrId;

  const byContains = visibleControls.find((control) => {
    const values = [control.name, control.id, control.getAttribute('aria-label') || '', control.getAttribute('placeholder') || ''];
    return values.some((value) => normalize(value || '').includes(normalizedField));
  });

  return byContains || null;
}

function applyFormSuggestions(suggestions: FormFieldSuggestion[]) {
  let applied = 0;
  for (const suggestion of suggestions) {
    const target = findBestFieldElement(suggestion.field);
    if (!target) continue;

    target.focus();
    if (target instanceof HTMLSelectElement) {
      const option = Array.from(target.options).find((candidate) => {
        return normalize(candidate.value) === normalize(suggestion.value) || normalize(candidate.text) === normalize(suggestion.value);
      });
      if (!option) continue;
      target.value = option.value;
    } else {
      target.value = suggestion.value;
    }
    target.dispatchEvent(new Event('input', { bubbles: true }));
    target.dispatchEvent(new Event('change', { bubbles: true }));
    applied += 1;
  }

  return applied;
}

const FAB_SIZE = 56;
const FAB_MARGIN = 20;
const PANEL_GAP = 12;
const PANEL_HEIGHT = 416;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getDefaultLauncherPosition() {
  if (typeof window === 'undefined') {
    return { x: 0, y: 0 };
  }

  return {
    x: window.innerWidth - FAB_SIZE - FAB_MARGIN,
    y: window.innerHeight - FAB_SIZE - FAB_MARGIN,
  };
}

function getReportingWelcome(pathname: string) {
  if (pathname === '/anonymous-report') {
    return "I'm Campus Reports AI 👋. I can guide you through an anonymous report step by step. Tap **Start guided report** below.";
  }
  if (pathname === '/make-report') {
    return "I'm Campus Reports AI 👋. I can walk you through this report and fill the form as we go. Tap **Start guided report** below.";
  }
  return "I'm Campus Reports AI 👋. Ask me what you want to do on this page, and I'll guide you step-by-step.";
}

export default function FloatingAIChatbot() {
  const pathname = usePathname();
  const { user } = useAuth();
  const reportingRoute = isReportingRoute(pathname || '');
  const [autoStartGuided] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('guided') === 'true';
  });
  const guided = useGuidedReporting({
    pathname: pathname || '',
    autoStart: autoStartGuided,
  });
  const [isOpen, setIsOpen] = useState(autoStartGuided);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSuggestions, setPendingSuggestions] = useState<FormFieldSuggestion[]>([]);
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [launcherPosition, setLauncherPosition] = useState(getDefaultLauncherPosition);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef({
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  });

  const systemPrompt = useMemo(() => {
    if (reportingRoute && guided.reportingContext) {
      return getGuidedReportingSystemPrompt(pathname || '', guided.reportingContext.mode);
    }
    return getLocationAwareSystemPrompt(pathname, user?.role);
  }, [guided.reportingContext, pathname, reportingRoute, user?.role]);
  const key = useMemo(() => storageKey(pathname, user?.id), [pathname, user?.id]);
  const viewportWidth = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 900 : window.innerHeight;
  const panelWidth = isHydrated ? Math.min(viewportWidth * 0.92, 384) : 384;
  const panelLeft = clamp(launcherPosition.x + FAB_SIZE - panelWidth, 16, Math.max(16, viewportWidth - panelWidth - 16));
  const panelTop = clamp(launcherPosition.y - PANEL_HEIGHT - PANEL_GAP, 16, Math.max(16, viewportHeight - PANEL_HEIGHT - 16));
  const visibleMessages = guided.isActive ? guided.messages : messages;
  const showGuidedLauncher = guided.enabled && !guided.isActive;

  useEffect(() => {
    setIsHydrated(true);
    setLauncherPosition(getDefaultLauncherPosition());
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length) {
          setMessages(parsed.slice(-20));
          return;
        }
      }
    } catch {
      // Ignore invalid persisted chat records.
    }
    setMessages([{ role: 'assistant', content: getReportingWelcome(pathname || '') }]);
  }, [key, pathname]);

  useEffect(() => {
    if (!isHydrated || !messages.length) return;
    localStorage.setItem(key, JSON.stringify(messages.slice(-20)));
  }, [isHydrated, key, messages]);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  }, [visibleMessages, isLoading, guided.isProcessing, isOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleResize = () => {
      setLauncherPosition((current) => ({
        x: clamp(current.x, 16, Math.max(16, window.innerWidth - FAB_SIZE - 16)),
        y: clamp(current.y, 16, Math.max(16, window.innerHeight - FAB_SIZE - 16)),
      }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || isLoading || guided.isProcessing) return;

    setInput('');
    setError(null);
    setApplyResult(null);
    setPendingSuggestions([]);

    if (guided.isActive) {
      await guided.handleGuidedInput(content);
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);

    const greetingFallback = getGreetingFallback(content);
    if (greetingFallback) {
      setMessages((current) => [...current, { role: 'assistant', content: greetingFallback }]);
      return;
    }

    setIsLoading(true);

    try {
      setMessages((current) => [...current, { role: 'assistant', content: '' }]);

      const fullText = await streamChatWithAssistant({ messages: nextMessages, systemPrompt, pathname }, (token) => {
        setMessages((current) => {
          const updated = [...current];
          const last = updated[updated.length - 1];
          if (!last || last.role !== 'assistant') return current;
          updated[updated.length - 1] = { ...last, content: `${last.content}${token}` };
          return updated;
        });
      });

      const suggestions = parseFormSuggestion(fullText);
      setPendingSuggestions(suggestions);
      const cleaned = stripFormSuggestion(fullText);
      if (cleaned !== fullText) {
        setMessages((current) => {
          const updated = [...current];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') updated[updated.length - 1] = { ...last, content: cleaned || 'I prepared form suggestions.' };
          return updated;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "I'm Campus Reports AI, but I couldn't connect right now. Please try again in a moment.");
      setMessages((current) => {
        const updated = [...current];
        const last = updated[updated.length - 1];
        if (last?.role === 'assistant' && !last.content.trim()) updated.pop();
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySuggestions = () => {
    const applied = applyFormSuggestions(pendingSuggestions);
    if (!applied) {
      setApplyResult('No matching editable form fields were found on this page.');
      return;
    }
    setApplyResult(`Applied ${applied} field suggestion${applied === 1 ? '' : 's'} to the current form.`);
  };

  const clearHistory = () => {
    localStorage.removeItem(key);
    guided.exitGuidedReporting();
    setMessages([{ role: 'assistant', content: getReportingWelcome(pathname || '') }]);
    setPendingSuggestions([]);
    setApplyResult(null);
  };

  const handleLauncherPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: launcherPosition.x,
      originY: launcherPosition.y,
      moved: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleLauncherPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragStateRef.current.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragStateRef.current.startX;
    const deltaY = event.clientY - dragStateRef.current.startY;
    const nextX = clamp(dragStateRef.current.originX + deltaX, 16, Math.max(16, window.innerWidth - FAB_SIZE - 16));
    const nextY = clamp(dragStateRef.current.originY + deltaY, 16, Math.max(16, window.innerHeight - FAB_SIZE - 16));

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      dragStateRef.current.moved = true;
    }

    setLauncherPosition({ x: nextX, y: nextY });
  };

  const handleLauncherPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragStateRef.current.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!dragStateRef.current.moved) {
      setIsOpen((prev) => !prev);
    }

    dragStateRef.current.pointerId = -1;
    dragStateRef.current.moved = false;
  };

  if (!isHydrated) {
    return null;
  }

  return (
    <>
      {isOpen && <button type="button" aria-label="Close AI assistant overlay" onClick={() => setIsOpen(false)} className="fixed inset-0 z-30 bg-transparent md:hidden" />}

      <button
        type="button"
        onPointerDown={handleLauncherPointerDown}
        onPointerMove={handleLauncherPointerMove}
        onPointerUp={handleLauncherPointerUp}
        onPointerCancel={handleLauncherPointerUp}
        style={{ left: launcherPosition.x, top: launcherPosition.y }}
        className="fixed z-40 inline-flex h-14 w-14 touch-none items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-900/30 transition hover:bg-indigo-500"
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {isOpen && (
        <section
          style={{ left: panelLeft, top: panelTop }}
          className="fixed z-40 flex h-[26rem] w-[min(92vw,24rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        >
          <header className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-indigo-500" />
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {guided.isActive ? 'Guided Reporting' : 'Campus Reports AI'}
                  </div>
                  {guided.isActive && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Step {Math.min(guided.stepIndex + 1, guided.totalSteps)} of {guided.totalSteps} · {guided.stepLabel}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {guided.isActive && (
                  <button
                    type="button"
                    onClick={guided.exitGuidedReporting}
                    className="text-xs text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Exit guide
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-xs text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              </div>
            </div>
            {guided.isActive && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${Math.max(8, ((guided.stepIndex + 1) / guided.totalSteps) * 100)}%` }}
                />
              </div>
            )}
          </header>

          <div ref={scrollContainerRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {showGuidedLauncher && (
              <button
                type="button"
                onClick={guided.startGuidedReporting}
                className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-left text-xs font-medium text-indigo-800 transition hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200"
              >
                Start guided report
              </button>
            )}

            {visibleMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[92%] rounded-xl px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'ml-auto bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                }`}
              >
                {message.content || ((isLoading || guided.isProcessing) && index === visibleMessages.length - 1 ? '...' : '')}
              </div>
            ))}

            {guided.isActive && guided.quickReplies.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {guided.quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => guided.handleQuickReply(reply)}
                    disabled={guided.isProcessing}
                    className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-200"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

            {(isLoading || guided.isProcessing) && (
              <div className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                {guided.isProcessing ? 'Drafting your report...' : 'Streaming response...'}
              </div>
            )}
            {(error || guided.error) && (
              <div className="text-xs text-red-600 dark:text-red-400">{error || guided.error}</div>
            )}
            {!!pendingSuggestions.length && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                AI suggested {pendingSuggestions.length} form values.
                <button
                  type="button"
                  onClick={handleApplySuggestions}
                  className="ml-2 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-white hover:bg-emerald-500"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Apply
                </button>
              </div>
            )}
            {applyResult && <div className="text-xs text-slate-600 dark:text-slate-300">{applyResult}</div>}
          </div>

          <form onSubmit={sendMessage} className="border-t border-slate-200 p-3 dark:border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder={guided.isActive ? 'Reply to the guided step...' : 'Ask about this page...'}
              />
              <button
                type="submit"
                disabled={isLoading || guided.isProcessing || !input.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-3 py-2 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
