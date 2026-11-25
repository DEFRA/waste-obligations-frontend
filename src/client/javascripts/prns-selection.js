// Saves the ticks on the PRNs list page in the session as the user makes them,
// so they are still ticked when the user comes back to the list (eg with the
// back link from a PRN they opened). Each save sends the form as it is - the
// CSRF token and every ticked box - so a later save always holds the latest
// state. One save is sent at a time: a change made while one is in flight is
// sent once it finishes, so saves can't arrive out of order. Without
// JavaScript the ticks are saved when the form is submitted.
export function initPrnsSelection() {
  const form = document.querySelector('[data-prns-selection]')
  const url = form?.dataset.selectionUrl

  if (!url) {
    return
  }

  let sending = false
  let changedWhileSending = false

  function send() {
    if (sending) {
      changedWhileSending = true
      return
    }

    sending = true
    changedWhileSending = false

    fetch(url, {
      method: 'POST',
      body: new URLSearchParams(new FormData(form)),
      credentials: 'same-origin',
      // Lets the save finish if the user follows a link straight after ticking.
      keepalive: true
    })
      .catch(() => {
        // Nothing on the page changes: the ticks are still saved when the form
        // is submitted.
      })
      .finally(() => {
        sending = false

        if (changedWhileSending) {
          send()
        }
      })
  }

  form.addEventListener('change', (event) => {
    if (event.target?.name === 'selectedPrnIds') {
      send()
    }
  })
}
