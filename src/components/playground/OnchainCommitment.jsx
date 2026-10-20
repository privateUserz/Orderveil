import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { useConnectModal, useChainModal } from '@rainbow-me/rainbowkit'
import { Link2, CheckCircle2, AlertTriangle, Loader2, ExternalLink as ExtIcon, RefreshCcw } from 'lucide-react'
import { COMMITMENTS_ADDRESS, TARGET_CHAIN, FAUCET_URL, IS_LOCAL, explorerAddress, explorerBlock, explorerTx } from '../../config/onchain.js'
import { orderveilCommitmentsAbi, commitArgs, parseCommitment, commitmentMatches, classifyTxError } from '../../services/bscTestnet.js'
import { Button } from '../ui/Button.jsx'
import Hash from '../ui/Hash.jsx'

function ExtLink({ href, children }) {
  if (!href) return <>{children}</>
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:text-ink">
      {children}
      <ExtIcon className="h-3 w-3" aria-hidden="true" />
    </a>
  )
}

/**
 * On-chain commitment status for a record digest, plus (optionally) a button to commit it.
 * Reads go through the public RPC and need no wallet.
 */
export default function OnchainCommitment({ record, digest, allowCommit = false }) {
  const { t, i18n } = useTranslation()
  const { address, chainId, isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()
  const { openChainModal } = useChainModal()
  const enabled = Boolean(COMMITMENTS_ADDRESS && digest)

  const read = useReadContract({
    address: COMMITMENTS_ADDRESS ?? undefined,
    abi: orderveilCommitmentsAbi,
    functionName: 'getCommitment',
    args: [digest],
    chainId: TARGET_CHAIN.id,
    query: { enabled },
  })
  const write = useWriteContract()
  const receipt = useWaitForTransactionReceipt({ hash: write.data, chainId: TARGET_CHAIN.id, query: { enabled: Boolean(write.data) } })

  // a different experiment invalidates any in-flight submission state
  useEffect(() => {
    write.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digest])

  useEffect(() => {
    if (receipt.isSuccess) read.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess])

  const commitment = parseCommitment(read.data)
  const matches = commitment && commitmentMatches(commitment, record)
  const errKey = classifyTxError(write.error) ?? (receipt.isError ? 'receiptFailed' : null)
  const onRightChain = isConnected && chainId === TARGET_CHAIN.id

  let blocker = null
  if (!isConnected) blocker = 'connect'
  else if (!onRightChain) blocker = 'switch'

  const submit = () =>
    write.writeContract({
      address: COMMITMENTS_ADDRESS,
      abi: orderveilCommitmentsAbi,
      functionName: 'commit',
      args: commitArgs(record, digest),
      chainId: TARGET_CHAIN.id,
      account: address,
    })

  return (
    <div className="panel-inset p-4" data-testid="onchain-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[0.85rem] font-medium">
          <Link2 className="h-4 w-4 text-muted" aria-hidden="true" />
          {t('onchain.title')}
          <span className="rounded-full border border-info/30 bg-info/10 px-2 py-px text-[0.66rem] font-medium text-info">{t('onchain.badge')}</span>
        </div>
        <span className="text-[0.72rem] text-faint">
          {TARGET_CHAIN.name} · {t('onchain.chainId', { id: TARGET_CHAIN.id })}
        </span>
      </div>

      {!COMMITMENTS_ADDRESS ? (
        <p className="mt-3 text-[0.78rem] text-muted">{t('onchain.notConfigured')}</p>
      ) : (
        <>
          <dl className="mt-3 space-y-1.5 text-[0.76rem]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('onchain.contract')}</dt>
              <dd>
                <ExtLink href={explorerAddress(COMMITMENTS_ADDRESS)}>
                  <span className="hash">{`${COMMITMENTS_ADDRESS.slice(0, 8)}…${COMMITMENTS_ADDRESS.slice(-6)}`}</span>
                </ExtLink>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">recordDigest</dt>
              <dd>
                <Hash value={digest} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">{t('onchain.status')}</dt>
              <dd className="text-right" aria-live="polite">
                {read.isLoading ? (
                  <span className="inline-flex items-center gap-1 text-muted">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    {t('onchain.checking')}
                  </span>
                ) : read.isError ? (
                  <span className="inline-flex items-center gap-2 text-warn">
                    {t('onchain.readFailed')}
                    <button type="button" onClick={() => read.refetch()} className="text-faint hover:text-ink" aria-label={t('onchain.retry')}>
                      <RefreshCcw className="h-3 w-3" />
                    </button>
                  </span>
                ) : commitment ? (
                  <span className="inline-flex items-center gap-1 font-medium text-accent">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t('onchain.committed')}
                  </span>
                ) : (
                  <span className="text-ink-2">{t('onchain.notCommitted')}</span>
                )}
              </dd>
            </div>
            {commitment && (
              <>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('onchain.block')}</dt>
                  <dd className="tabular-nums">
                    <ExtLink href={explorerBlock(commitment.blockNumber.toString())}>#{commitment.blockNumber.toString()}</ExtLink>
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('onchain.time')}</dt>
                  <dd className="text-ink-2">{new Date(commitment.timestamp * 1000).toLocaleString(i18n.language)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('onchain.submitter')}</dt>
                  <dd>
                    <ExtLink href={explorerAddress(commitment.submitter)}>
                      <span className="hash">{`${commitment.submitter.slice(0, 6)}…${commitment.submitter.slice(-4)}`}</span>
                    </ExtLink>
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">{t('onchain.contentCheck')}</dt>
                  <dd className={matches ? 'text-accent' : 'text-danger'}>{matches ? t('onchain.matches') : t('onchain.mismatch')}</dd>
                </div>
              </>
            )}
          </dl>

          {allowCommit && !commitment && !read.isLoading && !read.isError && (
            <div className="mt-4 border-t border-line pt-3">
              <Button variant="accent" onClick={submit} disabled={Boolean(blocker) || write.isPending || (write.data && receipt.isLoading)} data-testid="commit-button">
                {write.isPending || (write.data && receipt.isLoading) ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
                {write.isPending ? t('onchain.confirmInWallet') : write.data && receipt.isLoading ? t('onchain.waiting') : t('onchain.commit')}
              </Button>
              {blocker && (
                <p className="mt-2 text-[0.72rem] text-muted">
                  {t(`onchain.blockers.${blocker}`, { chain: TARGET_CHAIN.name })}{' '}
                  <button type="button" onClick={blocker === 'connect' ? openConnectModal : openChainModal} className="text-accent hover:text-ink">
                    {blocker === 'connect' ? t('nav.connectWallet') : t('wallet.wrongNetwork')}
                  </button>
                </p>
              )}
            </div>
          )}

          {write.data && (
            <p className="mt-3 text-[0.74rem] text-ink-2" aria-live="polite">
              {t('onchain.tx')}: <ExtLink href={explorerTx(write.data)}>
                <span className="hash">{`${write.data.slice(0, 10)}…${write.data.slice(-6)}`}</span>
              </ExtLink>
              {receipt.isSuccess && <span className="ml-2 text-accent">{t('onchain.confirmed')}</span>}
            </p>
          )}
          {errKey && (
            <p role="alert" className="mt-2 flex items-start gap-1.5 text-[0.74rem] text-danger">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {t(`onchain.errors.${errKey}`)}
                {errKey === 'insufficientFunds' && !IS_LOCAL && (
                  <>
                    {' '}
                    <a href={FAUCET_URL} target="_blank" rel="noopener noreferrer" className="text-accent underline">
                      {t('wallet.faucet')}
                    </a>
                  </>
                )}
              </span>
            </p>
          )}
        </>
      )}
      <p className="mt-3 text-[0.68rem] leading-relaxed text-faint">{t('onchain.note')}</p>
    </div>
  )
}
