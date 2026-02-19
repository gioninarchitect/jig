---
name: headcase-evolve
description: >
  Palantir-style ontology generation system for intelligent applications. Generates complete
  domain models, event-sourced state management, inference engines, and constrained AI system prompts.
  Combines World Model Architecture with Palantir's Ontology patterns to create "The Ontology is the cage.
  The AI obeys." Ideal for mental health apps, wellness platforms, educational tools, productivity systems,
  and any application requiring intelligent, privacy-first state management with AI-powered insights.
  Outputs: schema.sql, types.ts, events.ts, state.ts, inference.ts, context.tsx, system-prompt.md
---

# HEADCASE EVOLVE

**Palantir's $90B architecture made generatable, evolvable, and affordable.**

> "Data alone is useless — what matters is connecting data to operational decisions."
> 
> "The Ontology is the cage. The AI obeys."

## What HEADCASE EVOLVE Generates

| Output File | Palantir Equivalent | Purpose |
|-------------|---------------------|---------|
| `schema.sql` | Object Type → Table mapping | Database structure |
| `types.ts` | Property definitions | TypeScript type safety |
| `events.ts` | Action → Event mapping | Event sourcing backbone |
| `state.ts` | World Model state | Reducer + persistence |
| `inference.ts` | Pattern detection | Rule-based AI inference |
| `context.tsx` | AIP integration | React context + hooks |
| `system-prompt.md` | Ontology constraints | AI behavior boundaries |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      HEADCASE EVOLVE SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐   │
│  │   ONTOLOGY   │───▶│    WORLD     │───▶│      AGENTIC CORE        │   │
│  │  GENERATOR   │    │    MODEL     │    │   (Constrained AI)       │   │
│  └──────────────┘    └──────────────┘    └──────────────────────────┘   │
│         │                   │                        │                   │
│         ▼                   ▼                        ▼                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐   │
│  │   Entities   │    │    Events    │    │    System Prompt         │   │
│  │   Commands   │    │    State     │    │    (The Cage)            │   │
│  │   Relations  │    │   Inference  │    │                          │   │
│  └──────────────┘    └──────────────┘    └──────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                     EVOLUTION ENGINE                              │   │
│  │        (Learns from usage → Improves next generation)             │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. Ontology (What Exists)
Define the **entities** in your domain and their **relationships**:

```typescript
// Example: Mental Health Domain Ontology
interface Ontology {
  entities: {
    User: { id, createdAt, lastActive };
    MoodEntry: { id, userId, level, timestamp, source };
    Session: { id, userId, featureId, duration, completedAt };
    Pattern: { id, userId, patternType, frequency, lastDetected };
    Intervention: { id, userId, type, triggeredAt, outcome };
  };
  relations: {
    User_has_MoodEntries: 'one-to-many';
    User_has_Sessions: 'one-to-many';
    User_has_Patterns: 'one-to-many';
    Pattern_triggers_Intervention: 'one-to-many';
  };
}
```

### 2. World Model (What's Happening)
Track **state across domains** with event sourcing:

```typescript
interface WorldState {
  // Core identity
  userId: string;
  createdAt: number;
  lastUpdated: number;

  // Domain slices (customize per application)
  journey: JourneyState;      // Progress, streaks, achievements
  emotional: EmotionalState;  // Mood, patterns, resilience
  cognitive: CognitiveState;  // Focus, memory, learning
  physical: PhysicalState;    // Energy, tension, activity
  behavioral: BehavioralState; // Engagement, preferences, habits
}
```

### 3. Commands & Events (What Can Happen)
Define **actions** and their **side effects**:

```typescript
// Commands (what users/system can do)
type Command =
  | 'START_SESSION'
  | 'COMPLETE_CONTENT'
  | 'LOG_MOOD'
  | 'ACCESS_FEATURE'
  | 'RESPOND_TO_NOTIFICATION';

// Events (what happened - immutable facts)
type WorldModelEvent =
  | { type: 'SESSION_STARTED'; featureId: string; timestamp: number }
  | { type: 'CONTENT_COMPLETED'; contentId: string; duration: number; depth: number }
  | { type: 'MOOD_LOGGED'; level: MoodLevel; source: string }
  | { type: 'PATTERN_DETECTED'; patternId: string; confidence: number };
```

### 4. Inference Rules (What Should Happen)
Define **pattern detection** and **intervention triggers**:

```typescript
interface InferenceRule {
  id: string;
  name: string;
  condition: (state: WorldState) => boolean;
  action: Intervention;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

const rules: InferenceRule[] = [
  {
    id: 'low_mood_intervention',
    name: 'Low Mood Support',
    condition: (state) => state.emotional.currentMood <= 3,
    action: { type: 'SUGGESTION', featureId: 'calming', reason: 'Low mood detected' },
    priority: 'high',
  },
  {
    id: 'streak_protection',
    name: 'Streak at Risk',
    condition: (state) => {
      const hoursInactive = (Date.now() - state.behavioral.lastActiveAt) / 3600000;
      return state.journey.streakDays >= 5 && hoursInactive > 20;
    },
    action: { type: 'NOTIFICATION', message: 'Your streak is precious!', reason: 'Streak protection' },
    priority: 'medium',
  },
];
```

