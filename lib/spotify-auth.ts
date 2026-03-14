// Spotify OAuth PKCE Flow Utilities

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SCOPES = ["user-read-currently-playing", "user-read-playback-state"];

// Generate a random string for PKCE code verifier
function generateRandomString(length: number): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

// Generate SHA-256 hash for PKCE code challenge
async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

// Base64 URL encode
function base64urlencode(input: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

// Generate code challenge from verifier
async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashed = await sha256(verifier);
  return base64urlencode(hashed);
}

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Start the OAuth flow
export async function initiateSpotifyAuth(clientId: string, redirectUri: string): Promise<void> {
  const codeVerifier = generateRandomString(64);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store the code verifier for later
  sessionStorage.setItem("spotify_code_verifier", codeVerifier);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
  });

  window.location.href = `${SPOTIFY_AUTH_URL}?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  redirectUri: string
): Promise<SpotifyTokens> {
  const codeVerifier = sessionStorage.getItem("spotify_code_verifier");

  if (!codeVerifier) {
    throw new Error("No code verifier found");
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || "Failed to exchange code for tokens");
  }

  const data = await response.json();

  // Clear the code verifier
  sessionStorage.removeItem("spotify_code_verifier");

  const tokens: SpotifyTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  // Store tokens
  saveTokens(tokens);

  return tokens;
}

// Refresh the access token
export async function refreshAccessToken(
  clientId: string,
  refreshToken: string
): Promise<SpotifyTokens> {
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();

  const tokens: SpotifyTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  saveTokens(tokens);

  return tokens;
}

// Save tokens to sessionStorage
export function saveTokens(tokens: SpotifyTokens): void {
  sessionStorage.setItem("spotify_tokens", JSON.stringify(tokens));
}

// Load tokens from sessionStorage
export function loadTokens(): SpotifyTokens | null {
  const stored = sessionStorage.getItem("spotify_tokens");
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// Clear tokens
export function clearTokens(): void {
  sessionStorage.removeItem("spotify_tokens");
}

// Check if tokens are expired (with 60 second buffer)
export function isTokenExpired(tokens: SpotifyTokens): boolean {
  return Date.now() > tokens.expiresAt - 60000;
}
