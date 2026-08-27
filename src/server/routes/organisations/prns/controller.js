import { formatDate } from '#/config/nunjucks/filters/format-date.js'
import { getLocale } from '#/server/common/helpers/i18n/get-locale.js'
import { translate } from '#/server/common/helpers/i18n/translate.js'
import * as complianceMiddlewares from '#/server/routes/compliance/_middlewares/index.js'
import * as organisationsMiddlewares from '#/server/routes/organisations/_middlewares/index.js'
import {
  organisationPrnsRouteOptions,
  selectOrganisationPrns
} from '../_shared/organisations-route-options.js'

const PRN_STATUS_LOCALE_KEY = {
  AwaitingAcceptance: 'awaitingAcceptance',
  Accepted: 'accepted',
  Rejected: 'rejected',
  Cancelled: 'cancelled'
}

function buildPrnRow(locale, organisationId, prn) {
  const statusKey = PRN_STATUS_LOCALE_KEY[prn.status]
  const viewHref = `/organisations/${organisationId}/prns/${prn.id}?year=${prn.obligationYear}`

  return [
    { text: prn.number },
    { text: prn.type },
    {
      text: statusKey
        ? translate(locale, `prns.prn.statusTypes.${statusKey}`)
        : prn.status
    },
    { text: prn.material },
    { text: prn.tonnage },
    { text: prn.issuedAt ? formatDate(prn.issuedAt, 'dd MMM yyyy') : '' },
    { text: prn.issuer?.organisationName ?? '' },
    {
      html: `<a class="govuk-link" href="${viewHref}">${translate(locale, 'prns.list.table.view')}</a>`
    }
  ]
}

function buildPrnsTable(locale, organisationId, prns) {
  return {
    classes: 'app-prns-table',
    head: [
      { text: translate(locale, 'prns.list.table.number') },
      { text: translate(locale, 'prns.list.table.type') },
      { text: translate(locale, 'prns.list.table.status') },
      { text: translate(locale, 'prns.list.table.material') },
      { text: translate(locale, 'prns.list.table.tonnage') },
      { text: translate(locale, 'prns.list.table.issuedAt') },
      { text: translate(locale, 'prns.list.table.issuer') },
      { text: translate(locale, 'prns.list.table.view') }
    ],
    rows: prns.map((prn) => buildPrnRow(locale, organisationId, prn))
  }
}

export const prnsListController = {
  method: 'GET',
  path: '/organisations/{organisationId}/prns',
  options: {
    ...organisationPrnsRouteOptions,
    pre: selectOrganisationPrns(
      complianceMiddlewares.organisation,
      organisationsMiddlewares.prns
    )
  },
  async handler(request, h) {
    const { organisationId } = request.params
    const locale = getLocale(request)
    const { prns, total, page, pageSize } = request.pre.prns

    return h.view('organisations/prns/index', {
      organisationId,
      organisationName: request.pre?.organisation?.name,
      prns,
      total,
      page,
      pageSize,
      prnsTable: buildPrnsTable(locale, organisationId, prns)
    })
  }
}

export const prnsListRoutes = [prnsListController]
