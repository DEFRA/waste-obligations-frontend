export function formatNameOnAccount(user) {
  return `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()
}

export function nameOnAccountFromAudit(audit) {
  const submittedEntry = (audit ?? []).find(
    (entry) => entry?.action === 'Submitted'
  )

  return submittedEntry?.user?.name?.trim() ?? ''
}
