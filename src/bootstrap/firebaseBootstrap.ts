import { isFirebaseReady } from "../config/firebaseApp";
import { createFirebaseTournamentRepository } from "../data/firebaseTournamentRepository";
import { registerFirebaseRepository } from "../data/tournamentRepository";

/** Branche Firestore si .env configuré. */
export function bootstrapFirebase(): void {
  if (!isFirebaseReady()) return;
  try {
    registerFirebaseRepository(createFirebaseTournamentRepository());
    console.info("[ChronoBeach] Sync Firestore activée");
  } catch (err) {
    console.error("[ChronoBeach] Firebase indisponible:", err);
  }
}
