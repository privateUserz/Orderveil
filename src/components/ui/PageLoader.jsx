import { useTranslation } from 'react-i18next'
import { Spinner } from './States.jsx'

export default function PageLoader() {
  const { t } = useTranslation()
  return (
    <div className="container-ov flex min-h-[50vh] items-center justify-center">
      <Spinner label={t('common.loading')} />
    </div>
  )
}
