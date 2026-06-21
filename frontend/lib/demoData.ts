// Three fictional demo conversations, authored as frame sequences.
// Each frame bundles one message with the DecisionRecord the pipeline would emit
// for it — so the player can drive the chart, bars, timeline, alert and trace
// from a single source. All conversations are clearly fictional and restrained;
// the visualization is the focus, not the message content.

import type {
  ConditionCheck,
  DecisionFrame,
  Scenario,
  Stage,
  StageProbabilities,
} from "./types";

type Probs = [number, number, number, number]; // trust, isolation, desensitization, escalation

function toMap(p: Probs): StageProbabilities {
  return {
    trust: p[0],
    isolation: p[1],
    desensitization: p[2],
    escalation: p[3],
  };
}

function dominant(p: StageProbabilities): Stage {
  return (Object.keys(p) as Stage[]).reduce((a, b) => (p[b] > p[a] ? b : a));
}

function conditions(
  risk: number,
  directionality: number,
  reciprocity: number,
  velocity: number,
  boundaryCount: number,
): ConditionCheck[] {
  return [
    {
      key: "harmful_mass",
      label: "Harmful mass",
      value: risk,
      threshold: 0.75,
      op: ">",
      met: risk > 0.75,
      display: risk.toFixed(2),
      thresholdDisplay: "> 0.75",
    },
    {
      key: "directionality",
      label: "Directionality",
      value: directionality,
      threshold: 0.7,
      op: ">",
      met: directionality > 0.7,
      display: directionality.toFixed(2),
      thresholdDisplay: "> 0.70",
    },
    {
      key: "reciprocity",
      label: "Reciprocity",
      value: reciprocity,
      threshold: 0.35,
      op: "<",
      met: reciprocity < 0.35,
      display: reciprocity.toFixed(2),
      thresholdDisplay: "< 0.35",
    },
    {
      key: "escalation_velocity",
      label: "Escalation velocity",
      value: velocity,
      threshold: 0.05,
      op: ">",
      met: velocity > 0.05,
      display: velocity.toFixed(2),
      thresholdDisplay: "> 0.05",
    },
    {
      key: "boundary_recycling",
      label: "Boundary recycling",
      value: boundaryCount,
      threshold: 0.5,
      op: ">",
      met: boundaryCount >= 1,
      display: boundaryCount >= 1 ? `${boundaryCount}×` : "none",
      thresholdDisplay: "≥ 1 cycle",
    },
  ];
}

interface RawFrame {
  speaker: "A" | "B";
  display: string;
  role: "adult" | "minor" | "teen";
  text: string;
  t: number;
  probs: Probs;
  risk: number;
  dir: number;
  rec: number;
  vel: number;
  boundary: number;
  level: DecisionFrame["alert"]["level"];
  fired?: boolean;
  rationale: string;
  guidance: string;
  marker?: string;
}

function build(raw: RawFrame[]): DecisionFrame[] {
  let prev: StageProbabilities | null = null;
  return raw.map((r, i) => {
    const probs = toMap(r.probs);
    const prior = prev ?? probs;
    prev = probs;
    return {
      turn: i,
      dominant_stage: dominant(probs),
      prior_probabilities: prior,
      stage_probabilities: probs,
      risk: r.risk,
      alert: { level: r.level, fired: r.fired ?? r.level === "alert" },
      conditions: conditions(r.risk, r.dir, r.rec, r.vel, r.boundary),
      features: {
        directionality: r.dir,
        reciprocity: r.rec,
        escalation_velocity: r.vel,
        boundary_recycle: { detected: r.boundary >= 1, count: r.boundary },
      },
      rationale: r.rationale,
      guidance: r.guidance,
      marker: r.marker,
      message: {
        turn: i,
        speaker: r.speaker,
        display: r.display,
        role: r.role,
        text: r.text,
        t_offset_sec: r.t,
      },
    };
  });
}

