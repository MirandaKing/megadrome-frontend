import Header from "@/components/header"
import ManageLock from "@/components/manage-lock"
import Footer from "@/components/footer"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ManageLockPage({ params }: Props) {
  const { id } = await params

  return (
    <main
      className="min-h-screen text-white flex flex-col"
      style={{
        background:
          "linear-gradient(135deg, #0a1612 0%, #0d2820 25%, #0d3d2e 50%, #15713a 100%)",
      }}
    >
      <Header />

      <div className="pt-8 pb-4 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
          Manage Lock
        </h1>
        <p className="text-white/60 text-sm md:text-base max-w-md mx-auto">
          Increase, extend, merge, or transfer your veNFT lock
        </p>
      </div>

      <div className="flex-1 px-4 py-8">
        <ManageLock tokenId={id} />
      </div>

      <Footer />
    </main>
  )
}
