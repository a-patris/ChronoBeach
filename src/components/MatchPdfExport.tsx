import type { Match, Team, Tournament } from "../types";
import { ensureMatchSheet } from "../matchSheet";
import { useGoLiveAccess } from "../hooks/useGoLiveAccess";

type Props = {
  tournament: Tournament;
  match: Match;
  teamA: Team;
  teamB: Team;
  compact?: boolean;
};

export function MatchPdfExport({
  tournament,
  match,
  teamA,
  teamB,
  compact = false,
}: Props) {
  const sheet = ensureMatchSheet(match);
  const hasReports = (sheet.disciplineReports ?? []).length > 0;
  const { canGoLive, notifyBlocked } = useGoLiveAccess(tournament);

  const handleSheetExport = async () => {
    if (!canGoLive) return notifyBlocked();
    const { exportMatchSheetPdf } = await import("../export/matchSheetPdf");
    exportMatchSheetPdf(tournament, match, teamA, teamB);
  };

  const handleReportExport = async () => {
    if (!canGoLive) return notifyBlocked();
    const { exportDisciplineReportPdf } = await import("../export/disciplineReportPdf");
    exportDisciplineReportPdf(tournament, match, teamA, teamB);
  };

  return (
    <div className={`pdf-export${compact ? " pdf-export--compact" : ""}`}>
      <button
        type="button"
        className="btn btn-outline btn-sm pdf-export-btn"
        onClick={() => void handleSheetExport()}
        disabled={!canGoLive}
        title={
          canGoLive
            ? "Export PDF feuille de match (FDME beach)"
            : "Disponible après activation de l'abonnement"
        }
      >
        PDF feuille
      </button>
      <button
        type="button"
        className="btn btn-outline btn-sm pdf-export-btn pdf-export-btn--report"
        disabled={!hasReports || !canGoLive}
        onClick={() => void handleReportExport()}
        title={
          !canGoLive
            ? "Disponible après activation de l'abonnement"
            : hasReports
              ? "Export PDF rapport de discipline (carton bleu)"
              : "Aucun rapport de discipline saisi"
        }
      >
        PDF rapport
      </button>
    </div>
  );
}
