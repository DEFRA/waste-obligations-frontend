import { buildPageViewModel } from '#/server/common/helpers/i18n/translate.js'

export const aboutController = {
  handler(request, h) {
    return h.view('about/index', buildPageViewModel(request, 'about'))
  }
}
