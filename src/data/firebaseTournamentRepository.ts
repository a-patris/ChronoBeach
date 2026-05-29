import {
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import type { Tournament } from "../types";
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
const SAVE_DEBOUNCE_MS = 900;

/** Firestore n'accepte pas undefined. */
function forFirestore(tournament: Tournament): Tournament {
  return JSON.parse(JSON.stringify(tournament)) as Tournament;
}

export function createFirebaseTournamentRepository(): TournamentRepository {
  const db = getFirestoreDb();
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let pending: Tournament | null = null;

  const flushSave = async () => {
    if (!pending) return;
    const data = forFirestore(ensureTournamentAccess(pending));
    pending = null;
    await setDoc(doc(db, COLLECTION, data.id), data);
    try {
      await syncTournamentAccessCodes(data);
    } catch (err) {
      console.error("[ChronoBeach] Sync codes accès:", err);
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
      await deleteDoc(doc(db, COLLECTION, tournamentId));
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