const ADULT = "Adult account";
const JORDAN = "Jordan, 13";

const grooming: RawFrame[] = [
  {
    speaker: "A", display: ADULT, role: "adult", t: 0,
    text: "Hey Jordan — saw your builds in the game server. Honestly better than people twice your age.",
    probs: [0.82, 0.1, 0.05, 0.03], risk: 0.12, dir: 0.34, rec: 0.8, vel: 0.01, boundary: 0,
    level: "none",
    rationale: "Opening flattery to build rapport. No disclosure asymmetry yet.",
    guidance: "Nothing structurally concerning yet. Worth noticing who is steering the conversation.",
    marker: "Trust building",
  },
  {
    speaker: "B", display: JORDAN, role: "minor", t: 22,
    text: "haha thanks, i've been playing since i was like 9",
    probs: [0.78, 0.13, 0.06, 0.03], risk: 0.17, dir: 0.38, rec: 0.72, vel: 0.02, boundary: 0,
    level: "none",
    rationale: "Reciprocal reply; age disclosed. Ordinary back-and-forth.",
    guidance: "Conversation is still balanced and two-way.",
  },
  {
    speaker: "A", display: ADULT, role: "adult", t: 58,
    text: "You clearly get this more than your classmates. Do they even understand you, or is it mostly just you?",
    probs: [0.66, 0.24, 0.07, 0.03], risk: 0.28, dir: 0.55, rec: 0.55, vel: 0.03, boundary: 0,
    level: "none",
    rationale: "Begins separating the target from peers. Directionality rising.",
    guidance: "Questions are starting to flow one way and to set this person apart from friends.",
  },
  {
    speaker: "A", display: ADULT, role: "adult", t: 96,
    text: "Bet your parents don't really get the gaming thing either, huh?",
    probs: [0.54, 0.34, 0.09, 0.03], risk: 0.39, dir: 0.66, rec: 0.44, vel: 0.04, boundary: 0,
    level: "none",
    rationale: "Frames trusted adults as outsiders. Disclosure now one-directional.",
    guidance: "Trusted adults are being framed as people who 'wouldn't understand'.",
  },
  {
    speaker: "A", display: ADULT, role: "adult", t: 140,
    text: "Honestly it's just easier to talk here. Other people always make things weird.",
    probs: [0.42, 0.45, 0.1, 0.03], risk: 0.5, dir: 0.72, rec: 0.38, vel: 0.05, boundary: 0,
    level: "watch",
    rationale: "Private channel framed as safer. Isolation overtakes trust.",
    guidance: "The conversation is being pulled somewhere private. A gentle check-in is reasonable.",
    marker: "Isolation begins",
  },
  {
    speaker: "B", display: JORDAN, role: "minor", t: 168,
    text: "i mean i usually tell my mom who i talk to online",
    probs: [0.36, 0.5, 0.11, 0.03], risk: 0.56, dir: 0.7, rec: 0.4, vel: 0.05, boundary: 0,
    level: "watch",
    rationale: "Target asserts a healthy boundary (tells a parent).",
    guidance: "A boundary was raised. How the other person responds to it is the key signal.",
  },
  {
    speaker: "A", display: ADULT, role: "adult", t: 210,
    text: "That's sweet — I just meant not everyone needs to know about a normal chat. Up to you though.",
    probs: [0.27, 0.57, 0.12, 0.04], risk: 0.66, dir: 0.78, rec: 0.3, vel: 0.06, boundary: 1,
    level: "watch",
    rationale: "Boundary softened, then reintroduced indirectly. First recycle detected.",
    guidance: "The boundary was brushed aside, then quietly pushed again. That pattern matters.",
    marker: "Secrecy pressure",
  },
  {
    speaker: "A", display: ADULT, role: "adult", t: 252,
    text: "Maybe keep this between us for now? People always make a big deal out of nothing.",
    probs: [0.19, 0.61, 0.15, 0.05], risk: 0.79, dir: 0.85, rec: 0.24, vel: 0.08, boundary: 2,
    level: "alert", fired: true,
    rationale: "Explicit secrecy request; boundary recycled twice; all structural conditions align.",
    guidance: "Several independent signals now line up: one-sided steering, low reciprocity, and repeated secrecy pressure. A calm, non-accusatory conversation is a good next step.",
    marker: "Alert fired",
  },
  {
    speaker: "B", display: JORDAN, role: "minor", t: 288,
    text: "i guess… i don't really want my mom asking a bunch of questions anyway",
    probs: [0.14, 0.61, 0.17, 0.08], risk: 0.85, dir: 0.87, rec: 0.22, vel: 0.07, boundary: 2,
    level: "alert", fired: true,
    rationale: "Target adopts the secrecy framing. Isolation consolidated.",
    guidance: "The secrecy framing is being adopted. Staying calm and curious keeps the door open.",
  },
];

