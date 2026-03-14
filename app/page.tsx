import { SpotifyProvider } from "@/components/spotify-provider";
import { Visualizer } from "@/components/visualizer";

export default function Home() {
  return (
    <SpotifyProvider>
      <main className="min-h-screen bg-background">
        <Visualizer />
      </main>
    </SpotifyProvider>
  );
}
