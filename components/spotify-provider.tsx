"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  initiateSpotifyAuth,
  exchangeCodeForTokens,
  refreshAccessToken,
  loadTokens,
  clearTokens,
  isTokenExpired,
  type SpotifyTokens,
} from "@/lib/spotify-auth";
import { fetchCurrentlyPlaying, type NowPlayingData, type FetchResult } from "@/lib/spotify-api";
import { extractDominantColor, rgbToHslString, type RGB } from "@/lib/color-extractor";

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";
const REDIRECT_URI =
  typeof window !== "undefined"
    ? `${window.location.origin}/callback`
    : process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI || "";

const POLL_INTERVAL = 4000; // 4 seconds

interface SpotifyContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  nowPlaying: NowPlayingData | null;
  dominantColor: RGB | null;
  dominantColorHsl: string;
  error: string | null;
  login: () => void;
  logout: () => void;
}

const SpotifyContext = createContext<SpotifyContextValue | null>(null);

export function useSpotify() {
  const context = useContext(SpotifyContext);
  if (!context) {
    throw new Error("useSpotify must be used within a SpotifyProvider");
  }
  return context;
}

interface SpotifyProviderProps {
  children: ReactNode;
}

export function SpotifyProvider({ children }: SpotifyProviderProps) {
  const [tokens, setTokens] = useState<SpotifyTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [dominantColor, setDominantColor] = useState<RGB | null>(null);
  const [dominantColorHsl, setDominantColorHsl] = useState("141 76% 48%");
  const [error, setError] = useState<string | null>(null);

  const lastTrackId = useRef<string | null>(null);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load tokens on mount
  useEffect(() => {
    const stored = loadTokens();
    if (stored) {
      setTokens(stored);
    }
    setIsLoading(false);
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const errorParam = url.searchParams.get("error");

    if (errorParam) {
      setError("Authorization was denied");
      window.history.replaceState({}, "", "/");
      return;
    }

    if (code) {
      setIsLoading(true);
      exchangeCodeForTokens(code, CLIENT_ID, REDIRECT_URI)
        .then((newTokens) => {
          setTokens(newTokens);
          setError(null);
          // Redirect to main page
          window.location.href = "/";
        })
        .catch((err) => {
          setError(err.message);
          setIsLoading(false);
        });
    }
  }, []);

  // Extract color when album art changes
  const extractColor = useCallback(async (imageUrl: string) => {
    try {
      const color = await extractDominantColor(imageUrl);
      setDominantColor(color);
      setDominantColorHsl(rgbToHslString(color));
    } catch {
      // Use default Spotify green
      setDominantColor({ r: 30, g: 215, b: 96 });
      setDominantColorHsl("141 76% 48%");
    }
  }, []);

  // Fetch now playing data
  const fetchNowPlaying = useCallback(async () => {
    if (!tokens) return;

    // Check if token needs refresh
    if (isTokenExpired(tokens)) {
      try {
        const newTokens = await refreshAccessToken(CLIENT_ID, tokens.refreshToken);
        setTokens(newTokens);
      } catch {
        setError("Session expired. Please reconnect.");
        clearTokens();
        setTokens(null);
        return;
      }
    }

    const result: FetchResult = await fetchCurrentlyPlaying(tokens.accessToken);

    if (result.status === "playing") {
      setNowPlaying(result.data);
      setError(null);

      // Extract color if track changed
      if (result.data.trackId !== lastTrackId.current) {
        lastTrackId.current = result.data.trackId;
        extractColor(result.data.albumImageUrl);
      }
    } else if (result.status === "idle") {
      setNowPlaying(null);
      setError(null);
    } else if (result.status === "error") {
      if (result.code === 401) {
        // Token expired, try to refresh
        try {
          const newTokens = await refreshAccessToken(CLIENT_ID, tokens.refreshToken);
          setTokens(newTokens);
        } catch {
          setError("Session expired. Please reconnect.");
          clearTokens();
          setTokens(null);
        }
      } else if (result.code === 429) {
        // Rate limited, back off (handled by interval)
        console.warn("Rate limited by Spotify API");
      } else {
        setError(result.message);
      }
    }
  }, [tokens, extractColor]);

  // Start polling when authenticated
  useEffect(() => {
    if (tokens) {
      fetchNowPlaying();
      pollInterval.current = setInterval(fetchNowPlaying, POLL_INTERVAL);
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [tokens, fetchNowPlaying]);

  const login = useCallback(() => {
    if (!CLIENT_ID) {
      setError("Spotify Client ID not configured");
      return;
    }
    initiateSpotifyAuth(CLIENT_ID, REDIRECT_URI);
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setTokens(null);
    setNowPlaying(null);
    setDominantColor(null);
    setDominantColorHsl("141 76% 48%");
    lastTrackId.current = null;
  }, []);

  return (
    <SpotifyContext.Provider
      value={{
        isAuthenticated: !!tokens,
        isLoading,
        nowPlaying,
        dominantColor,
        dominantColorHsl,
        error,
        login,
        logout,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
}
