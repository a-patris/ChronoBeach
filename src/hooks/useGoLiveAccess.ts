import { useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  DISCOVERY_LAUNCH_MESSAGE,
  canGoLive,
  tournamentLiveEnabled,
} from "../auth/billing";
import { getContactEmail } from "../config/contact";
import { isPlatformStaff } from "../auth/roles";
import type { Tournament } from "../types";

export function useGoLiveAccess(tournament?: Tournament | null) {
  const { role, profile, authRequired } = useAuth();

  const userCanGoLive = canGoLive(profile?.billingStatus, role);
  const tournamentAllowsLive = tournamentLiveEnabled(tournament);
  const canGoLiveNow = userCanGoLive && tournamentAllowsLive;

  const isDiscoveryMode =
    authRequired &&
    role === "tournament_manager" &&
    profile?.billingStatus === "discovery";

  const showDiscoveryBanner =
    isDiscoveryMode && !isPlatformStaff(role);

  const notifyBlocked = useCallback(() => {
    const email = getContactEmail();
    const suffix = email ? `\n\nContact : ${email}` : "";
    window.alert(`${DISCOVERY_LAUNCH_MESSAGE}${suffix}`);
  }, []);

  return {
    canGoLive: canGoLiveNow,
    userCanGoLive,
    tournamentAllowsLive,
    isDiscoveryMode,
    showDiscoveryBanner,
    notifyBlocked,
  };
}
