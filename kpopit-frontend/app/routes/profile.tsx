import { useLoaderData } from "react-router";
import UserProfile from "../../src/pages/User/UserProfile";
import Profile from "../../src/pages/Profile/Profile";
import HeldData from "../../src/components/Loading/HeldData";
import PageLoader from "../../src/components/Loading/PageLoader";
import { loadProfileStats } from "../../src/pages/User/profileData";
import { holdForData } from "../../src/utils/holdNavigation";
import ProtectedRoute from "../../src/components/ProtectedRoute/ProtectedRoute";
import { useFeatures } from "../../src/hooks/useFeatures";

export const handle = { puff: "public_profile" };

// The own-profile stats for the page shown while public profiles are off, held up to 200 ms.
export async function clientLoader() {
  const stats = loadProfileStats();
  return { held: stats ? await holdForData(stats) : null };
}

export default function ProfileRoute() {
  const { held } = useLoaderData<typeof clientLoader>();
  const { features, ready } = useFeatures();
  if (!ready) return <PageLoader />;
  if (features.public_profile) return <Profile />;
  // Flag off: the account's own profile page, as before public profiles.
  return (
    <ProtectedRoute>
      <HeldData data={held} message="Loading Kpopit..." errorMessage="Error loading your profile.">
        {() => <UserProfile />}
      </HeldData>
    </ProtectedRoute>
  );
}
