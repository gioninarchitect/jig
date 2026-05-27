import type Anthropic from '@anthropic-ai/sdk';

// =====================================================================
// Origin Concierge — Tool Registry
//
// CLAUDE.md rule: no mocks. Tools either:
//   (a) hit a live TnT-ZA endpoint (formulary_lookup), or
//   (b) do real generative work via a Claude sub-agent (s21_packet_draft).
// When (a) is unreachable, we degrade honestly with a handoff message
// the parent agent can surface to the user — never silent fallback data.
// =====================================================================

export interface ToolOutcome {
  status: 'success' | 'degraded';
  data?: unknown;
  reason?: string;
  handoffMessage?: string;
}

export const TOOL_DEFS: Anthropic.Tool[] = [
  {
    name: 's21_packet_draft',
    description:
      'Drafts a SAHPRA Section 21 application packet for a named-patient unscheduled-medicine request. Returns a structured JSON packet covering patient identity (initials only), indication, prior treatments, requested formulation, dosing rationale, and a prescriber declaration. The Responsible Pharmacist must review and sign before submission. Use when a prescriber is preparing or asking about a Section 21 application.',
    input_schema: {
      type: 'object',
      properties: {
        patientInitials: {
          type: 'string',
          description: 'Patient initials only — never full names. e.g. "M.S."',
        },
        indication: {
          type: 'string',
          description: 'Clinical indication, e.g. "treatment-resistant chronic neuropathic pain"',
        },
        priorTreatments: {
          type: 'array',
          items: { type: 'string' },
          description: 'Treatments tried, with outcome / reason for failure',
        },
        requestedFormulation: {
          type: 'string',
          description: 'e.g. "THC-dominant oil 25mg/ml, sublingual"',
        },
        dosingRationale: {
          type: 'string',
          description: 'Why this formulation/dose for this patient',
        },
        prescriberName: {
          type: 'string',
          description: 'Full name + HPCSA practice number of the prescribing clinician',
        },
      },
      required: [
        'patientInitials',
        'indication',
        'requestedFormulation',
        'dosingRationale',
        'prescriberName',
      ],
    },
  },
  {
    name: 'formulary_lookup',
    description:
      'Look up Origin formulary entries appropriate for a clinical indication. Queries the live TnT-ZA product registry. If the registry is unavailable, returns an honest degraded response — do NOT invent product names.',
    input_schema: {
      type: 'object',
      properties: {
        indication: {
          type: 'string',
          description: 'Clinical indication, e.g. "chronic pain", "anxiety with insomnia"',
        },
        contraindications: {
          type: 'array',
          items: { type: 'string' },
          description: 'Patient contraindications to weigh against formulary options',
        },
      },
      required: ['indication'],
    },
  },
];

const TNT_ZA_BASE = process.env.TNT_ZA_BASE_URL ?? 'http://localhost:3002';

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  client: Anthropic,
): Promise<ToolOutcome> {
  switch (name) {
    case 's21_packet_draft':
      return draftS21Packet(input, client);
    case 'formulary_lookup':
      return lookupFormulary(input as { indication: string; contraindications?: string[] });
    default:
      return {
        status: 'degraded',
        reason: `Unknown tool: ${name}`,
        handoffMessage: 'Capability not implemented — escalate to Dr Assistant.',
      };
  }
}

// ─── s21_packet_draft ──────────────────────────────────────────────────
const S21_DRAFT_SYSTEM = `You are an expert in South African Section 21 (Medicines & Related Substances Act, 1965) applications for unregistered medicines.

Given the prescriber's input, draft a structured Section 21 packet.

Constraints:
- Use patient initials only — NEVER full names
- Be specific about evidence-of-failure when summarising prior treatments
- rpReviewRequired must always be true — this is a draft and the Responsible Pharmacist must sign off
- nextSteps must be concrete (e.g. "RP review", "patient informed-consent capture", "supporting clinical letter from referring specialist", "submit to SAHPRA Section 21 inbox")
- packetId format: "S21-DRAFT-" followed by 8 random alphanumeric characters
- riskBenefitStatement must explicitly weigh expected benefit against side-effect profile and abuse-liability

Return only the JSON object. No preamble, no commentary.`;

async function draftS21Packet(
  input: Record<string, unknown>,
  client: Anthropic,
): Promise<ToolOutcome> {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: [
        { type: 'text', text: S21_DRAFT_SYSTEM, cache_control: { type: 'ephemeral' } },
      ],
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              packetId: { type: 'string' },
              patientInitials: { type: 'string' },
              indication: { type: 'string' },
              priorTreatmentsSummary: { type: 'string' },
              requestedFormulation: { type: 'string' },
              dosingRationale: { type: 'string' },
              riskBenefitStatement: { type: 'string' },
              prescriberDeclaration: { type: 'string' },
              rpReviewRequired: { type: 'boolean' },
              nextSteps: { type: 'array', items: { type: 'string' } },
            },
            required: [
              'packetId',
              'patientInitials',
              'indication',
              'priorTreatmentsSummary',
              'requestedFormulation',
              'dosingRationale',
              'riskBenefitStatement',
              'prescriberDeclaration',
              'rpReviewRequired',
              'nextSteps',
            ],
          },
        },
      },
      messages: [{ role: 'user', content: JSON.stringify(input) }],
    });

    const text = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    if (!text) {
      return {
        status: 'degraded',
        reason: 'S21 sub-agent returned no text block',
        handoffMessage: 'Packet draft failed — escalate to Dr Assistant for manual drafting.',
      };
    }
    return { status: 'success', data: JSON.parse(text.text) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: 'degraded',
      reason: `S21 sub-agent error: ${msg}`,
      handoffMessage: 'Packet drafting unavailable — escalate to Dr Assistant.',
    };
  }
}

// ─── formulary_lookup ──────────────────────────────────────────────────
async function lookupFormulary(input: {
  indication: string;
  contraindications?: string[];
}): Promise<ToolOutcome> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    const url = `${TNT_ZA_BASE}/api/products?indication=${encodeURIComponent(input.indication)}`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return {
        status: 'degraded',
        reason: `TnT-ZA product registry returned ${res.status}`,
        handoffMessage:
          'Live formulary unavailable — recommend RP-curated manual lookup before issuing prescription.',
      };
    }
    const data = await res.json();
    return { status: 'success', data };
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: 'degraded',
      reason: `TnT-ZA backend not reachable: ${msg}`,
      handoffMessage:
        'Live formulary not available right now — proceed using validated reference material and flag to RP for cross-check before issuing.',
    };
  }
}
