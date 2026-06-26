import { buildPageViewModel } from '#/server/common/helpers/i18n/translate.js'

export const homeController = {
  handler(request, h) {
    return h.view('home/index', buildPageViewModel(request, 'home'))
  }
}
