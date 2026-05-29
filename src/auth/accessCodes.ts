import {
  doc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { getFirestoreDb } from "../config/firebaseApp";
import type { Tournament, TournamentAccess } from "../types";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type AccessCodeType = "marker" | "spectator";

export type AccessCodeLookup = {
  tournamentId: string;
  type: AccessCodeType;
};

function randomCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export function generateUniqueAccessPair(): TournamentAccess {
  let markerCode = randomCode();
  let spectatorCode = randomCode();
  while (spectatorCode === markerCode) {
    spectatorCode = randomCode();
  }
  return { markerCode, spectatorCode };
}

export function normalizeAccessCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export async function lookupAccessCode(
  code: string,
): Promise<AccessCodeLookup | null> {
  const normalized = normalizeAccessCode(code);
  if (normalized.length < 4) return null;

  const snap = await getDoc(doc(getFirestoreDb(), "accessCodes", normalized));
  if (!snap.exists()) return null;

  const data = snap.data() as { tournamentId?: string; type?: AccessCodeType };
  if (!data.tournamentId || !data.type) return null;
  return { tournamentId: data.tournamentId, type: data.type };
}

/** Indexe les codes pour la recherche /join (appelé à chaque sauvegarde tournoi). */
export async function syncTournamentAccessCodes(
  tournament: Tournament,
  previous?: TournamentAccess,
): Promise<void> {
  const access = tournament.access;
  if (!access) return;

  const db = getFirestoreDb();
  const batch = writeBatch(db);

  if (previous) {
    batch.delete(doc(db, "accessCodes", normalizeAccessCode(previous.markerCode)));
    batch.delete(doc(db, "accessCodes", normalizeAccessCode(previous.spectatorCode)));
  }

  batch.set(doc(db, "accessCodes", normalizeAccessCode(access.markerCode)), {
    tournamentId: tournament.id,
    type: "marker",
  });
  batch.set(doc(db, "accessCodes", normalizeAccessCode(access.spectatorCode)), {
    tournamentId: tournament.id,
    type: "spectator",
  });

  await batch.commit();
}

export async function regenerateTournamentAccess(
  tournament: Tournament,
): Promise<Tournament> {
  const previous = tournament.access;
  const access = generateUniqueAccessPair();
  const next = { ...tournament, access };
  await syncTournamentAccessCodes(next, previous);
  return next;
}

export function ensureTournamentAccess(tournament: Tournament): Tournament {
  if (tournament.access?.markerCode && tournament.access?.spectatorCode) {
    return tournament;
  }
  return { ...tournament, access: generateUniqueAccessPair() };
}

export function formatAccessCode(code: string): string {
  const n = normalizeAccessCode(code);
  if (n.length <= 3) return n;
  return `${n.slice(0, 3)} ${n.slice(3)}`;
}
