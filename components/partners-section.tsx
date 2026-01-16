import Image from "next/image"

const partnerLogos = [
  "Link → abracadabra.svg.svg",
  "Link → angle.svg.svg",
  "Link → inverse.svg.svg",
  "Link → lido.svg.svg",
  "Link → liquity.svg.svg",
  "Link → mai.svg.svg",
  "Link → makerdao.svg.svg",
  "Link → optimism.svg.svg",
  "Link → rocketpool.svg.svg",
  "Link → thales.svg.svg",
  "frax.svg fill.svg",
  "lyra.svg fill.svg",
  "synthetix.svg fill.svg",
]

export default function PartnersSection() {
  return (
    <section className="px-6 py-16 md:px-12 lg:px-20 bg-[#111318]">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex justify-center items-center gap-8 md:gap-12 mb-10 overflow-x-auto">
          {partnerLogos.map((logo, index) => (
            <div key={index} className="relative h-8 w-8 flex-shrink-0 flex items-center justify-center opacity-50 hover:opacity-100 transition-all duration-300">
              <Image
                src={`/assets/partnersSvgs/${logo}`}
                alt={`Partner ${index}`}
                height={32}
                width={32}
                className="h-8 w-8 object-contain"
              />
            </div>
          ))}
        </div>
        <div className="border-y border-white/5 py-4">
          <p className="text-center text-white/40 text-xs">
            Data and metrics are openly available on{" "}
            <a href="#" className="underline hover:text-white transition-colors">
              Token Terminal
            </a>{" "}
            and{" "}
            <a href="#" className="underline hover:text-white transition-colors">
              Dune
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
