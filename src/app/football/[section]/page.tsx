import { notFound } from "next/navigation";
import FootballDashboard from "../_components/FootballDashboard";
import { footballTabFromSegment } from "../routes";

export default function FootballSectionPage({ params }: { params: { section: string } }) {
  const tab = footballTabFromSegment(params.section);
  if (!tab || tab === "overview") notFound();

  return <FootballDashboard key={tab} initialTab={tab} requiresAdminToken={process.env.NODE_ENV === "production"} />;
}
