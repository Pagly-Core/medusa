import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import {
  createLanguageDetector,
  defaultI18nOptions,
  SUPPORTED_LANGUAGES,
} from "../../../i18n/config"
import { useExtension } from "../../../providers/extension-provider"

export const I18n = () => {
  const { getI18nResources } = useExtension()

  if (i18n.isInitialized) {
    return null
  }

  const resources = getI18nResources()
  i18n
    .use(createLanguageDetector())
    .use(initReactI18next)
    .init({
      ...defaultI18nOptions,
      resources,
      supportedLngs: SUPPORTED_LANGUAGES,
    })

  return null
}

export { i18n }
