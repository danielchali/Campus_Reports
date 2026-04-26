"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, Sparkles, MessageCircle, Send, Wand2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { streamChatWithAssistant } from '../utils/api';

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
    route: /^\/reports/,
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
];

function getLocationAwareSystemPrompt(pathname: string, role: string | undefined) {
  const roleKey = (role || 'unknown').toLowerCase();
  const matchedPolicy = POLICY_MATRIX.find((entry) => entry.route.test(pathname));
  const contextualRule = matchedPolicy?.roleRules[roleKey] || matchedPolicy?.defaultRule || 'Guide only the currently visible route with practical, low-risk steps.';

  return [
    'You are the Campus Reports AI assistant for a university discipline-management platform.',
    'Respond in under 8 bullet points or 1 short paragraph unless asked for depth.',
    'Never invent records, IDs, law, or institutional policy text.',
    'If you are unsure, ask for confirmation and state exactly what to verify in the UI.',
    'When user asks to fill forms, include one optional XML block exactly once: <form_suggestion>[{"field":"fieldName","value":"proposed value"}]</form_suggestion>.',
    'Only include fields that are likely visible on this page and skip unknown fields.',
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

export default function FloatingAIChatbot() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSuggestions, setPendingSuggestions] = useState<FormFieldSuggestion[]>([]);
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const systemPrompt = useMemo(() => getLocationAwareSystemPrompt(pathname, user?.role), [pathname, user?.role]);
  const key = useMemo(() => storageKey(pathname, user?.id), [pathname, user?.id]);

  useEffect(() => {
    setIsHydrated(true);
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
    setMessages([{ role: 'assistant', content: 'Hi! I can help on this page. Ask me what you want to do next.' }]);
  }, [key]);

  useEffect(() => {
    if (!isHydrated || !messages.length) return;
    localStorage.setItem(key, JSON.stringify(messages.slice(-20)));
  }, [isHydrated, key, messages]);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
  }, [messages, isLoading, isOpen]);

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || isLoading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setApplyResult(null);
    setPendingSuggestions([]);
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
      setError(err instanceof Error ? err.message : 'Unable to reach assistant');
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
    setMessages([{ role: 'assistant', content: 'Chat history cleared for this page.' }]);
    setPendingSuggestions([]);
    setApplyResult(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-900/30 transition hover:bg-indigo-500"
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {isOpen && (
        <section className="fixed bottom-24 right-5 z-40 flex h-[26rem] w-[min(92vw,24rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-indigo-500" />
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">AI Assistant</div>
            </div>
            <button
              type="button"
              onClick={clearHistory}
              className="text-xs text-slate-500 transition hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Clear
            </button>
          </header>

          <div ref={scrollContainerRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[92%] rounded-xl px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'ml-auto bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
                }`}
              >
                {message.content || (isLoading && index === messages.length - 1 ? '...' : '')}
              </div>
            ))}

            {isLoading && (
              <div className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                Streaming response...
              </div>
            )}
            {error && <div className="text-xs text-red-600 dark:text-red-400">{error}</div>}
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
                placeholder="Ask about this page..."
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
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
