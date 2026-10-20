// NewL1 concept -> Orderveil implementation status. Status values:
//   simulated     implemented as a local simulation and covered by tests
//   simplified    simulated with documented simplifications vs. the proposal
//   notImplemented planned / interface reserved only
export const MAPPING = [
  { id: 'teeGateway', status: 'simplified', section: 'architecture', link: '/network' },
  { id: 'privateDefault', status: 'simulated', section: 'mev', link: '/playground' },
  { id: 'deterministic', status: 'simulated', section: 'ordering', link: '/playground' },
  { id: 'tick', status: 'simplified', section: 'ordering', link: '/playground' },
  { id: 'optin', status: 'simplified', section: 'ordering', link: '/playground' },
  { id: 'afterRef', status: 'simulated', section: 'ordering', link: '/playground' },
  { id: 'subblock', status: 'simplified', section: 'architecture', link: '/network' },
  { id: 'inputCommitment', status: 'simulated', section: 'attestation', link: '/playground' },
  { id: 'replay', status: 'simulated', section: 'attestation', link: '/playground' },
  { id: 'attestation', status: 'notImplemented', section: 'attestation', link: null },
]
