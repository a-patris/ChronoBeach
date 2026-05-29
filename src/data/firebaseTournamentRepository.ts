import {
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import type { Tournament, TournamentAccess } from "../types";
import { getFirestoreDb } from "../config/firebaseApp";
import {
  clearTournament,
  loadTournament,
  normalizeTournamentData,
  saveTournament,
} from "../storage";
import { tournamentSync } from "../sync";
import { ensureTournamentAccess, syncTournamentAccessCodes } from "../auth/accessCodes";
import type { TournamentRepository } from "./tournamentRepository";

const COLLECTION = "tournaments";
const SUMMARIES_COLLECTION = "tournamentSummaries";
const SAVE_DEBOUNCE_MS = 1200;

/** Firestore n'accepte pas undefined. */
function forFirestore(tournament: Tournament): Tournament {
  return JSON.parse(JSON.stringify(tournament)) as Tournament;
}

function accessEquals(a?: TournamentAccess, b?: TournamentAccess): boolean {
  if (!a || !b) return a === b;
  return a.markerCode === b.markerCode && a.spectatorCode === b.spectatorCode;
}

function summaryFromTournament(tournament: Tournament) {
  return {
    name: tournament.name,
    createdAt: tournament.createdAt,
    ownerUid: tournament.ownerUid,
    managerUid: tournament.managerUid,
    matchCount: tournament.matches.length,
    access: tournament.access,
  };
}

function summaryKey(tournament: Tournament): string {
  const access = tournament.access;
  return [
    tournament.name,
    tournament.matches.length,
    tournament.managerUid,
    tournament.ownerUid,
    access?.markerCode,
    access?.spectatorCode,
  ].join("|");
}

export function createFirebaseTournamentRepository(): TournamentRepository {
  const db = getFirestoreDb();
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let pending: Tournament | null = null;
  let lastSyncedAccess: TournamentAccess | undefined;
  let lastFlushedSummaryKey: string | undefined;

  const flushSave = async () => {
    if (!pending) return;
    const data = forFirestore(ensureTournamentAccess(pending));
    pending = null;
    await setDoc(doc(db, COLLECTION, data.id), data);
    const sk = summaryKey(data);
    if (sk !== lastFlushedSummaryKey) {
      await setDoc(doc(db, SUMMARIES_COLLECTION, data.id), summaryFromTournament(data), {
        merge: true,
      });
      lastFlushedSummaryKey = sk;
    }
    if (!accessEquals(data.access, lastSyncedAccess)) {
      try {
        await syncTournamentAccessCodes(data, lastSyncedAccess);
        lastSyncedAccess = data.access;
      } catch (err) {
        console.error("[ChronoBeach] Sync codes accès:", err);
      }
    }
  };

  return {
    async load(tournamentId) {
      const snap = await getDoc(doc(db, COLLECTION, tournamentId));
      if (!snap.exists()) {
        const local = loadTournament();
        return local?.id === tournamentId ? local : null;
      }
      const tournament = normalizeTournamentData(snap.data() as Tournament);
      saveTournament(tournament);
      lastSyncedAccess = tournament.access;
      return tournament;
    },

    async save(tournament) {
      const normalized = normalizeTournamentData(tournament);
      saveTournament(normalized);
      tournamentSync.broadcast();
      pending = normalized;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        void flushSave().catch((err) => {
          console.error("[ChronoBeach] Erreur sauvegarde Firestore:", err);
        });
      }, SAVE_DEBOUNCE_MS);
    },

    async clear(tournamentId) {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      pending = null;
      lastSyncedAccess = undefined;
      lastFlushedSummaryKey = undefined;
      await Promise.all([
        deleteDoc(doc(db, COLLECTION, tournamentId)),
        deleteDoc(doc(db, SUMMARIES_COLLECTION, tournamentId)).catch(() => undefined),
      ]);
      const local = loadTournament();
      if (local?.id === tournamentId) clearTournament();
      tournamentSync.broadcast();
    },

    subscribe(tournamentId, listener) {
      const ref = doc(db, COLLECTION, tournamentId);

      const unsubRemote = onSnapshot(
        ref,
        (snap) => {
          if (!snap.exists()) {
            listener(null);
            return;
          }
          const tournament = normalizeTournamentData(snap.data() as Tournament);
          saveTournament(tournament);
          lastSyncedAccess = tournament.access;
          listener(tournament);
          tournamentSync.broadcast();
        },
        (err) => {
          console.error("[ChronoBeach] Firestore subscribe:", err);
          const local = loadTournament();
          listener(local?.id === tournamentId ? local : null);
        },
      );

      const unsubLocal = tournamentSync.subscribe(() => {
        const local = loadTournament();
        if (local?.id === tournamentId) listener(local);
      });

      void getDoc(ref).then((snap) => {
        if (snap.exists()) return;
        const local = loadTournament();
        if (local?.id === tournamentId) {
          void setDoc(ref, forFirestore(local)).catch(console.error);
        }
      });

      return () => {
        unsubRemote();
        unsubLocal();
      };
    },
  };
}
