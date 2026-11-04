import { translate } from '#/server/common/helpers/i18n/translate.js'
import { withForwardedPrefix } from '#/server/common/helpers/proxy/forwarded-prefix.js'
import { pickLatestSubmittedDeclarationForYear } from '#/server/routes/_shared/compliance/compliance-declaration.js'
import { statementViewUrl } from '#/server/routes/cso/compliance/statement-view/controller.js'
import { certificateViewUrl } from '#/server/routes/producer/compliance/certificate-view/controller.js'
import { PAGE_LOCALE_BASE } from './constants.js'

/**
 * The link to a declaration already submitted for the year, in place of the submit link.
 * Returns null when nothing has been submitted for that year.
 */
export function buildSubmittedDeclaration({
  request,
  locale,
  isProducer,
  pathId,
  declarations,
  obligationYear
}) {
  const declaration = pickLatestSubmittedDeclarationForYear(
    declarations,
    obligationYear
  )

  if (!declaration) {
    return null
  }

  if (isProducer) {
    return {
      href: withForwardedPrefix(
        request,
        certificateViewUrl(pathId, locale, declaration.id)
      ),
      buttonLabel: translate(
        locale,
        'compliance.components.success.viewCertificateButton'
      ),
      heading: translate(
        locale,
        `${PAGE_LOCALE_BASE}.certificate.submitted.heading`,
        {
          year: obligationYear
        }
      ),
      paragraphPrefix: translate(
        locale,
        `${PAGE_LOCALE_BASE}.certificate.submitted.paragraph`,
        {
          year: obligationYear
        }
      )
    }
  }

  return {
    href: withForwardedPrefix(
      request,
      statementViewUrl(pathId, locale, declaration.id)
    ),
    buttonLabel: translate(
      locale,
      'compliance.components.success.viewStatementButton'
    ),
    heading: translate(
      locale,
      `${PAGE_LOCALE_BASE}.statement.submitted.heading`,
      {
        year: obligationYear
      }
    ),
    paragraphPrefix: translate(
      locale,
      `${PAGE_LOCALE_BASE}.statement.submitted.paragraph`,
      {
        year: obligationYear
      }
    )
  }
}
