import { SpotifyProvider } from "@/components/spotify-provider";
import { Visualizer } from "@/components/visualizer";

// This page handles the OAuth callback
// The SpotifyProvider automatically detects the code in the URL
// and exchanges it for tokens, then redirects to the main page

export default function CallbackPage() {
  return (
    <SpotifyProvider>
      <main className="min-h-screen bg-background">
        <Visualizer />
      </main>
    </SpotifyProvider>
  );
}
