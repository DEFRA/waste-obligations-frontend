import { statusCodes } from '../constants/status-codes.js'

export function renderValidationFailAction(request, h, error) {
  const message =
    error?.details
      ?.map((detail) => detail?.message)
      .filter((value) => typeof value === 'string' && value.length > 0)
      .join(', ') ||
    error?.message ||
    'Bad Request'

  return h
    .view('error/index', {
      pageTitle: 'Bad Request',
      heading: statusCodes.badRequest,
      message
    })
    .code(statusCodes.badRequest)
    .takeover()
}
