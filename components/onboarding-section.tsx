import Image from "next/image"

export default function OnboardingSection() {
  return (
    <section className="px-6 py-24 md:px-12 lg:px-20 text-center relative overflow-hidden bg-[#111318]">
      {/* Background gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0c2e24]/20 blur-[120px] rounded-full -z-10" />

      <div className="max-w-xl mx-auto relative z-10">
        <div className="mb-6 flex justify-center">
          <Image
            src="/assets/Rocket@3x 1.svg"
            alt="Rocket Illustration"
            width={220}
            height={220}
            className="w-[220px] h-auto object-contain"
          />
        </div>

        <div className="inline-block bg-[#161b22] border border-white/5 text-white/50 text-xs px-4 py-2 rounded-lg mb-6 tracking-wide font-medium">
          Onboarding Guide
        </div>

        <h2 className="text-3xl md:text-4xl font-semibold text-white leading-tight">
          Looking to get started
          <div className="bg-gradient-to-r from-white via-white/80 to-white/50 bg-clip-text text-transparent">
            with Megadrome
          </div>
          Finance?
        </h2>
      </div>
    </section>
  )
}
