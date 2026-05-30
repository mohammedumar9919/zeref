import { CockpitGrid } from "@/components/cockpit/CockpitGrid";
import { getCockpitSlices } from "@/lib/bff";

export default async function CockpitPage(): Promise<React.ReactElement> {
  const slices = await getCockpitSlices();

  return (
    <div data-testid="cockpit-page">
      <header className="px-4 pb-2 pt-4 text-center md:px-6">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-hud-cyan/80">
          Operator cockpit
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-hud-primary md:text-3xl">
          Command center
        </h1>
      </header>
      <CockpitGrid slices={slices} />
    </div>
  );
}
