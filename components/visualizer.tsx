"use client";

import { useSpotify } from "./spotify-provider";
import { ConnectButton } from "./connect-button";
import { NowPlaying } from "./now-playing";

export function Visualizer() {
  const { isAuthenticated, isLoading } = useSpotify();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <ConnectButton />
      </div>
    );
  }

  return <NowPlaying />;
}
