import { Suspense } from "react";
import LandingScreen from "@/components/landing/LandingScreen";

// LandingScreen calls useSearchParams() to restore state from URL params
// (when arriving back from /configurator). useSearchParams forces this
// page to be client-bailout, so it must be wrapped in a Suspense boundary.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <LandingScreen />
    </Suspense>
  );
}