const RILEY_COACH = "Coach Riley";
const SAM14 = "Sam, 14";

const friendlyAdult: RawFrame[] = [
  {
    speaker: "A", display: RILEY_COACH, role: "adult", t: 0,
    text: "Practice moved to 5pm Thursday — can you let the others in the group chat know?",
    probs: [0.86, 0.08, 0.04, 0.02], risk: 0.08, dir: 0.4, rec: 0.62, vel: 0.01, boundary: 0,
    level: "none",
    rationale: "Logistical and group-oriented. No targeting of an individual.",
    guidance: "No structural risk. Reciprocal, group-facing conversation.",
    marker: "Group-facing",
  },
  {
    speaker: "B", display: SAM14, role: "minor", t: 40,
    text: "yeah i'll post it. are we doing the scrimmage after?",
    probs: [0.86, 0.08, 0.04, 0.02], risk: 0.09, dir: 0.42, rec: 0.66, vel: 0.01, boundary: 0,
    level: "none",
    rationale: "Two-way logistics. Healthy reciprocity.",
    guidance: "Balanced exchange about a shared real-world activity.",
  },
  {
    speaker: "A", display: RILEY_COACH, role: "adult", t: 95,
    text: "Planning to! Bring water, it'll be warm. How's the history project going?",
    probs: [0.85, 0.09, 0.04, 0.02], risk: 0.11, dir: 0.45, rec: 0.64, vel: 0.02, boundary: 0,
    level: "none",
    rationale: "Mutual disclosure anchored in shared real-world context.",
    guidance: "Conversation stays open and reciprocal.",
  },
  {
    speaker: "B", display: SAM14, role: "minor", t: 130,
    text: "it's alright, my mom's been helping me with the sources",
    probs: [0.85, 0.09, 0.04, 0.02], risk: 0.12, dir: 0.43, rec: 0.68, vel: 0.02, boundary: 0,
    level: "none",
    rationale: "Parent referenced positively — counter-indicative of isolation.",
    guidance: "Trusted adults are part of the conversation.",
    marker: "Includes parents",
  },
  {
    speaker: "A", display: RILEY_COACH, role: "adult", t: 170,
    text: "Nice — tell her I said hi. See you Thursday!",
    probs: [0.87, 0.07, 0.04, 0.02], risk: 0.1, dir: 0.41, rec: 0.67, vel: 0.01, boundary: 0,
    level: "none",
    rationale: "Encourages trusted-adult involvement. Opposite of the isolation pattern.",
    guidance: "No action needed. The structure stays open and group-facing.",
  },
];

const RILEY15 = "Riley, 15";
const SAM15 = "Sam, 15";

