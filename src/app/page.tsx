import LandingScreen from "@/components/landing/LandingScreen";
import { scanFloorPlans } from "@/lib/floor-plan-scan";
import { buildPriceIndex } from "@/lib/server/price-index";

// Re-scan on each request so newly uploaded DXFs show up without a rebuild.
export const dynamic = "force-dynamic";

export default async function Page() {
  const [plans, priceIndex] = await Promise.all([scanFloorPlans(), buildPriceIndex()]);
  return <LandingScreen plans={plans} priceIndex={priceIndex} />;
}
