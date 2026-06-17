import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MessageCircle, X, Send, Loader2, Sparkles, Zap, ScrollText, TicketCheck, Briefcase, Inbox, ArrowRight } from 'lucide-react';
import MarkdownLite from './MarkdownLite';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

// =====================================================================
// SmartChat — floating chat button (bottom-right) + slide-up panel
//
// Hybrid model: known tasks stay button-driven (Owner Concierge, SMF
// "Draft with AI"), free-form questions land here. Maestro (Haiku 4.5)
// routes each message to the right specialist; the route badge is
// visible above every reply for transparency.
// =====================================================================

type Intent = 'OWNER_BRIEF' | 'SMF_COMPOSE' | 'SMF_QUERY' | 'TICKETS_QUERY' | 'OPS_QUESTION' | 'HUMAN_HANDOFF';

const INTENT_META: Record<Intent, { label: string; icon: any; cls: string }> = {
  OWNER_BRIEF:    { label: 'Owner Concierge',  icon: Briefcase,    cls: 'bg-primary/15 border-primary/30 text-primary' },
  SMF_COMPOSE:    { label: 'SMF Composer',     icon: Sparkles,     cls: 'bg-amber-500/15 border-amber-500/30 text-amber-300' },
  SMF_QUERY:      { label: 'SMF Q&A',          icon: ScrollText,   cls: 'bg-rose-500/15 border-rose-500/30 text-rose-300' },
  TICKETS_QUERY:  { label: 'Tickets Q&A',      icon: TicketCheck,  cls: 'bg-blue-500/15 border-blue-500/30 text-blue-300' },
  OPS_QUESTION:   { label: 'Ops Q&A',          icon: Zap,          cls: 'bg-white/10 border-white/15 text-white/70' },
  HUMAN_HANDOFF:  { label: 'Human Handoff',    icon: Inbox,        cls: 'bg-white/10 border-white/15 text-white/50' },
};

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  intent?: Intent;
  reason?: string;
  sources?: Record<string, any>;
  actions?: ChatAction[];
}

interface ChatAction {
  id: string;
  label: string;
  href: string;
  prompt?: string;
  tone?: 'primary' | 'warning' | 'danger' | 'neutral';
}

