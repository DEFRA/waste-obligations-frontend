import { statusCodes } from '../constants/status-codes.js'
const BAD_REQUEST_MESSAGE = 'Bad Request'

export function renderValidationFailAction(_request, h, _error) {
  return h
    .view('error/index', {
      pageTitle: BAD_REQUEST_MESSAGE,
      heading: statusCodes.badRequest,
      message: BAD_REQUEST_MESSAGE
    })
    .code(statusCodes.badRequest)
    .takeover()
}