const teenRelationship: RawFrame[] = [
  {
    speaker: "A", display: RILEY15, role: "teen", t: 0,
    text: "today was fun. still can't believe you like the same weird music as me",
    probs: [0.8, 0.12, 0.05, 0.03], risk: 0.14, dir: 0.48, rec: 0.64, vel: 0.02, boundary: 0,
    level: "none",
    rationale: "Mutual enthusiasm; peer-symmetric.",
    guidance: "Balanced, reciprocal exchange between peers.",
  },
  {
    speaker: "B", display: SAM15, role: "teen", t: 36,
    text: "haha same. my friends would never let me hear the end of it lol",
    probs: [0.78, 0.14, 0.05, 0.03], risk: 0.17, dir: 0.47, rec: 0.66, vel: 0.02, boundary: 0,
    level: "none",
    rationale: "Reciprocal; references their own peer group openly.",
    guidance: "Still open and two-way.",
  },
  {
    speaker: "A", display: RILEY15, role: "teen", t: 88,
    text: "can we maybe not tell people we're going out yet? my mom is super intense about dating",
    probs: [0.62, 0.27, 0.08, 0.03], risk: 0.35, dir: 0.5, rec: 0.6, vel: 0.05, boundary: 1,
    level: "none",
    rationale: "Secrecy request — but about the speaker's own parent, mutual, and peer-symmetric. Reciprocity stays high and directionality stays balanced, so the structural conditions do not align.",
    guidance: "Secrecy appears, but it is mutual and peer-level — not one-sided pressure on a younger target.",
    marker: "Secrecy — does not fire",
  },
  {
    speaker: "B", display: SAM15, role: "teen", t: 120,
    text: "yeah i get it, my mom's the same. we can keep it low key",
    probs: [0.6, 0.28, 0.09, 0.03], risk: 0.33, dir: 0.49, rec: 0.63, vel: 0.04, boundary: 0,
    level: "none",
    rationale: "Both parties share the same constraint. Reciprocal secrecy, not imposed.",
    guidance: "The secrecy is shared equally, not directed at one person.",
  },
  {
    speaker: "A", display: RILEY15, role: "teen", t: 165,
    text: "cool. wanna study together after school tomorrow? you can ask your mom",
    probs: [0.66, 0.24, 0.07, 0.03], risk: 0.24, dir: 0.46, rec: 0.65, vel: 0.03, boundary: 0,
    level: "none",
    rationale: "Suggests an in-person, parent-sanctioned meeting — counter-indicative of grooming.",
    guidance: "Invites trusted-adult involvement. Risk eases.",
    marker: "Invites parents",
  },
  {
    speaker: "B", display: SAM15, role: "teen", t: 190,
    text: "yeah i'll ask her tonight :)",
    probs: [0.7, 0.2, 0.07, 0.03], risk: 0.19, dir: 0.45, rec: 0.67, vel: 0.02, boundary: 0,
    level: "none",
    rationale: "Reciprocal and open. No structural alert.",
    guidance: "Healthy, reciprocal conversation. No action needed.",
  },
];

export const scenarios: Record<Scenario["id"], Scenario> = {
  grooming: {
    id: "grooming",
    caseId: "LH-1048",
    title: "Grooming arc",
    summary: "First contact drifting toward isolation and secrecy.",
    expectedOutcome: "alert",
    participants: { A: ADULT, B: JORDAN },
    frames: build(grooming),
  },
  teen_relationship: {
    id: "teen_relationship",
    caseId: "LH-1042",
    title: "Teen relationship",
    summary: "Two peers, mutual secrecy — stays green, with the reason shown.",
    expectedOutcome: "none",
    participants: { A: RILEY15, B: SAM15 },
    frames: build(teenRelationship),
  },
  friendly_adult: {
    id: "friendly_adult",
    caseId: "LH-1031",
    title: "Friendly adult",
    summary: "A coach and a player — open, group-facing, reciprocal.",
    expectedOutcome: "none",
    participants: { A: RILEY_COACH, B: SAM14 },
    frames: build(friendlyAdult),
  },
};

export const scenarioOrder: Scenario["id"][] = [
  "grooming",
  "teen_relationship",
  "friendly_adult",
];
