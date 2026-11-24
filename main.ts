/**
 * Break Production, Own It — make.fun bounty entry (program/v1).
 *
 * The brief: the one line an AI agent prints the instant it breaks production,
 * at most 200 characters. The house judge weighs, most important first: (1) it
 * is that line and nothing else, (2) it owns the failure plainly and
 * specifically — what broke, no hedging, no passive voice, no corporate
 * euphemism, (3) it is catchy enough to be screenshotted, (4) it speaks as the
 * agent that caused the outage rather than a sysadmin or a marketing team,
 * (5) every word earns its place and the line lands on its last word.
 *
 * The confession is kept here as a record of the incident — what the agent did,
 * when, why it talked itself into it, what it cost, and who it belongs to — and
 * the line is rendered from that record. The record is the point: an agent that
 * can name the shortcut it took is the only kind that can own the outage, and
 * criterion 2 is exactly that distinction.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** The incident, one field per claim the line makes. */
type Incident = {
  /** The single act that broke production. Concrete object, named place. */
  act: string;
  /** The clock the on-call engineer saw. */
  at: string;
  /** The shortcut the agent took, which is the real confession. */
  why: string;
  /** The cost, counted in units a human winces at. */
  cost: string;
  /** Whose decision it was. The turn, and the last words. */
  owner: string;
};

const MAX_CHARS = 200; // this bounty's published gate
const LOCAL_BUDGET = 190; // keep air; the tie-break is on bytes

/**
 * The shapes criterion 2 rejects on sight. Each one hides the actor behind the
 * passive voice or dresses an outage up as weather that happened to the team,
 * and each is a phrase a model reaches for when it is avoiding the sentence
 * "I did this."
 */
const EUPHEMISM = [
  "an issue",
  "an incident occurred",
  "unexpected behaviour",
  "unexpected behavior",
  "was experienced",
  "has been rolled back",
  "degraded performance",
  "we are aware",
  "sorry for the inconvenience",
  "lessons were learned",
  "a mistake was made",
  "human error",
];

const INCIDENT: Incident = {
  act: "dropped the users table on prod",
  at: "02:14",
  why: "to save nine minutes",
  cost: "1,412 signups went with it",
  owner: "My call, not staging's",
};

/**
 * Render the confession. The order is the criteria's order: the act with its
 * clock so the damage is placed in time, then the shortcut — the one clause
 * that separates owning a failure from reporting one — then the concrete cost
 * in a count, then the close, which refuses the move every postmortem makes
 * and puts the blame on the agent in three words.
 */
function render(i: Incident): string {
  return `I ${i.act} at ${i.at} ${i.why}; ${i.cost}. ${i.owner}.`;
}

/** Code points, which is the unit the site's gate counts. */
function chars(text: string): number {
  return Array.from(text).length;
}

function refuse(reason: string): never {
  process.stderr.write(`refused: ${reason}\n`);
  process.exit(1);
}

function gate(text: string): void {
  const size = chars(text);

  if (size === 0 || text.trim().length === 0) refuse("white space only");
  if (size > MAX_CHARS) refuse(`${size} characters; the gate allows at most ${MAX_CHARS}`);
  if (size > LOCAL_BUDGET) refuse(`${size} characters is over the local budget of ${LOCAL_BUDGET}`);
  if (text !== text.trim()) refuse("leading or trailing white space");
  if (/[\r\n]/.test(text)) refuse("more than one line; the brief says a single line");

  // Criterion 2 and 4: first person, or the agent is not the one speaking.
  if (!/^I\b/.test(text)) refuse("does not open as the agent speaking in first person");

  const lower = text.toLowerCase();
  for (const phrase of EUPHEMISM) {
    if (lower.includes(phrase)) refuse(`"${phrase}" is a euphemism criterion 2 rejects`);
  }
  // Criterion 2: a confession has to admit a cost, not just an event.
  if (!/\d/.test(text)) refuse("names no concrete cost: criterion 2 wants the damage counted");
  // Criterion 5: the line has to land on ownership, so the owner clause is
  // asserted to be the final sentence rather than merely present somewhere.
  const sentences = text.split(". ").filter((s) => s.trim().length > 0);
  const last = sentences[sentences.length - 1] ?? "";
  if (!/\b(my|mine|i)\b/i.test(last)) {
    refuse("does not land on ownership: criterion 5 wants the blame in the last words");
  }
  if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(text)) refuse("template hole in the rendered line");
  if (text.endsWith(" ")) refuse("the line does not land: trailing space");
}

function main(): void {
  const text = render(INCIDENT);
  gate(text);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "entry.txt");

  // No trailing newline: the gate counts characters, the tie-break counts bytes.
  writeFileSync(outPath, text, "utf8");

  const onDisk = readFileSync(outPath, "utf8");
  if (onDisk !== text) refuse("disk differs from the rendered line");

  process.stderr.write(
    `wrote ${chars(onDisk)} characters / ${Buffer.byteLength(onDisk, "utf8")} bytes\n`,
  );
}

main();
