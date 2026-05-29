import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { signInAnonymously, signOut } from "firebase/auth";
import { getFirebaseAuth } from "../config/firebaseApp";
import { getFirestoreDb } from "../config/firebaseApp";
import { lookupAccessCode, normalizeAccessCode } from "./accessCodes";
import { tournamentLiveEnabled, LIVE_BLOCKED_PUBLIC_MESSAGE } from "./billing";

const STORAGE_KEY = "cb_marker_access";

export type MarkerAccessGrant = {
  tournamentId: string;
  uid: string;
  grantedAt: number;
};

export function loadMarkerAccess(): MarkerAccessGrant | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MarkerAccessGrant;
  } catch {
    return null;
  }
}

export function saveMarkerAccess(grant: MarkerAccessGrant): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(grant));
}

export function clearMarkerAccess(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasMarkerAccess(tournamentId: string): boolean {
  const grant = loadMarkerAccess();
  const auth = getFirebaseAuth();
  return (
    grant?.tournamentId === tournamentId &&
    auth.currentUser?.uid === grant.uid
  );
}

/** Connexion anonyme + session Firestore pour piloter la table de marque via code. */
export async function joinWithMarkerCode(code: string): Promise<string> {
  const lookup = await lookupAccessCode(code);
  if (!lookup || lookup.type !== "marker") {
    throw new Error("Code table de marque invalide ou expiré.");
  }

  const auth = getFirebaseAuth();
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    await signOut(auth);
  }

  const user = auth.currentUser?.isAnonymous
    ? auth.currentUser
    : (await signInAnonymously(auth)).user;

  const tournamentRef = doc(getFirestoreDb(), "tournaments", lookup.tournamentId);
  const tournamentSnap = await getDoc(tournamentRef);
  if (!tournamentSnap.exists()) {
    throw new Error("Tournoi introuvable.");
  }

  const tournamentData = tournamentSnap.data();
  if (!tournamentLiveEnabled({ liveEnabled: tournamentData.liveEnabled as boolean | undefined })) {
    throw new Error(LIVE_BLOCKED_PUBLIC_MESSAGE);
  }

  const access = tournamentData.access as { markerCode?: string } | undefined;
  const expected = normalizeAccessCode(access?.markerCode ?? "");
  const provided = normalizeAccessCode(code);
  if (!expected || expected !== provided) {
    throw new Error("Code table de marque invalide ou expiré.");
  }

  await setDoc(
    doc(getFirestoreDb(), "tournaments", lookup.tournamentId, "markerSessions", user.uid),
    {
      markerCode: expected,
      createdAt: serverTimestamp(),
    },
  );

  saveMarkerAccess({
    tournamentId: lookup.tournamentId,
    uid: user.uid,
    grantedAt: Date.now(),
  });

  return lookup.tournamentId;
}

export async function resolveSpectatorTournamentId(code: string): Promise<string> {
  const lookup = await lookupAccessCode(code);
  if (!lookup || lookup.type !== "spectator") {
    throw new Error("Code spectateur invalide.");
  }

  const tournamentSnap = await getDoc(
    doc(getFirestoreDb(), "tournaments", lookup.tournamentId),
  );
  if (!tournamentSnap.exists()) {
    throw new Error("Tournoi introuvable.");
  }
  const data = tournamentSnap.data();
  if (!tournamentLiveEnabled({ liveEnabled: data.liveEnabled as boolean | undefined })) {
    throw new Error(LIVE_BLOCKED_PUBLIC_MESSAGE);
  }

  return lookup.tournamentId;
}
