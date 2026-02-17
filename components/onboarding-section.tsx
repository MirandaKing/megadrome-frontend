"use client"

import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"

export default function OnboardingSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })

  // Rocket floats up as you scroll
  const rocketY = useTransform(scrollYProgress, [0.2, 0.6], [50, -20])
  const rocketOpacity = useTransform(scrollYProgress, [0.15, 0.3], [0, 1])
  const rocketRotate = useTransform(scrollYProgress, [0.2, 0.6], [-5, 5])

  return (
    <section ref={sectionRef} className="px-6 py-24 md:px-12 lg:px-20 text-center relative overflow-hidden bg-[#111318]">
      {/* Background gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0c2e24]/20 blur-[120px] rounded-full -z-10" />

      <div className="max-w-xl mx-auto relative z-10">
        {/* Rocket animates on scroll */}
        <motion.div
          style={{ y: rocketY, opacity: rocketOpacity, rotate: rocketRotate }}
          className="mb-6 flex justify-center"
        >
          <Image
            src="/assets/Rocket@3x 1.svg"
            alt="Rocket Illustration"
            width={220}
            height={220}
            className="w-[220px] h-auto object-contain"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="inline-block bg-[#161b22] border border-white/5 text-white/50 text-xs px-4 py-2 rounded-lg mb-6 tracking-wide font-medium"
        >
          Onboarding Guide
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-3xl md:text-4xl font-semibold text-white leading-tight"
        >
          Looking to get started
          <div className="bg-gradient-to-r from-white via-white/80 to-white/50 bg-clip-text text-transparent">
            with Megadrome
          </div>
          Finance?
        </motion.h2>
      </div>
    </section>
  )
}
