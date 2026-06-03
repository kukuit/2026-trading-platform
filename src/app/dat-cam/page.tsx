import { HeroSection } from './_page/HeroSection'
import { PricingSection } from './_page/PricingSection'
import { TrustFaqSection } from './_page/TrustFaqSection'
import { OrderForm } from './_page/OrderForm'

export default function DatCamPage() {
  return (
    <main className="min-h-screen bg-[#FFFBF7] text-slate-900">
      <HeroSection />
      <PricingSection />
      <TrustFaqSection />
      <OrderForm />
    </main>
  )
}
