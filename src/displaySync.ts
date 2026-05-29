export type DisplayCommand = { type: "request-fullscreen"; at: number };

function channelName(matchId: string): string {
  return `chronobeach-display-${matchId}`;
}

/** Demande plein écran à l'onglet display d'un match précis. */
export function requestDisplayFullscreen(matchId: string): boolean {
  if (typeof BroadcastChannel === "undefined") return false;
  try {
    const channel = new BroadcastChannel(channelName(matchId));
    channel.postMessage({ type: "request-fullscreen", at: Date.now() } satisfies DisplayCommand);
    channel.close();
    return true;
  } catch {
    return false;
  }
}

export function subscribeDisplayCommands(
  matchId: string,
  listener: (command: DisplayCommand) => void,
): () => void {
  if (typeof BroadcastChannel === "undefined") return () => {};

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(channelName(matchId));
    channel.onmessage = (event: MessageEvent<DisplayCommand>) => {
      if (event.data?.type === "request-fullscreen") listener(event.data);
    };
  } catch {
    return () => {};
  }

  return () => {
    channel?.close();
    channel = null;
  };
}
