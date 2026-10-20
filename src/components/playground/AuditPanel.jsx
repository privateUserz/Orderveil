import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { Download, Upload, RefreshCcw, CheckCircle2, XCircle, FileJson } from 'lucide-react'
import { useSimulation } from '../../app/SimulationContext.jsx'
import { buildExperimentRecord, serializeRecord } from '../../simulation/replay/record.js'
import { parseRecord, replayExperiment } from '../../simulation/replay/replay.js'
import { recordParamsToUi } from '../../utils/params.js'
import { Button } from '../ui/Button.jsx'
import Hash from '../ui/Hash.jsx'
import { ErrorState } from '../ui/States.jsx'
import OnchainCommitment from './OnchainCommitment.jsx'

function ReplayResult({ result, onLoad }) {
  const { t } = useTranslation()
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`rounded-xl border p-4 ${result.passed ? 'border-accent/30 bg-accent/[0.04]' : 'border-danger/30 bg-danger/[0.04]'}`} data-testid="replay-result">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`flex items-center gap-2 text-[0.95rem] font-semibold ${result.passed ? 'text-accent' : 'text-danger'}`} role="status">
          {result.passed ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <XCircle className="h-5 w-5" aria-hidden="true" />}
          {result.passed ? t('playground.audit.passed') : t('playground.audit.failed')}
        </div>
        {result.record && onLoad && (
          <Button variant="small" onClick={() => onLoad(result.record)}>
            {t('playground.audit.loadParams')}
          </Button>
        )}
      </div>
      {result.source && <p className="mt-1 text-[0.72rem] text-muted">{result.source}</p>}
      {result.imported && result.passed && result.record && result.recomputed?.digest && (
        <div className="mt-3">
          <OnchainCommitment record={result.record} digest={result.recomputed.digest} />
        </div>
      )}
      <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {result.checks.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 text-[0.76rem]">
            <span className="text-ink-2">{t(`playground.audit.checks.${c.id}`, { defaultValue: c.id })}</span>
            <span className={`flex items-center gap-1 ${c.passed ? 'text-accent' : 'text-danger'}`}>
              {c.passed ? t('playground.audit.ok') : t('playground.audit.mismatch')}
              {!c.passed && c.detail && <span className="text-[0.66rem] text-faint">({c.detail})</span>}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  )
}

export default function AuditPanel({ exp }) {
  const { t } = useTranslation()
  const { replaceParams } = useSimulation()
  const fileRef = useRef(null)
  const [replay, setReplay] = useState(null)
  const [importError, setImportError] = useState(null)
  const [pasted, setPasted] = useState('')

  // The record's deterministic part is recomputed whenever the experiment changes;
  // a fresh ephemeral signing key is generated per build.
  const record = useMemo(() => buildExperimentRecord(exp.result), [exp])

  const download = () => {
    const blob = new Blob([serializeRecord(record)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orderveil-${record.experimentId}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const verifyText = (text, source, imported = true) => {
    setImportError(null)
    const parsed = parseRecord(text)
    if (!parsed.ok) {
      setReplay(null)
      setImportError(t('playground.audit.invalidJson'))
      return
    }
    try {
      const r = replayExperiment(parsed.record)
      setReplay({ ...r, record: r.checks[0]?.passed ? parsed.record : null, source, imported })
    } catch (e) {
      setReplay(null)
      setImportError(t('playground.audit.replayError', { msg: e.message }))
    }
  }

  const onFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > 5_000_000) {
      setImportError(t('playground.audit.tooLarge'))
      return
    }
    verifyText(await f.text(), t('playground.audit.fromFile', { name: f.name }))
  }

  const loadParams = (rec) => replaceParams(recordParamsToUi(rec.config.params))

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel-inset p-4">
          <div className="flex items-center gap-2 text-[0.85rem] font-medium">
            <FileJson className="h-4 w-4 text-muted" aria-hidden="true" />
            {t('playground.audit.recordTitle')}
          </div>
          <dl className="mt-3 space-y-1.5 text-[0.76rem]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">experimentId</dt>
              <dd className="hash">{record.experimentId}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">rulesetVersion</dt>
              <dd className="hash truncate">{record.ruleset.version}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{t('playground.audit.inputs')}</dt>
              <dd className="text-ink-2">{t('playground.audit.inputsValue', { txs: record.inputs.transactions.length, bundles: record.inputs.bundles.length })}</dd>
            </div>
            {record.outputs.ordering.kind === 'gateway' && (
              <div className="flex justify-between gap-3">
                <dt className="text-muted">finalSubBlockHash</dt>
                <dd>
                  <Hash value={record.outputs.ordering.finalSubBlockHash} />
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <dt className="text-muted">executionHash</dt>
              <dd>
                <Hash value={record.outputs.execution.executionHash} />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">recordDigest</dt>
              <dd>
                <Hash value={record.simulationSignature.digest} />
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">simulationSignature</dt>
              <dd className="text-right text-[0.72rem] text-warn">{t('playground.audit.sigScope')}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="accent" onClick={download}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {t('playground.audit.export')}
            </Button>
            <Button variant="small" onClick={() => verifyText(serializeRecord(record), t('playground.audit.fromCurrent'), false)}>
              <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
              {t('playground.audit.replayCurrent')}
            </Button>
          </div>
        </div>

        <div className="panel-inset p-4">
          <div className="flex items-center gap-2 text-[0.85rem] font-medium">
            <Upload className="h-4 w-4 text-muted" aria-hidden="true" />
            {t('playground.audit.importTitle')}
          </div>
          <p className="mt-2 text-[0.74rem] leading-relaxed text-muted">{t('playground.audit.importText')}</p>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={onFile} data-testid="replay-file" aria-label={t('playground.audit.chooseFile')} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="small" onClick={() => fileRef.current?.click()}>
              {t('playground.audit.chooseFile')}
            </Button>
          </div>
          <label className="mt-3 block text-[0.72rem] text-faint" htmlFor="replay-paste">
            {t('playground.audit.paste')}
          </label>
          <textarea id="replay-paste" className="field-input mt-1 h-20 resize-y font-mono text-[0.7rem]" value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder='{"schema":"orderveil.experiment/v1", …}' />
          <Button variant="small" className="mt-2" disabled={!pasted.trim()} onClick={() => verifyText(pasted, t('playground.audit.fromPaste'))}>
            {t('playground.audit.verifyPasted')}
          </Button>
        </div>
      </div>

      <OnchainCommitment record={record} digest={record.simulationSignature.digest} allowCommit />

      {importError && <ErrorState title={t('playground.audit.importFailed')} message={importError} />}
      <AnimatePresence mode="wait">{replay && <ReplayResult key={replay.source + String(replay.passed)} result={replay} onLoad={loadParams} />}</AnimatePresence>
      <p className="text-[0.72rem] leading-relaxed text-faint">{t('playground.audit.note')}</p>
    </div>
  )
}
