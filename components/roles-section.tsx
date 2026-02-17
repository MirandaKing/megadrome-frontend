"use client"

import { motion, useScroll, useTransform } from "framer-motion"
import { useRef } from "react"

const roles = [
  {
    image: "/assets/Overlay+Shadow.svg",
  },
  {
    image: "/assets/Overlay+Shadow-2.svg",
  },
  {
    image: "/assets/Overlay+Shadow-3.svg",
  },
  {
    image: "/assets/Overlay+Shadow-4.svg",
  },
]

export default function RolesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })

  return (
    <section ref={sectionRef} className="px-4 py-12 sm:px-6 md:px-12 lg:px-20">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((role, index) => {
          // Each card has slightly different scroll timing - faster animation
          const start = 0.05 + index * 0.02
          const end = 0.2 + index * 0.02

          return (
            <RoleCard
              key={index}
              image={role.image}
              index={index}
              scrollYProgress={scrollYProgress}
              start={start}
              end={end}
            />
          )
        })}
      </div>
    </section>
  )
}

function RoleCard({
  image,
  index,
  scrollYProgress,
  start,
  end
}: {
  image: string
  index: number
  scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"]
  start: number
  end: number
}) {
  const y = useTransform(scrollYProgress, [start, end], [60, 0])
  const opacity = useTransform(scrollYProgress, [start, end], [0, 1])
  const scale = useTransform(scrollYProgress, [start, end], [0.9, 1])

  return (
    <motion.div
      style={{ y, opacity, scale }}
      whileHover={{ scale: 1.03, y: -5 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl overflow-hidden cursor-pointer"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt={`Role card ${index + 1}`}
        className="w-full h-auto"
      />
    </motion.div>
  )
}
