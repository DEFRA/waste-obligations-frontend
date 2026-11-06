import { now } from '#/server/common/helpers/clock.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { isApprovedOrDelegatedUser } from '#/server/common/routes/shared/user-permissions.js'
import { getRegulatorDetails } from '#/server/routes/_shared/compliance/regulator.js'
import {
  DEFAULT_GLASS_REMELT_TARGET_PERCENT,
  PAGE_LOCALE_BASE,
  buildAcceptRejectPath,
  buildDeadlineStatus,
  buildMaterialHref,
  buildObligationTables,
  buildOrganisationFields,
  buildPageLinks,
  buildSubmitCertificatePath,
  buildSubmittedDeclaration
} from '#/server/routes/_shared/obligations/_middlewares/index.js'

/**
 * True once any material has data. A year with no obligations, or only
 * materials marked NoDataYet, has nothing to certify yet.
 */
function hasObligationData(obligations) {
  return (obligations ?? []).some((o) => o.status !== 'NoDataYet')
}

function resolveGlassTarget(obligations) {
  const glass = (obligations ?? []).find((o) => o.material === 'GlassRemelt')

  if (glass?.recyclingTarget != null) {
    return Math.round(glass.recyclingTarget * 100)
  }

  return DEFAULT_GLASS_REMELT_TARGET_PERCENT
}

/**
 * The submitted declaration (if any) and the single deadline tile that applies.
 */
function buildDeclarationState(
  request,
  { locale, isProducer, organisation, pathId, obligationYear, deadlineYear }
) {
  const declarations = request.pre.declarations
  const submittedDeclaration = buildSubmittedDeclaration({
    request,
    locale,
    isProducer,
    pathId,
    declarations,
    obligationYear
  })
  const deadlineStatus = buildDeadlineStatus({
    locale,
    isProducer,
    organisation,
    obligationYear,
    deadlineYear,
    declarations,
    submittedDeclaration,
    date: now()
  })

  return { submittedDeclaration, deadlineStatus }
}

export function buildManageObligationsViewModel({
  request,
  userType,
  obligationYear
}) {
  const locale = getLocale(request)
  const user = request.yar.get('user')
  const organisation = request.pre.organisation
  const obligations = request.pre.obligations
  const { nameWithArticle, name } = getRegulatorDetails(
    organisation?.businessCountry,
    locale,
    true
  )

  const isProducer = userType === 'producer'
  const pathId = isProducer
    ? request.params.organisationId
    : request.params.schemeId
  const deadlineYear = obligationYear + 1
  const routeContext = { isProducer, pathId, obligationYear }

  const { submittedDeclaration, deadlineStatus } = buildDeclarationState(
    request,
    { locale, isProducer, organisation, pathId, obligationYear, deadlineYear }
  )
  const { obligationsTableRows, glassTableRows } = buildObligationTables(
    obligations,
    locale,
    buildMaterialHref(request, routeContext)
  )

  return {
    locale,
    localeBase: PAGE_LOCALE_BASE,
    obligationYear,
    dataYear: obligationYear - 1,
    deadlineYear,
    ...buildOrganisationFields(organisation, isProducer),
    regulatorName: name,
    regulatorNameWithArticle: nameWithArticle,
    awaitingAcceptanceCount: request.pre.awaitingAcceptancePrns?.total ?? 0,
    hasObligationData: hasObligationData(obligations),
    showButton: Boolean(isApprovedOrDelegatedUser(user)),
    glassTarget: resolveGlassTarget(obligations),
    obligationsTableRows,
    glassTableRows,
    acceptRejectPath: buildAcceptRejectPath(request, routeContext),
    submitCertificatePath: buildSubmitCertificatePath(request, routeContext),
    ...buildPageLinks(request, pathId, isProducer, obligationYear),
    submittedDeclaration,
    ...deadlineStatus,
    isProducer
  }
}
