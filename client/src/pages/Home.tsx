import HeroSection from "@/components/HeroSection";
import StrategicOverview from "@/components/StrategicOverview";
import CityContext from "@/components/CityContext";
import StrategicDiagnosis from "@/components/StrategicDiagnosis";
import CampaignLogic from "@/components/CampaignLogic";
import MainOffers from "@/components/MainOffers";
import MetaAdsPlan from "@/components/MetaAdsPlan";
import GoogleAdsPlan from "@/components/GoogleAdsPlan";
import CreativeDemands from "@/components/CreativeDemands";
import CommunicationPolicy from "@/components/CommunicationPolicy";
import KPIs from "@/components/KPIs";
import ImplementationPlan from "@/components/ImplementationPlan";
import VisualSection from "@/components/VisualSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <StrategicOverview />
      <CityContext />
      <StrategicDiagnosis />
      <CampaignLogic />
      <MainOffers />
      <VisualSection />
      <MetaAdsPlan />
      <GoogleAdsPlan />
      <CreativeDemands />
      <CommunicationPolicy />
      <KPIs />
      <ImplementationPlan />
      <Footer />
    </div>
  );
}
