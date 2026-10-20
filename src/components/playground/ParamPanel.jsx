import { useTranslation } from 'react-i18next'
import { RotateCcw, Crosshair } from 'lucide-react'
import { useSimulation } from '../../app/SimulationContext.jsx'
import { TextField, Segmented, Toggle, SelectField, useErrorText } from '../ui/Fields.jsx'
import { Button } from '../ui/Button.jsx'
import { maxFrontrunWithinSlippage } from '../../simulation/mev/scenario.js'
import { unitsToInput } from '../../utils/params.js'
import { tokenSymbols } from '../../utils/format.js'

function Group({ title, children }) {
  return (
    <fieldset className="border-t border-line pt-4">
      <legend className="sr-only">{title}</legend>
      <div className="eyebrow mb-3" aria-hidden="true">
        {title}
      </div>
      <div className="space-y-3.5">{children}</div>
    </fieldset>
  )
}

export default function ParamPanel() {
  const { t } = useTranslation()
  const { params, setParam, reset, error } = useSimulation()
  const errText = useErrorText()
  const errFor = (field) => (error && error.field === field ? errText(error) : null)
  const sym = tokenSymbols(params.direction)
  const field = (key, extra = {}) => ({
    label: t(`playground.params.${key}`),
    value: params[key],
    onChange: (v) => setParam(key, v),
    error: errFor(key),
    name: key,
    ...extra,
  })

  const sizeToMax = () => {
    try {
      const max = maxFrontrunWithinSlippage({ ...params, attackerAmount: params.attackerAmount || '1' })
      setParam('attackerAmount', unitsToInput(max, 4))
    } catch {
      /* invalid inputs are already surfaced on the fields */
    }
  }

  return (
    <form className="panel space-y-5 p-5" onSubmit={(e) => e.preventDefault()} aria-label={t('playground.params.title')}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[0.98rem] font-medium">{t('playground.params.title')}</h2>
        <Button variant="ghost" className="!px-2 !py-1 text-[0.76rem]" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          {t('playground.params.reset')}
        </Button>
      </div>
      <p className="-mt-2 text-[0.72rem] leading-snug text-faint">{t('playground.params.exampleNote')}</p>

      <Group title={t('playground.params.groupTrade')}>
        <Segmented
          label={t('playground.params.direction')}
          value={params.direction}
          onChange={(v) => setParam('direction', v)}
          options={[
            { value: 'buy', label: t('playground.params.buy') },
            { value: 'sell', label: t('playground.params.sell') },
          ]}
        />
        <TextField {...field('tradeAmount')} suffix={sym.input} />
        <TextField {...field('slippagePercent')} suffix="%" hint={t('playground.params.slippageHint')} />
      </Group>

      <Group title={t('playground.params.groupPool')}>
        <TextField {...field('poolBase')} suffix="BNB" />
        <TextField {...field('poolQuote')} suffix="USDT" />
        <TextField {...field('feePercent')} suffix="%" hint={t('playground.params.feeHint')} />
      </Group>

      <Group title={t('playground.params.groupAdversary')}>
        <Toggle label={t('playground.params.attackerEnabled')} checked={params.attackerEnabled} onChange={(v) => setParam('attackerEnabled', v)} description={t('playground.params.attackerDesc')} />
        <div className={params.attackerEnabled ? '' : 'pointer-events-none opacity-45'} aria-disabled={!params.attackerEnabled}>
          <TextField {...field('attackerAmount')} suffix={sym.input} />
          <button type="button" onClick={sizeToMax} className="mt-1.5 inline-flex items-center gap-1 text-[0.72rem] text-accent hover:text-ink" disabled={!params.attackerEnabled}>
            <Crosshair className="h-3 w-3" aria-hidden="true" />
            {t('playground.params.sizeToMax')}
          </button>
          <div className="mt-3">
            <SelectField
              label={t('playground.params.blindGuess')}
              value={params.blindGuess}
              onChange={(v) => setParam('blindGuess', v)}
              options={['seed', 'same', 'opposite'].map((v) => ({ value: v, label: t(`playground.params.guess.${v}`) }))}
            />
          </div>
        </div>
      </Group>

      <Group title={t('playground.params.groupExecution')}>
        <Segmented
          label={t('playground.params.mode')}
          value={params.mode}
          onChange={(v) => setParam('mode', v)}
          options={['public', 'protected', 'optin'].map((v) => ({ value: v, label: t(`paths.${v}`) }))}
        />
        <TextField {...field('seed')} inputMode="text" hint={t('playground.params.seedHint')} />
        <TextField {...field('userFeeGwei')} suffix="gwei" />
      </Group>

      <details className="group border-t border-line pt-4">
        <summary className="eyebrow cursor-pointer list-none select-none hover:text-ink-2">
          <span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span> {t('playground.params.groupAdvanced')}
        </summary>
        <div className="mt-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <TextField {...field('gasUnits')} inputMode="numeric" />
            <TextField {...field('backgroundTxCount')} inputMode="numeric" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField {...field('searcherCount')} inputMode="numeric" />
            <TextField {...field('refundPercent')} suffix="%" />
          </div>
          <p className="text-[0.7rem] leading-snug text-faint">{t('playground.params.advancedNote')}</p>
        </div>
      </details>
    </form>
  )
}