const ROLE_ASSISTANTS: Record<string, { title: string; subtitle: string; prompts: string[] }> = {
  SUPER_ADMIN: {
    title: 'Super Admin Assistant',
    subtitle: 'UAT · audit · blockers · evidence',
    prompts: [
      'What are the production blockers right now?',
      'Show me the golden UAT evidence status',
      'Is the audit chain valid and what changed today?',
      'Which roles or workflows still need testing?',
    ],
  },
  TENANT_ADMIN: {
    title: 'Owner Assistant',
    subtitle: 'decisions · approvals · risk',
    prompts: [
      'Give me the owner brief for today',
      'What decisions need owner attention?',
      'Which compliance risks are highest today?',
      'What is blocking site readiness?',
    ],
  },
  FACILITY_MANAGER: {
    title: 'Facility Assistant',
    subtitle: 'site operations · tickets · tasks',
    prompts: [
      'Start my FM oversight wizard for all departments',
      'Which facility tickets are overdue?',
      'Create a ticket for an out-of-range humidity reading and assign it to Facility Manager',
      'Create a SOP checklist reminder for facility readiness today',
    ],
  },
  RESPONSIBLE_PHARMACIST: {
    title: 'RP Assistant',
    subtitle: 'SMF · QMS · release evidence',
    prompts: [
      'Which SMF sections need RP attention?',
      'What evidence blocks batch release?',
      'Summarise open deviations and CAPA status',
      'Is the audit trail inspection-ready?',
    ],
  },
  QA_INSPECTOR: {
    title: 'QA Assistant',
    subtitle: 'deviations · BCR · labels · CAPA',
    prompts: [
      'Which BCRs need QA review?',
      'Show label control exceptions',
      'What CAPA or deviation evidence is missing?',
      'What should I inspect first today?',
    ],
  },
  HEAD_OF_CULTIVATION: {
    title: 'Cultivation Lead Assistant',
    subtitle: 'plants · bays · clones · mortality',
    prompts: [
      'What cultivation risks need action today?',
      'Summarise plant phases and bay priorities',
      'What mortality or clone issues should I review?',
      'Which daily checks are pending?',
    ],
  },
  CULTIVATOR: {
    title: 'Cultivator Assistant',
    subtitle: 'shift tasks · plants · scans',
    prompts: [
      'What should I do on my shift today?',
      'Which plants or bays need attention?',
      'How do I scan and record this action?',
      'What checks are still pending?',
    ],
  },
  NURSERY_MANAGER: {
    title: 'Nursery Assistant',
    subtitle: 'mothers · clones · transplants',
    prompts: [
      'Start my Nursery Manager wizard',
      'Which clone trays need root checks?',
      'What nursery actions are due today?',
      'Which mothers need review?',
      'Create a SOP checklist reminder for nursery readiness today',
    ],
  },
  PROCESSING_MANAGER: {
    title: 'Processing Assistant',
    subtitle: 'batches · trim · containers',
    prompts: [
      'Which batches need processing attention?',
      'Show drying or container weight issues',
      'What is blocking BCR completion?',
      'Which trim or processing tasks are overdue?',
    ],
  },
  PROCESSING_SUPERVISOR: {
    title: 'Processing Shift Assistant',
    subtitle: 'crew · trim · weight records',
    prompts: [
      'What processing work is due this shift?',
      'Which containers need scan updates?',
      'What trim assignments need closure?',
      'Show batch exceptions for today',
    ],
  },
  LAB_TECH: {
    title: 'Lab Assistant',
    subtitle: 'tests · COA · retests',
    prompts: [
      'Which lab results are pending?',
      'What batches are blocked by testing?',
      'Which COAs are issued or missing?',
      'What retests should I prioritise?',
    ],
  },
  SECURITY_OFFICER: {
    title: 'Security Assistant',
    subtitle: 'incidents · access · evidence',
    prompts: [
      'What security issues need attention?',
      'Show incidents or evidence gaps',
      'Which label or asset exceptions are critical?',
      'What should be preserved for audit evidence?',
    ],
  },
  MAINTENANCE_MANAGER: {
    title: 'Maintenance Assistant',
    subtitle: 'assets · calibration · equipment',
    prompts: [
      'Which equipment is overdue?',
      'What maintenance tickets are open?',
      'Show calibration risks',
      'What assets need attention first?',
    ],
  },
  IT_MANAGER: {
    title: 'IT Assistant',
    subtitle: 'system health · users · AI audit',
    prompts: [
      'Is the system healthy right now?',
      'What access or user issues exist?',
      'Show AI audit and chat status',
      'Which QR or printer workflows need support?',
    ],
  },
  VIEWER: {
    title: 'Auditor View Assistant',
    subtitle: 'read-only evidence review',
    prompts: [
      'Show inspection evidence status',
      'Which SMF sections are approved?',
      'Summarise BCR and label evidence',
      'Is the audit chain valid?',
    ],
  },
  GMP_PARTNER: {
    title: 'GMP Partner Assistant',
    subtitle: 'EU GMP · findings · observations',
    prompts: [
      'Summarise EU GMP evidence gaps',
      'What observations should be raised?',
      'Which QMS controls are mapped?',
      'Show SMF and BCR inspection readiness',
    ],
  },
};

function assistantForRole(role?: string | null) {
  return ROLE_ASSISTANTS[role || ''] || {
    title: `${(role || 'Role').replace(/_/g, ' ')} Assistant`,
    subtitle: 'tasks · evidence · tickets',
    prompts: [
      'What needs my attention today?',
      'Show my open work and blockers',
      'What evidence is missing?',
      'What should I check next?',
    ],
  };
}

