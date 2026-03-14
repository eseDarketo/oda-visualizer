"use client";

import { useSpotify } from "./spotify-provider";
import { ProgressBar } from "./progress-bar";
import Image from "next/image";
import { useState } from "react";

export function NowPlaying() {
  const { nowPlaying, dominantColorHsl, logout } = useSpotify();
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!nowPlaying) {
    return <IdleState onLogout={logout} />;
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
      {/* Background - Blurred album art */}
      <div className="absolute inset-0 z-0">
        <Image
          src={nowPlaying.albumImageUrl}
          alt=""
          fill
          className={`object-cover scale-110 blur-3xl brightness-50 transition-opacity duration-1000 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setImageLoaded(true)}
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-background/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-8 px-6 py-12">
        {/* Album Art */}
        <div
          className="relative aspect-square w-full max-w-sm overflow-hidden rounded-lg shadow-2xl transition-all duration-700"
          style={{
            boxShadow: `0 25px 50px -12px hsl(${dominantColorHsl} / 0.4)`,
          }}
        >
          <Image
            src={nowPlaying.albumImageUrl}
            alt={`${nowPlaying.albumName} album art`}
            fill
            className="object-cover"
            priority
            unoptimized
          />

          {/* Play/Pause indicator */}
          <div className="absolute bottom-4 right-4">
            {nowPlaying.isPlaying ? (
              <div className="flex items-end gap-0.5">
                <span
                  className="w-1 animate-bounce rounded-full"
                  style={{
                    height: "12px",
                    backgroundColor: `hsl(${dominantColorHsl})`,
                    animationDelay: "0ms",
                    animationDuration: "400ms",
                  }}
                />
                <span
                  className="w-1 animate-bounce rounded-full"
                  style={{
                    height: "18px",
                    backgroundColor: `hsl(${dominantColorHsl})`,
                    animationDelay: "150ms",
                    animationDuration: "400ms",
                  }}
                />
                <span
                  className="w-1 animate-bounce rounded-full"
                  style={{
                    height: "14px",
                    backgroundColor: `hsl(${dominantColorHsl})`,
                    animationDelay: "300ms",
                    animationDuration: "400ms",
                  }}
                />
              </div>
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: `hsl(${dominantColorHsl})` }}
              >
                <svg
                  className="h-4 w-4 text-background"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Track Info */}
        <div className="flex w-full flex-col items-center gap-2 text-center">
          <h1 className="font-sans text-2xl font-bold tracking-tight text-foreground md:text-3xl text-balance">
            {nowPlaying.trackName}
          </h1>
          <p className="text-lg text-muted-foreground">
            {nowPlaying.artistNames.join(", ")}
          </p>
          <p className="text-sm text-muted-foreground/70">{nowPlaying.albumName}</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-sm">
          <ProgressBar
            progressMs={nowPlaying.progressMs}
            durationMs={nowPlaying.durationMs}
            isPlaying={nowPlaying.isPlaying}
            accentColor={dominantColorHsl}
          />
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          className="text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

function IdleState({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <div className="flex items-center justify-center h-24 w-24 rounded-full bg-secondary">
          <svg
            className="h-12 w-12 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="font-sans text-2xl font-semibold text-foreground">
            Nothing playing
          </h2>
          <p className="text-muted-foreground max-w-sm">
            Start playing something on Spotify and it will appear here
          </p>
        </div>
        <button
          onClick={onLogout}
          className="text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