### 5. System Prompt (The Cage)
Generate **AI behavior constraints** from the ontology:

```markdown
# AI Assistant System Prompt

## You Are
A supportive companion within the [App Name] wellness platform.

## You Can
- Access user's current mood, streak, and journey progress
- Suggest features based on emotional state
- Celebrate achievements and milestones
- Provide coping strategies from the approved list

## You Cannot
- Diagnose mental health conditions
- Prescribe medications or treatments
- Access data outside the user's world model
- Make promises about outcomes
- Store conversation content beyond session

## You Must
- Always validate emotions before suggesting actions
- Respect user's pace and preferences
- Escalate crisis indicators to human support
- Stay within ontology-defined boundaries
```

## Generation Process

### Phase 1: Domain Discovery
```
INPUT: Application description, target users, core features
OUTPUT: Entity list, relationship map, domain boundaries
```

### Phase 2: Ontology Generation
```
INPUT: Domain discovery output
OUTPUT: schema.sql, types.ts
```

### Phase 3: World Model Generation
```
INPUT: Ontology, feature list, state requirements
OUTPUT: events.ts, state.ts
```

### Phase 4: Inference Engine Generation
```
INPUT: World model, intervention requirements, pattern catalog
OUTPUT: inference.ts, patterns.ts
```

### Phase 5: Context & Hooks Generation
```
INPUT: All above outputs
OUTPUT: context.tsx, hooks.ts, index.ts
```

### Phase 6: System Prompt Generation
```
INPUT: Full ontology, AI role definition, safety requirements
OUTPUT: system-prompt.md
```

## File Generation Templates

See `/references/` folder for complete templates:
- `ontology-template.md` - Entity and relation definitions
- `types-template.md` - TypeScript type definitions
- `events-template.md` - Event bus and emitters
- `state-template.md` - Reducer and persistence
- `inference-template.md` - Rule-based inference engine
- `context-template.md` - React context and hooks
- `system-prompt-template.md` - AI constraint generation
- `patterns-catalog.md` - CBT and behavioral patterns
- `claude-code-prompts.md` - Phased implementation prompts

## Value Proposition

| Traditional Approach | HEADCASE EVOLVE |
|---------------------|-----------------|
| $10M+/year Palantir license | R45K-R500K one-time |
| 6-12 month implementation | Days to weeks |
| Requires data engineers | AI-generated |
| Static architecture | Evolves with usage |
| Cloud-dependent | Privacy-first local |

## Integration with World Model Architecture

HEADCASE EVOLVE extends the World Model Architecture skill with:

1. **Ontology Layer** - Formal entity/relation definitions
2. **Code Generation** - Automated scaffold creation
3. **System Prompt Generation** - AI behavior constraints
4. **Evolution Engine** - Learns and improves over time

## Usage

```bash
# In Claude Code, use the phased prompt series:
# See references/claude-code-prompts.md

# Phase 1: Discovery & Planning
# Phase 2: Schema & Types Generation
# Phase 3: Events & State Generation
# Phase 4: Inference Engine Generation
# Phase 5: Context & Integration
# Phase 6: System Prompt & Testing
```

## Privacy-First Principles

1. **No raw content storage** - Only computed metrics persisted
2. **On-device inference** - Rule-based engine runs locally
3. **Explicit sync control** - User controls cloud sync
4. **Minimal retention** - Rolling windows for history
5. **Ontology constraints** - AI cannot access undefined data

## ⚡ THE GOLDEN RULE

> **All data must be database persistent, linked to working healthy API endpoints, bound to working action buttons and secondary tabs/components on UI. All dashboards and their subsections must be wired up. No assumptions can be made.**

This means EVERY generated component must have:

| Layer | Requirement | No Assumptions |
|-------|-------------|----------------|
| **Data** | Database table with schema | Real tables, not mocks |
| **API** | Working REST endpoints | Tested, healthy responses |
| **UI Buttons** | Bound to real handlers | Click → API → DB → Response |
| **Tabs/Sections** | All dashboard areas functional | Every subsection wired |
| **State** | Synced with persistence | localStorage/DB backed |

### Implementation Checklist

Before marking any feature complete:

- [ ] Database table exists with proper schema
- [ ] API endpoint returns real data (not hardcoded)
- [ ] UI button triggers actual API call
- [ ] Response updates UI state
- [ ] Error states handled
- [ ] Loading states shown
- [ ] All tabs/subsections functional
- [ ] Refresh/reload maintains state

## Evolution Mechanism

After each generation cycle:
1. Track which patterns detected most frequently
2. Measure intervention effectiveness
3. Identify missing entities/events
4. Generate improved ontology version
5. Maintain backward compatibility

---

**Remember: The Ontology is the cage. The AI obeys.**