export default function SmartChat() {
  const user = useAuthStore((s) => s.user);
  const roleAssistant = assistantForRole(user?.role);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (message: string) =>
      api.post('/chat', { message }).then(r => r.data),
    onSuccess: (data) => {
      const reply: ChatTurn = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: data.answer ?? '(no answer)',
        intent: data.route?.intent,
        reason: data.route?.reason,
        sources: data.sources,
        actions: data.actions || [],
      };
      setTurns(t => [...t, reply]);
    },
    onError: (err: any) => {
      const reply: ChatTurn = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: `Error: ${err.response?.data?.error ?? err.message}`,
      };
      setTurns(t => [...t, reply]);
    },
  });

  // Autoscroll on new turn
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns, ask.isPending]);

  function send() {
    const msg = draft.trim();
    if (!msg || ask.isPending) return;
    setTurns(t => [...t, { id: `u-${Date.now()}`, role: 'user', text: msg }]);
    setDraft('');
    ask.mutate(msg);
  }

  function openAction(action: ChatAction) {
    if (action.prompt) {
      setTurns(t => [...t, { id: `u-${Date.now()}`, role: 'user', text: action.prompt! }]);
      ask.mutate(action.prompt);
      return;
    }
    window.location.href = action.href;
  }

  function actionClass(tone?: ChatAction['tone']) {
    if (tone === 'danger') return 'bg-red-500/10 border-red-500/25 text-red-200 hover:bg-red-500/15';
    if (tone === 'warning') return 'bg-amber-500/10 border-amber-500/25 text-amber-200 hover:bg-amber-500/15';
    if (tone === 'primary') return 'bg-primary/10 border-primary/25 text-primary hover:bg-primary/15';
    return 'bg-white/[0.04] border-white/[0.08] text-white/55 hover:bg-white/[0.07]';
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50 w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all ${
          open
            ? 'bg-white/10 text-white/60 scale-95 hover:bg-white/15'
            : 'bg-primary text-white hover:scale-105 hover:shadow-primary/40'
        }`}
        title={open ? 'Close chat' : 'Ask the system'}
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-36 lg:bottom-24 right-4 lg:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[70vh] rounded-2xl border border-white/15 bg-[#0E0E0E] shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <MessageCircle size={14} className="text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{roleAssistant.title}</div>
                <div className="text-[10px] text-white/30">{roleAssistant.subtitle}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white">
              <X size={16} />
            </button>
          </div>

          {/* Conversation */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {turns.length === 0 && !ask.isPending && (
              <div className="text-center py-6">
                <Sparkles size={20} className="mx-auto text-white/20 mb-2" />
                <p className="text-xs text-white/40 mb-3">Try asking:</p>
                <div className="space-y-1.5 text-[11px] text-white/40">
                  {roleAssistant.prompts.map(prompt => (
                    <button key={prompt} onClick={() => setDraft(prompt)} className="block w-full px-2 py-1.5 rounded-lg hover:bg-white/5 text-left transition">
                      "{prompt}"
                    </button>
                  ))}
               </div>
              </div>
            )}

            {turns.map(t => (
              <div key={t.id}>
                {t.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="bg-primary/15 border border-primary/25 text-white/90 text-sm rounded-2xl rounded-br-md px-3 py-2 max-w-[85%]">
                      {t.text}
                    </div>
                  </div>
                ) : (
                  <div>
                    {t.intent && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ${INTENT_META[t.intent].cls}`}>
                          {(() => { const I = INTENT_META[t.intent].icon; return <I size={9} />; })()}
                          {INTENT_META[t.intent].label}
                        </span>
                        {t.reason && <span className="text-[9px] text-white/25 italic truncate">{t.reason}</span>}
                      </div>
                    )}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-bl-md px-3 py-2.5 max-w-[95%]">
                      <MarkdownLite text={t.text} className="text-sm" />
                    </div>
                    {t.actions && t.actions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {t.actions.map(action => (
                          <button
                            key={`${t.id}-${action.id}-${action.href}`}
                            onClick={() => openAction(action)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold transition ${actionClass(action.tone)}`}
                            title={action.label}
                          >
                            {action.label}
                            <ArrowRight size={10} />
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Sources footer — provenance */}
                    {t.sources && Object.keys(t.sources).length > 0 && (
                      <div className="mt-1.5 px-2 py-1 bg-white/[0.02] border border-white/[0.04] rounded-md">
                        <div className="text-[9px] uppercase tracking-wider text-white/30 font-semibold mb-0.5">
                          Grounded in live data
                        </div>
                        <div className="text-[10px] text-white/40 leading-snug">
                          {Object.entries(t.sources)
                            .filter(([k, v]) => v !== null && v !== undefined && k !== 'digestBytes' && k !== 'bundleBytes')
                            .slice(0, 6)
                            .map(([k, v], i, arr) => (
                              <span key={k}>
                                <span className="text-white/55 font-mono">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>{' '}
                                <span className="text-white/30">{k.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}</span>
                                {i < arr.length - 1 ? <span className="text-white/15"> · </span> : null}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {ask.isPending && (
              <div className="flex items-center gap-2 text-[11px] text-white/40">
                <Loader2 size={11} className="animate-spin" />
                Maestro routing · waiting for specialist…
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-white/[0.08] p-3">
            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="flex gap-2"
            >
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Ask anything…"
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/25 focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={!draft.trim() || ask.isPending}
                className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-30 hover:bg-primary-light transition flex-shrink-0"
              >
                {ask.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
