// import { CheckCircle2 } from "lucide-react"

const CheckVector = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white/40 group-hover:text-white/80 transition-colors flex-shrink-0">
    <g clipPath="url(#clip0_2008_168)">
      <path d="M14.6666 7.38625V7.99958C14.6658 9.4372 14.2003 10.836 13.3395 11.9875C12.4787 13.1389 11.2688 13.9812 9.89016 14.3889C8.51154 14.7965 7.03809 14.7475 5.68957 14.2493C4.34104 13.7511 3.18969 12.8303 2.40723 11.6243C1.62476 10.4183 1.25311 8.99163 1.3477 7.55713C1.44229 6.12263 1.99806 4.75714 2.93211 3.6643C3.86615 2.57146 5.12844 1.80984 6.53071 1.49301C7.93298 1.17619 9.4001 1.32114 10.7133 1.90625" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.6667 2.66699L8 9.34033L6 7.34033" stroke="currentColor" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <defs>
      <clipPath id="clip0_2008_168">
        <rect width="16" height="16" fill="currentColor" />
      </clipPath>
    </defs>
  </svg>
)

const features = [
  {
    title: "Stable & Volatile",
    subtitle: "Trading for Low Fees",
  },
  {
    title: "100% of Protocol Incentives",
    subtitle: "and Fees Go to Voters",
  },
  {
    title: "Liquid Locked Positions",
    subtitle: "in the Form of VeNFTs",
  },
  {
    title: "Permissionless Pools,",
    subtitle: "Gauges, and Incentives",
  },
  {
    title: "Self-Optimizing",
    subtitle: "Liquidity Flywheel",
  },
  {
    title: "Anti-dilution",
    subtitle: "rebases for voters",
  },
]

export default function FeaturesGrid() {
  return (
    <section className="px-4 py-8 md:px-12 lg:px-20 relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-[1400px] mx-auto">
        {features.map((feature, index) => (
          <div
            key={index}
            className="group px-6 py-8 flex items-start justify-between hover:bg-white/5 transition-all duration-300 border-b border-white/10 lg:border-b-0 lg:border-r last:border-r-0 [&:nth-child(3)]:lg:border-r-0 [&:nth-child(1)]:lg:border-b [&:nth-child(2)]:lg:border-b [&:nth-child(3)]:lg:border-b"
          >
            <div className="flex flex-col gap-1">
              <p className="text-white text-base font-medium">{feature.title}</p>
              <p className="text-white/60 text-sm">{feature.subtitle}</p>
            </div>
            <CheckVector />
          </div>
        ))}
      </div>
    </section>
  )
}
