const stats = [
  { value: "$ 150.06M", label: "TOTAL VALUE LOCKED" },
  { value: "$ 347.63M", label: "MONTHLY VOLUME" },
  { value: "$ 4.36M", label: "MONTHLY FEES" },
  { value: "97.16K", label: "MONTHLY USERS" },
]

export default function StatsSection() {
  return (
    <section className="px-6 py-24 md:px-12 lg:px-20">
      <div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <p className="text-3xl md:text-4xl font-regular text-white mb-3 tracking-tight">{stat.value}</p>
            <p className="text-sm font-medium text-white/50 uppercase tracking-normal">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
