import { useEffect, useMemo, useState } from "react";
import type { Match, MatchOfficials, Player, Team, Tournament } from "../types";
import {
  createPlayer,
  ensureMatchSheet,
  isScoringReady,
  normalizeOfficials,
  patchOfficials,
  removeTeamPlayer,
  setCaptain,
  startScoring,
  togglePlayerPresent,
  upsertTeamPlayer,
  validateMatchSheet,
} from "../matchSheet";
import {
  eventTypeLabel,
  getTournamentEventType,
  getTournamentRosterLimit,
  rosterLimitLabel,
} from "../tournamentConfig";
import {
  applyTeamRecallToMatch,
  autoRecallTeams,
  formatLastMatchSanctionAlertMessage,
  getLastMatchPlayerSanctionAlerts,
  getLastMatchRecallLabel,
} from "../teamRecall";
import { TeamLogo } from "./TeamLogo";
import { MatchPdfExport } from "./MatchPdfExport";

type Props = {
  tournament: Tournament;
  match: Match;
  teamA: Team;
  teamB: Team;
  onPatchMatch: (updater: (m: Match) => Match) => void;
  onPatchTournament: (updater: (t: Tournament) => Tournament) => void;
  variant?: "admin" | "tablet";
};

type SetupTab = "officials" | "teamA" | "teamB" | "check";

const OFFICIAL_FIELDS: {
  key: keyof MatchOfficials;
  label: string;
  required?: boolean;
}[] = [
  { key: "roomManager", label: "Responsable de salle", required: true },
  { key: "scorekeeper", label: "Secrétaire", required: true },
  { key: "timekeeper", label: "Chronométreur", required: true },
  { key: "referee1", label: "Arbitre principal", required: true },
  { key: "referee2", label: "Arbitre adjoint" },
  { key: "accompanyingJudge", label: "Juge accompagnateur (si présent)" },
];

function SetupPlayerRow({
  team,
  player,
  side,
  match,
  onPatchMatch,
  onPatchTournament,
}: {
  team: Team;
  player: Player;
  side: "teamA" | "teamB";
  match: Match;
  onPatchMatch: Props["onPatchMatch"];
  onPatchTournament: Props["onPatchTournament"];
}) {
  const sheet = ensureMatchSheet(match);
  const present = sheet[side].presentPlayerIds.includes(player.id);
  const isCaptain = sheet[side].captainId === player.id;

  return (
    <div className={`sheet-setup-row${present ? " sheet-setup-row--on" : ""}`}>
      <label className="sheet-present-check" title="Présent">
        <input
          type="checkbox"
          checked={present}
          onChange={() => onPatchMatch((m) => togglePlayerPresent(m, side, player.id))}
        />
      </label>
      <input
        type="number"
        className="sheet-input sheet-input--num"
        min={1}
        max={99}
        value={player.number}
        onChange={(e) => {
          const number = parseInt(e.target.value, 10) || player.number;
          onPatchTournament((t) => upsertTeamPlayer(t, team.id, { ...player, number }));
        }}
      />
      <input
        type="text"
        className="sheet-input sheet-input--name"
        value={player.name}
        placeholder="Nom"
        onChange={(e) => {
          onPatchTournament((t) =>
            upsertTeamPlayer(t, team.id, { ...player, name: e.target.value }),
          );
        }}
      />
      <input
        type="text"
        className="sheet-input sheet-input--fname"
        value={player.firstName ?? ""}
        placeholder="Prénom"
        onChange={(e) => {
          onPatchTournament((t) =>
            upsertTeamPlayer(t, team.id, { ...player, firstName: e.target.value }),
          );
        }}
      />
      <label className="sheet-flag" title="Gardien">
        <input
          type="checkbox"
          checked={!!player.isGoalkeeper}
          onChange={(e) => {
            onPatchTournament((t) =>
              upsertTeamPlayer(t, team.id, { ...player, isGoalkeeper: e.target.checked }),
            );
          }}
        />
        GK
      </label>
      <label className="sheet-flag" title="Spécialiste (plusieurs sur feuille, 1 en jeu)">
        <input
          type="checkbox"
          checked={!!player.isSpecialist}
          onChange={(e) => {
            onPatchTournament((t) =>
              upsertTeamPlayer(t, team.id, { ...player, isSpecialist: e.target.checked }),
            );
          }}
        />
        S
      </label>
      <button
        type="button"
        className={`btn btn-sm ${isCaptain ? "btn-accent" : "btn-outline"}`}
        disabled={!present}
        onClick={() =>
          onPatchMatch((m) => setCaptain(m, side, isCaptain ? undefined : player.id))
        }
      >
        C
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline"
        onClick={() => onPatchTournament((t) => removeTeamPlayer(t, team.id, player.id))}
      >
        ×
      </button>
    </div>
  );
}

