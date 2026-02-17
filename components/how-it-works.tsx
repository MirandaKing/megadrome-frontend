"use client"

import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })

  // Animate the diagram's rotation and scale based on scroll
  const diagramRotate = useTransform(scrollYProgress, [0.2, 0.5], [10, 0])
  const diagramScale = useTransform(scrollYProgress, [0.2, 0.5], [0.9, 1])
  const diagramOpacity = useTransform(scrollYProgress, [0.1, 0.3], [0, 1])

  return (
    <section ref={sectionRef} className="px-6 py-24 md:px-12 lg:px-20 w-full overflow-hidden">
      <div className="w-full max-w-[1400px] mx-auto flex flex-col lg:flex-row items-start justify-between gap-12 lg:gap-20">
        {/* Text Section */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-full lg:w-1/2 flex flex-col justify-center items-start z-10"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-[#8fa8a1] mb-6 font-medium">HOW IT WORKS</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-regular text-white leading-[1.15]">
            Designed to reward
            <br />
            participants that enable
            <br />
            the sustainable growth of
            <br />
            the protocol.
          </h2>
        </motion.div>

        {/* SVG Diagram Section - Animates on scroll */}
        <motion.div
          style={{
            rotate: diagramRotate,
            scale: diagramScale,
            opacity: diagramOpacity,
          }}
          className="w-full lg:w-1/2 flex justify-center lg:justify-end"
        >
          <div className="relative w-full max-w-[800px]">
            <Image
              src="/assets/Artboard 5.svg"
              alt="How Megadrome Works Diagram"
              width={1000}
              height={750}
              className="w-full h-auto object-contain"
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
