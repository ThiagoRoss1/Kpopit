import { useLoaderData } from "react-router";
import UserProfile from "../../src/pages/User/UserProfile";
import HeldData from "../../src/components/Loading/HeldData";
import { loadProfileStats } from "../../src/pages/User/profileData";
import { holdForData } from "../../src/utils/holdNavigation";
import ProtectedRoute from "../../src/components/ProtectedRoute/ProtectedRoute";

// The player's stats, held up to 200 ms; null while the session is unknown (the page then waits).
export async function clientLoader() {
  const stats = loadProfileStats();
  return { held: stats ? await holdForData(stats) : null };
}

export default function ProfileRoute() {
  const { held } = useLoaderData<typeof clientLoader>();
  // Own profile only until the public owner/visitor page ships.
  return (
    <ProtectedRoute>
      <HeldData data={held} message="Loading Kpopit..." errorMessage="Error loading your profile.">
        {() => <UserProfile />}
      </HeldData>
    </ProtectedRoute>
  );
}
