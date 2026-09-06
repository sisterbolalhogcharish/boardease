import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import Hero from '../components/home/Hero'
import Scrollytelling from '../components/home/Scrollytelling'
import { Categories, CTA, FeaturedHouses, Locations, StatsBenefits, Testimonials } from '../components/home/HomeSections'

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <FeaturedHouses />
      <Locations />
      <Categories />
      <Scrollytelling />
      <StatsBenefits />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  )
}
