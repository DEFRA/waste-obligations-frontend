export function initPrnsSortFilter() {
  const form = document.querySelector('[data-prns-sort-filter]')

  if (!form) {
    return
  }

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
      form.submit()
    })
  })
}
