// Official public references used by Orderveil. Retrieved and read on 2026-10-20.
export const REFERENCES = [
  {
    id: 'teeGateway',
    url: 'https://forum.bnbchain.org/t/introducing-newl1-mev-solution-tee-gateway/5589',
  },
  {
    id: 'newl1About',
    url: 'https://forum.bnbchain.org/t/about-the-bnbchain-newl1-category/5437',
  },
]

export const TEE_URL = REFERENCES[0].url
export const ABOUT_URL = REFERENCES[1].url

/** Section anchors of the TEE Gateway post, used to point each topic at its source section. */
export const SOURCE_SECTIONS = {
  core: '00. Core Proposal',
  goals: '01. Goals and Boundaries',
  architecture: '03. Overall Architecture',
  ordering: '04. Ordering Engine',
  mev: '05. MEV Protection',
  searchers: '06. Searchers',
  validators: '07. Validators and Deployment Suggestion',
  attestation: '09. Attestation and Auditing',
  roadmap: '11. Roadmap and Open Questions',
}
