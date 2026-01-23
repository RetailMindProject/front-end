import HomeAISection from "../components/home/HomeAISection";
import HomeHero from "../components/home/HomeHero";
import HomeIconStrip from "../components/home/HomeIconStrip";
import HomeReliability from "../components/home/HomeReliability";
import HomeRoles from "../components/home/HomeRoles";
import HomeStats from "../components/home/HomeStats";
import Footer from "../components/Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-slate-50 to-white">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="py-10 sm:py-14">
          <HomeHero />
          <HomeIconStrip />
          <HomeRoles />
        </div>
      </div>

      <HomeAISection />

      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="py-10 sm:py-14">
          <HomeStats />
        </div>
      </div>

      <HomeReliability />
      <Footer />
    </div>
  );
}

