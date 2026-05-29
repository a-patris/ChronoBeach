import { clearTournament, loadTournament, saveTournament } from "../storage";
import { tournamentSync } from "../sync";
import type { TournamentRepository } from "./tournamentRepository";

export const localTournamentRepository: TournamentRepository = {
  async load(tournamentId) {
    const local = loadTournament();
    return local?.id === tournamentId ? local : null;
  },

  async save(tournament) {
    saveTournament(tournament);
    tournamentSync.broadcast();
  },

  async clear(tournamentId) {
    const local = loadTournament();
    if (local?.id === tournamentId) clearTournament();
    tournamentSync.broadcast();
  },

  subscribe(tournamentId, listener) {
    const emit = () => {
      const local = loadTournament();
      listener(local?.id === tournamentId ? local : null);
    };
    emit();
    return tournamentSync.subscribe(emit);
  },
};
