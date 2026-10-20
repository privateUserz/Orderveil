import Hero from '../components/home/Hero.jsx'
import Capabilities from '../components/home/Capabilities.jsx'
import HowItWorks from '../components/home/HowItWorks.jsx'
import SettlementFlow from '../components/home/SettlementFlow.jsx'
import CompareDifference from '../components/home/CompareDifference.jsx'
import ResearchFoundation from '../components/home/ResearchFoundation.jsx'
import { usePageMeta } from '../hooks/usePageMeta.js'

export default function Home() {
  usePageMeta('home')
  return (
    <>
      <Hero />
      <Capabilities />
      <HowItWorks />
      <SettlementFlow />
      <CompareDifference />
      <ResearchFoundation />
    </>
  )
}
