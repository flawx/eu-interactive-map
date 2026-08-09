import MapInterface from "@/components/map/MapInterface";
import { MapScrollLock } from "@/components/map/MapScrollLock";

export default function Home() {
  return (
    <main className="fixed inset-0 h-full w-full overflow-hidden bg-slate-950">
      <MapScrollLock />
      <MapInterface />
    </main>
  );
}
