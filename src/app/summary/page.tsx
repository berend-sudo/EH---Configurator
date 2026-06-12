import SummaryClient from "./SummaryClient";
import { scanFloorPlans } from "@/lib/floor-plan-scan";

// Pre-scan the floor-plan registry server-side and pass it to the client tree,
// skipping the post-hydration /api/floor-plans round trip. force-dynamic keeps
// freshly-uploaded DXFs visible without a rebuild.
export const dynamic = "force-dynamic";

export default async function Page() {
  const plans = await scanFloorPlans();
  return <SummaryClient initialPlans={plans} />;
}
