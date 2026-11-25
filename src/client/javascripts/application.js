import { initAll } from 'govuk-frontend'

import { initCompliancePrint } from './compliance-print.js'
import { initPrnPrint } from './prn-print'
import { initCookieBanner } from './cookies.js'
import { initPrnsSortFilter } from './prns-sort-filter.js'
import { initPrnsSelection } from './prns-selection.js'

initAll()
initCompliancePrint()
initPrnPrint()
initPrnsSortFilter()
initPrnsSelection()
initCookieBanner()
