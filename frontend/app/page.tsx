import LighthouseBackground from "@/components/landing/LighthouseBackground";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";

export default function LandingPage() {
  return (
    <div className="landing-root relative min-h-screen overflow-hidden">
      <LighthouseBackground />
      <Navbar />
      <Hero />
    </div>
  );
}
