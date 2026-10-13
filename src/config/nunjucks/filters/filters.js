import assign from 'lodash/assign.js'

import { formatDate } from './format-date.js'
import { formatCurrency } from './format-currency.js'

export function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
}

export { assign, formatDate, formatCurrency }
