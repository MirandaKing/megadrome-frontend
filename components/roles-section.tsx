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
  return (
    <section className="px-4 py-12 sm:px-6 md:px-12 lg:px-20">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((role, index) => (
          <div
            key={index}
            className="rounded-xl overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={role.image}
              alt={`Role card ${index + 1}`}
              className="w-full h-auto"
            />
          </div>
        ))}
      </div>
    </section>
  )
}
