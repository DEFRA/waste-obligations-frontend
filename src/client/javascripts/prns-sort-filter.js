const FOCUS_STORAGE_KEY = 'prnsSortFilterFocusId'

// Changing a select auto-submits the form as a full-page GET, which drops
// focus to the top of the reloaded document. Remember which control the user
// was on before the reload and refocus it once the new page has loaded, so a
// keyboard or screen reader user doesn't lose their place.
function rememberFocus(select) {
  try {
    sessionStorage.setItem(FOCUS_STORAGE_KEY, select.id)
  } catch {
    // Storage may be unavailable (e.g. private browsing) - focus just won't
    // be restored on the next page.
  }
}

function restoreFocus(form) {
  let id
  try {
    id = sessionStorage.getItem(FOCUS_STORAGE_KEY)
    sessionStorage.removeItem(FOCUS_STORAGE_KEY)
  } catch {
    return
  }

  if (!id) {
    return
  }

  const target = Array.from(form.querySelectorAll('select')).find(
    (select) => select.id === id
  )
  target?.focus()
}

export function initPrnsSortFilter() {
  const form = document.querySelector('[data-prns-sort-filter]')

  if (!form) {
    return
  }

  restoreFocus(form)

  // Keep empty selections (e.g. "All materials") out of the query string.
  form.addEventListener('formdata', ({ formData }) => {
    form.querySelectorAll('select').forEach(({ name, value }) => {
      if (name && !value) {
        formData.delete(name)
      }
    })
  })

  form.querySelectorAll('select').forEach((select) => {
    select.addEventListener('change', () => {
      rememberFocus(select)
      form.submit()
    })
  })
}
