import FootballDashboard from "./_components/FootballDashboard";

export const metadata = {
  title: "Football Live Odds Collector",
  description: "Monitor live football fixtures and odds snapshots.",
};

export default function FootballPage() {
  return <FootballDashboard initialTab="overview" requiresAdminToken={process.env.NODE_ENV === "production"} />;
}