function LastMatchSanctionBanner({
  alerts,
  recallLabel,
}: {
  alerts: ReturnType<typeof getLastMatchPlayerSanctionAlerts>;
  recallLabel: string | null;
}) {
  if (alerts.length === 0) return null;

  return (
    <div className="sheet-recall-sanction-alert" role="alert">
      <p className="sheet-recall-sanction-title">
        Sanctions au dernier match
        {recallLabel ? ` (${recallLabel})` : ""}
      </p>
      <ul className="sheet-recall-sanction-list">
        {alerts.map((a) => (
          <li
            key={a.playerId}
            className={
              a.type === "disqualification"
                ? "sheet-recall-sanction-item sheet-recall-sanction-item--disq"
                : "sheet-recall-sanction-item sheet-recall-sanction-item--excl"
            }
          >
            <strong>{a.playerLabel}</strong>
            {a.type === "disqualification"
              ? " — disqualifié(e) : vérifier si peut jouer ce match (certains tournois interdisent le match suivant)"
              : " — exclu(e) au dernier match : vérifier l'éligibilité"}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TeamSetup({
  team,
  side,
  match,
  tournament,
  onPatchMatch,
  onPatchTournament,
}: {
  team: Team;
  side: "teamA" | "teamB";
  match: Match;
  tournament: Tournament;
  onPatchMatch: Props["onPatchMatch"];
  onPatchTournament: Props["onPatchTournament"];
}) {
  const [num, setNum] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const sheet = ensureMatchSheet(match);
  const players = team.players ?? [];

  const maxRoster = getTournamentRosterLimit(tournament);

  const addPlayer = () => {
    const number = parseInt(num, 10);
    if (!number || !lastName.trim() || players.length >= maxRoster) return;
    const player = createPlayer(number, lastName.trim(), { firstName: firstName.trim() });
    onPatchTournament((t) => upsertTeamPlayer(t, team.id, player));
    onPatchMatch((m) => togglePlayerPresent(m, side, player.id));
    setNum("");
    setLastName("");
    setFirstName("");
  };

  const recallLabel = getLastMatchRecallLabel(tournament, team.id, match.id);
  const sanctionAlerts = getLastMatchPlayerSanctionAlerts(tournament, team.id, match.id);

  const recallFromLast = () => {
    onPatchMatch((m) => applyTeamRecallToMatch(tournament, m, team.id, side));
    if (sanctionAlerts.length > 0) {
      window.alert(formatLastMatchSanctionAlertMessage(sanctionAlerts, recallLabel));
    }
  };

  return (
    <div className="sheet-setup-team">
      <div className="sheet-setup-team-head">
        <TeamLogo team={team} size="sm" />
        <h3>{team.name}</h3>
        <span className="hint">{players.length}/{maxRoster}</span>
        {recallLabel && (
          <button
            type="button"
            className="btn btn-accent btn-sm"
            onClick={recallFromLast}
            title={`Dernier match : ${recallLabel}`}
          >
            ↺ Dernier match
          </button>
        )}
      </div>
      {recallLabel && (
        <p className="hint sheet-recall-hint">Dernier effectif : {recallLabel}</p>
      )}
      <LastMatchSanctionBanner alerts={sanctionAlerts} recallLabel={recallLabel} />
      <div className="sheet-staff-fields">
        <label className="sheet-staff-label">
          Entraîneur principal (R)
          <input
            type="text"
            className="sheet-input"
            placeholder="Nom"
            value={sheet[side].staffName ?? ""}
            onChange={(e) =>
              onPatchMatch((m) => {
                const s = ensureMatchSheet(m);
                return {
                  ...m,
                  matchSheet: {
                    ...s,
                    [side]: { ...s[side], staffName: e.target.value },
                  },
                };
              })
            }
          />
        </label>
        <label className="sheet-staff-label">
          2e entraîneur (R2)
          <input
            type="text"
            className="sheet-input"
            placeholder="Nom (optionnel)"
            value={sheet[side].staffName2 ?? ""}
            onChange={(e) =>
              onPatchMatch((m) => {
                const s = ensureMatchSheet(m);
                return {
                  ...m,
                  matchSheet: {
                    ...s,
                    [side]: { ...s[side], staffName2: e.target.value },
                  },
                };
              })
            }
          />
        </label>
      </div>
      <div className="sheet-setup-head-row">
        <span />
        <span>#</span>
        <span>Nom</span>
        <span>Prénom</span>
        <span>GK</span>
        <span>S</span>
        <span>C</span>
        <span />
      </div>
      <div className="sheet-setup-players">
        {players.length === 0 && (
          <p className="hint">Ajoutez les joueurs présents (numéro + nom + prénom).</p>
        )}
        {players.map((p) => (
          <SetupPlayerRow
            key={p.id}
            team={team}
            player={p}
            side={side}
            match={match}
            onPatchMatch={onPatchMatch}
            onPatchTournament={onPatchTournament}
          />
        ))}
      </div>
      <div className="sheet-add-player sheet-add-player--fdme">
        <input
          type="number"
          className="sheet-input sheet-input--num"
          placeholder="#"
          value={num}
          onChange={(e) => setNum(e.target.value)}
        />
        <input
          type="text"
          className="sheet-input sheet-input--name"
          placeholder="Nom"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
        <input
          type="text"
          className="sheet-input sheet-input--fname"
          placeholder="Prénom"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPlayer()}
        />
        <button type="button" className="btn btn-accent btn-sm" onClick={addPlayer}>
          + Joueur
        </button>
      </div>
    </div>
  );
}

export function MatchSheetSetup({
  tournament,
  match,
  teamA,
  teamB,
  onPatchMatch,
  onPatchTournament,
  variant = "admin",
}: Props) {
  const [tab, setTab] = useState<SetupTab>("officials");

  useEffect(() => {
    if (isScoringReady(match)) return;
    onPatchMatch((m) => autoRecallTeams(tournament, m));
  }, [match.id, tournament.matches.length]);

  const sheet = ensureMatchSheet(match);
  const officials = normalizeOfficials(sheet.officials);
  const validation = useMemo(
    () => validateMatchSheet(match, teamA, teamB),
    [match, teamA, teamB],
  );

  const recallSanctionWarnings = useMemo(() => {
    const warnings: string[] = [];
    for (const team of [teamA, teamB]) {
      const alerts = getLastMatchPlayerSanctionAlerts(tournament, team.id, match.id);
      const label = getLastMatchRecallLabel(tournament, team.id, match.id);
      for (const a of alerts) {
        if (a.type === "disqualification") {
          warnings.push(
            `${team.name} — ${a.playerLabel} : disqualifié(e) au dernier match${label ? ` (${label})` : ""} — vérifier éligibilité`,
          );
        } else {
          warnings.push(
            `${team.name} — ${a.playerLabel} : exclu(e) au dernier match${label ? ` (${label})` : ""}`,
          );
        }
      }
    }
    return warnings;
  }, [tournament, match.id, teamA, teamB]);

  const tabs: { id: SetupTab; label: string }[] = [
    { id: "officials", label: "Officiels" },
    { id: "teamA", label: teamA.name },
    { id: "teamB", label: teamB.name },
    { id: "check", label: "Vérification" },
  ];

  return (
    <section className={`sheet-setup${variant === "tablet" ? " sheet-setup--tablet" : ""}`}>
      <header className="sheet-setup-header">
        <div>
          <h2>FDME — Feuille de match</h2>
          <p className="hint">
            {eventTypeLabel(getTournamentEventType(tournament))} · {rosterLimitLabel(tournament)}
          </p>
        </div>
        <MatchPdfExport
          tournament={tournament}
          match={match}
          teamA={teamA}
          teamB={teamB}
        />
      </header>

      <nav className="sheet-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`sheet-tab${tab === t.id ? " sheet-tab--active" : ""}${
              t.id === "check" && !validation.ok ? " sheet-tab--warn" : ""
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "officials" && (
        <div className="sheet-tab-panel">
          <p className="hint sheet-fdme-note">
            Saisir le prénom et le nom de chaque officiel présent.
          </p>
          <div className="sheet-officials-grid">
            {OFFICIAL_FIELDS.map(({ key, label, required }) => (
              <label key={key}>
                {label}
                {required && <span className="sheet-required"> *</span>}
                <input
                  type="text"
                  className="sheet-input"
                  value={officials[key] ?? ""}
                  onChange={(e) =>
                    onPatchMatch((m) => patchOfficials(m, { [key]: e.target.value }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="sheet-tab-nav">
            <button type="button" className="btn btn-accent" onClick={() => setTab("teamA")}>
              Équipe {teamA.name} →
            </button>
          </div>
        </div>
      )}

      {tab === "teamA" && (
        <div className="sheet-tab-panel">
          <TeamSetup
            team={teamA}
            side="teamA"
            match={match}
            tournament={tournament}
            onPatchMatch={onPatchMatch}
            onPatchTournament={onPatchTournament}
          />
          <div className="sheet-tab-nav">
            <button type="button" className="btn btn-outline" onClick={() => setTab("officials")}>
              ← Officiels
            </button>
            <button type="button" className="btn btn-accent" onClick={() => setTab("teamB")}>
              {teamB.name} →
            </button>
          </div>
        </div>
      )}

      {tab === "teamB" && (
        <div className="sheet-tab-panel">
          <TeamSetup
            team={teamB}
            side="teamB"
            match={match}
            tournament={tournament}
            onPatchMatch={onPatchMatch}
            onPatchTournament={onPatchTournament}
          />
          <div className="sheet-tab-nav">
            <button type="button" className="btn btn-outline" onClick={() => setTab("teamA")}>
              ← {teamA.name}
            </button>
            <button type="button" className="btn btn-accent" onClick={() => setTab("check")}>
              Vérification →
            </button>
          </div>
        </div>
      )}

      {tab === "check" && (
        <div className="sheet-tab-panel sheet-check-panel">
          <h3>Vérification de la saisie</h3>
          {validation.ok ? (
            <p className="sheet-check-ok">Aucune anomalie bloquante détectée.</p>
          ) : (
            <ul className="sheet-check-list sheet-check-list--error">
              {validation.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
          {validation.warnings.length > 0 && (
            <>
              <h4>Avertissements</h4>
              <ul className="sheet-check-list sheet-check-list--warn">
                {validation.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </>
          )}
          {recallSanctionWarnings.length > 0 && (
            <>
              <h4>Sanctions au dernier match</h4>
              <ul className="sheet-check-list sheet-check-list--warn">
                {recallSanctionWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </>
          )}

          <div className="sheet-check-summary">
            <p>
              <strong>{sheet.teamA.presentPlayerIds.length}</strong> joueurs {teamA.name} ·{" "}
              <strong>{sheet.teamB.presentPlayerIds.length}</strong> joueurs {teamB.name}
            </p>
          </div>

          <footer className="sheet-setup-footer">
            <button type="button" className="btn btn-outline" onClick={() => setTab("teamB")}>
              ← Corriger
            </button>
            <button
              type="button"
              className="btn btn-accent btn-lg sheet-start-btn"
              disabled={!validation.ok}
              title={validation.ok ? "Équivalent Alt+T dans la FDME" : "Corrigez les anomalies"}
              onClick={() => onPatchMatch((m) => startScoring(m))}
            >
              Feuille de table →
            </button>
          </footer>
        </div>
      )}
    </section>
  );
}
