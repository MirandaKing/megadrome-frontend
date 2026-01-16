import Image from "next/image"

export default function HowItWorks() {
  return (
    <section className="px-6 py-24 md:px-12 lg:px-20 w-full overflow-hidden">
      <div className="w-full max-w-[1400px] mx-auto flex flex-col lg:flex-row items-start justify-between gap-12 lg:gap-20">
        {/* Text Section */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-start z-10">
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
        </div>

        {/* SVG Diagram Section */}
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end">
          <div className="relative w-full max-w-[800px]">
            <Image
              src="/assets/Artboard 5.svg"
              alt="How Megadrome Works Diagram"
              width={1000}
              height={750}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

