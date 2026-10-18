// Pure helpers for the Debate screen. No React, no Firebase — easy to reason about.
// The key idea: the AI only *tags* what the user said; THIS code decides when Sprout gives up.
import { ALT_TYPES, CONCEDE_AT, FINAL_PLEA_TURN } from '../config';
import { RUBRIC_IDS } from '../rubric';

// The server accepts at most 20 messages, so long (or resumed) debates send only the latest ones.
export const MAX_MESSAGES = 20;
export const recentMessages = (messages) => messages.slice(-MAX_MESSAGES);

// turn = number of user messages so far (including one just sent).
export const countUserTurns = (messages) => messages.filter((m) => m.role === 'user').length;

// Add the ids from this turn's criteriaHit to what was already earned.
// Unknown ids are ignored, and each criterion counts once, so a repeated argument doesn't stack.
export function unionCriteria(criteriaMet, criteriaHit) {
  const hitIds = (criteriaHit || []).map((h) => h.id).filter((id) => RUBRIC_IDS.includes(id));
  return [...new Set([...criteriaMet, ...hitIds])];
}

export const hasEnoughToConcede = (criteriaMet) => criteriaMet.length >= CONCEDE_AT;

// How full the conviction meter is, 0..1. Only used for the bar width, never shown as a number.
export const meterFraction = (criteriaMet) => Math.min(criteriaMet.length / CONCEDE_AT, 1);

// The final plea happens on the FINAL_PLEA_TURN-th user turn of a round.
// pleaBase lets a resumed debate (already past the plea) start a fresh round of arguing.
export const isFinalPleaTurn = (turn, pleaBase = 0) => turn - pleaBase === FINAL_PLEA_TURN;

// "Mostly ALL CAPS": at least 60% of the letters are uppercase (and there are enough letters to judge).
export function isShouty(text) {
  const letters = (text || '').replace(/[^A-Za-z]/g, '');
  if (letters.length < 6) return false;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return upper / letters.length >= 0.6;
}

// Sprout shakes on shouting replies, and on everything from the meltdown stage (turn 4) onwards.
export const shouldShake = (reply, turn) => isShouty(reply) || turn >= 4;

// Sprout's face, chosen from where the debate is. Order matters: final states win.
export function moodFor({ essential, status, conceded, waiting, criteriaMet, turn }) {
  if (status === 'resisted') return 'ecstatic';
  if (status === 'bought') return essential ? 'happy' : 'defeated';
  if (essential) return 'happy';
  if (conceded) return 'defeated';
  const met = criteriaMet.length;
  if (waiting && met >= CONCEDE_AT) return 'panicking'; // it knows what's coming…
  if (met >= 2) return turn >= 4 ? 'panicking' : 'sweating';
  if (met === 1) return 'nervous';
  return 'smug';
}

// Outcome stored when the user taps "Buy anyway".
export function buyOutcome(item, conceded) {
  if (item.essential) return 'essential';
  return conceded ? 'user_won' : 'overridden';
}

// Google search link for an alternative, e.g. "laptop charger refurbished". We never invent product URLs.
export function alternativeSearchUrl(itemName, type) {
  const suffix = ALT_TYPES[type]?.searchSuffix ?? 'used';
  return 'https://www.google.com/search?q=' + encodeURIComponent(`${itemName} ${suffix}`);
}

// Keep only alternatives with a type we know how to show.
export const validAlternatives = (alternatives) => (alternatives || []).filter((a) => ALT_TYPES[a?.type]);
