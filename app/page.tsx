import Header from "@/components/header"
import HeroSection from "@/components/hero-section"
import HowItWorks from "@/components/how-it-works"
import RolesSection from "@/components/roles-section"
import StatsSection from "@/components/stats-section"
import PartnersSection from "@/components/partners-section"
import OnboardingSection from "@/components/onboarding-section"
import Footer from "@/components/footer"

export default function Home() {
  return (
    <main
      className="min-h-screen text-white"
      style={{
        background: "linear-gradient(45deg, #006b70 0%, #15713a 50%, #163121 100%)",
      }}
    >
      <Header />
      <HeroSection />
      <HowItWorks />
      <RolesSection />
      <StatsSection />
      <PartnersSection />
      <OnboardingSection />
      <Footer />
    </main>
  )
}
