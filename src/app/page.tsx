import LandingScreen from "@/components/landing/LandingScreen";
import { scanFloorPlans } from "@/lib/floor-plan-scan";

// Re-scan on each request so newly uploaded DXFs show up without a rebuild.
export const dynamic = "force-dynamic";

export default async function Page() {
  const plans = await scanFloorPlans();
  return <LandingScreen plans={plans} />;
}
