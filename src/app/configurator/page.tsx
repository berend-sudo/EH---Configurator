import ConfiguratorClient from "./ConfiguratorClient";
import { scanFloorPlans } from "@/lib/floor-plan-scan";

// Re-scan on each request so newly uploaded DXFs show up without a rebuild,
// and hand the registry to the client tree as a prop. This removes the
// post-hydration /api/floor-plans round trip that used to gate the first
// plan render (the landing page already pre-scans the same way).
export const dynamic = "force-dynamic";

export default async function Page() {
  const plans = await scanFloorPlans();
  return <ConfiguratorClient initialPlans={plans} />;
}
