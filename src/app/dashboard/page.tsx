// src/app/dashboard/page.tsx
// This is the main dashboard page for your AI Gaming Assistant.

import PerformanceDashboard from '@/components/PerformanceDashboard'; // Import your PerformanceDashboard component

// This is a Server Component by default.
// It renders the PerformanceDashboard, which is a Client Component.
export default function DashboardPage() {
  return (
    <main>
      {/* Render your PerformanceDashboard component here */}
      <PerformanceDashboard />
    </main>
  );
}