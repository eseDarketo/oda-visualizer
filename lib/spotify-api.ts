// Spotify Web API Utilities

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyArtist {
  name: string;
  id: string;
}

export interface SpotifyAlbum {
  name: string;
  images: SpotifyImage[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  duration_ms: number;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
}

export interface SpotifyEpisode {
  id: string;
  name: string;
  duration_ms: number;
  show: {
    name: string;
    images: SpotifyImage[];
  };
  images: SpotifyImage[];
}

export interface CurrentlyPlayingResponse {
  is_playing: boolean;
  progress_ms: number;
  currently_playing_type: "track" | "episode" | "ad" | "unknown";
  item: SpotifyTrack | SpotifyEpisode | null;
}

export interface NowPlayingData {
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  trackId: string;
  trackName: string;
  artistNames: string[];
  albumName: string;
  albumImageUrl: string;
  type: "track" | "episode";
}

export type FetchResult =
  | { status: "playing"; data: NowPlayingData }
  | { status: "idle" }
  | { status: "error"; code: number; message: string };

export async function fetchCurrentlyPlaying(accessToken: string): Promise<FetchResult> {
  try {
    const response = await fetch(`${SPOTIFY_API_BASE}/me/player/currently-playing`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // 204 means nothing is playing
    if (response.status === 204) {
      return { status: "idle" };
    }

    // Handle errors
    if (!response.ok) {
      return {
        status: "error",
        code: response.status,
        message: response.status === 401 ? "Token expired" : "API error",
      };
    }

    const data: CurrentlyPlayingResponse = await response.json();

    // Handle no item or ads
    if (!data.item || data.currently_playing_type === "ad") {
      return { status: "idle" };
    }

    // Handle track
    if (data.currently_playing_type === "track") {
      const track = data.item as SpotifyTrack;
      const highestResImage = track.album.images.reduce((prev, current) =>
        (current.height || 0) > (prev.height || 0) ? current : prev
      );

      return {
        status: "playing",
        data: {
          isPlaying: data.is_playing,
          progressMs: data.progress_ms,
          durationMs: track.duration_ms,
          trackId: track.id,
          trackName: track.name,
          artistNames: track.artists.map((a) => a.name),
          albumName: track.album.name,
          albumImageUrl: highestResImage.url,
          type: "track",
        },
      };
    }

    // Handle podcast episode
    if (data.currently_playing_type === "episode") {
      const episode = data.item as SpotifyEpisode;
      const images = episode.images.length > 0 ? episode.images : episode.show.images;
      const highestResImage = images.reduce((prev, current) =>
        (current.height || 0) > (prev.height || 0) ? current : prev
      );

      return {
        status: "playing",
        data: {
          isPlaying: data.is_playing,
          progressMs: data.progress_ms,
          durationMs: episode.duration_ms,
          trackId: episode.id,
          trackName: episode.name,
          artistNames: [episode.show.name],
          albumName: episode.show.name,
          albumImageUrl: highestResImage.url,
          type: "episode",
        },
      };
    }

    return { status: "idle" };
  } catch (error) {
    return {
      status: "error",
      code: 0,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Format milliseconds to m:ss
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
