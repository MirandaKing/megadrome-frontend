"use client"

import { motion, useScroll, useTransform, useInView } from "framer-motion"
import { useRef, useEffect, useState } from "react"

const stats = [
  { value: 150.06, prefix: "$ ", suffix: "M", label: "TOTAL VALUE LOCKED" },
  { value: 347.63, prefix: "$ ", suffix: "M", label: "MONTHLY VOLUME" },
  { value: 4.36, prefix: "$ ", suffix: "M", label: "MONTHLY FEES" },
  { value: 97.16, prefix: "", suffix: "K", label: "MONTHLY USERS" },
]

// Animated counter that counts up when in view
function AnimatedCounter({ value, prefix, suffix }: { value: number; prefix: string; suffix: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  useEffect(() => {
    if (isInView) {
      const duration = 2000
      const steps = 60
      const increment = value / steps
      let current = 0

      const timer = setInterval(() => {
        current += increment
        if (current >= value) {
          setCount(value)
          clearInterval(timer)
        } else {
          setCount(current)
        }
      }, duration / steps)

      return () => clearInterval(timer)
    }
  }, [isInView, value])

  return (
    <span ref={ref}>
      {prefix}{count.toFixed(2)}{suffix}
    </span>
  )
}

export default function StatsSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })

  // Scale the entire section slightly as it comes into view
  const scale = useTransform(scrollYProgress, [0.1, 0.3], [0.95, 1])
  const opacity = useTransform(scrollYProgress, [0.1, 0.25], [0, 1])

  return (
    <section ref={sectionRef} className="px-6 py-24 md:px-12 lg:px-20">
      <motion.div
        style={{ scale, opacity }}
        className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
      >
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="text-center"
          >
            <p className="text-3xl md:text-4xl font-regular text-white mb-3 tracking-tight">
              <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
            </p>
            <p className="text-sm font-medium text-white/50 uppercase tracking-normal">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
