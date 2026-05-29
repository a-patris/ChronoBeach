import type { Tournament } from "../types";
import { isFirebaseConfigured } from "../config/firebase";
import { createFirebaseTournamentRepository } from "./firebaseTournamentRepository";
import { localTournamentRepository } from "./localTournamentRepository";

export type Unsubscribe = () => void;

/** Abstraction stockage — localStorage + Firestore. */
export interface TournamentRepository {
  load(tournamentId: string): Promise<Tournament | null>;
  save(tournament: Tournament): Promise<void>;
  clear(tournamentId: string): Promise<void>;
  subscribe(tournamentId: string, listener: (tournament: Tournament | null) => void): Unsubscribe;
}

let firebaseRepository: TournamentRepository | null = null;

export function registerFirebaseRepository(repo: TournamentRepository): void {
  firebaseRepository = repo;
}

export function getTournamentRepository(): TournamentRepository {
  if (!firebaseRepository && isFirebaseConfigured()) {
    try {
      firebaseRepository = createFirebaseTournamentRepository();
    } catch (err) {
      console.error("[ChronoBeach] Firestore indisponible:", err);
    }
  }
  return firebaseRepository ?? localTournamentRepository;
}
