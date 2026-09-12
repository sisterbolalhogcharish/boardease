import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import Hero from '../components/home/Hero'
import Scrollytelling from '../components/home/Scrollytelling'
import { Categories, CTA, FeaturedHouses, Locations, Pricing, StatsBenefits, Testimonials } from '../components/home/HomeSections'

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <FeaturedHouses />
      <Categories />
      <Locations />
      <Scrollytelling />
      <Testimonials />
      <StatsBenefits />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  )
}

export const navigationSections = [
  { id: 'explore', label: 'Explore' },
  { id: 'featured', label: 'Featured' },
  { id: 'categories', label: 'Categories' },
  { id: 'locations', label: 'Locations' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'pricing', label: 'Pricing' },
]
