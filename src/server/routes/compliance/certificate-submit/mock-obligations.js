export function toTagStatus(raw) {
  const status = (raw ?? '').toString().trim().toLowerCase()
  if (status === 'met') return { text: 'Met', variant: 'green' }
  if (status === 'not met' || status === 'not_met' || status === 'not-met') {
    return { text: 'Not met', variant: 'red' }
  }
  return { text: raw ? raw.toString() : 'No data yet', variant: 'grey' }
}

function deriveOverallStatus(rows) {
  const anyNotMet = (rows ?? []).some(
    (r) =>
      (r?.status ?? '').toString().toLowerCase().replace(/\s/g, '_') ===
      'not_met'
  )
  return anyNotMet ? 'not_met' : 'met'
}

export function getMockObligations({ overall = 'met' } = {}) {
  const baseRows = [
    {
      material: 'Aluminium',
      obligationToMeet: 292,
      awaitingAcceptance: 0,
      accepted: 292,
      outstanding: 0,
      status: 'met'
    },
    {
      material: 'Glass',
      obligationToMeet: 0,
      awaitingAcceptance: 0,
      accepted: 0,
      outstanding: 0,
      status: 'met'
    },
    {
      material: 'Paper, board or fibre-based composite material',
      obligationToMeet: 9860,
      awaitingAcceptance: overall === 'not_met' ? 2000 : 0,
      accepted: overall === 'not_met' ? 5860 : 9860,
      outstanding: overall === 'not_met' ? 4000 : 0,
      status: overall === 'not_met' ? 'not_met' : 'met'
    },
    {
      material: 'Plastic',
      obligationToMeet: 211,
      awaitingAcceptance: 0,
      accepted: 211,
      outstanding: 0,
      status: 'met'
    },
    {
      material: 'Steel',
      obligationToMeet: 687,
      awaitingAcceptance: 0,
      accepted: 687,
      outstanding: 0,
      status: 'met'
    },
    {
      material: 'Wood',
      obligationToMeet: overall === 'not_met' ? 7946 : 0,
      awaitingAcceptance: 0,
      accepted: 0,
      outstanding: overall === 'not_met' ? 7946 : 0,
      status: overall === 'not_met' ? 'not_met' : 'met'
    }
  ]

  const totals = baseRows.reduce(
    (acc, r) => {
      acc.obligationToMeet += r.obligationToMeet
      acc.awaitingAcceptance += r.awaitingAcceptance
      acc.accepted += r.accepted
      acc.outstanding += r.outstanding
      return acc
    },
    { obligationToMeet: 0, awaitingAcceptance: 0, accepted: 0, outstanding: 0 }
  )

  const obligationsRows = [
    ...baseRows.map((r) => ({ ...r, tag: toTagStatus(r.status) })),
    {
      material: 'Totals',
      ...totals,
      status: deriveOverallStatus(baseRows),
      tag: toTagStatus(deriveOverallStatus(baseRows))
    }
  ]

  const glassRows = [
    {
      material: 'Glass remelt',
      obligationToMeet: 0,
      awaitingAcceptance: 0,
      accepted: 0,
      outstanding: 0,
      status: 'met',
      tag: toTagStatus('met')
    },
    {
      material: 'Remaining glass',
      obligationToMeet: 0,
      awaitingAcceptance: 0,
      accepted: 0,
      outstanding: 0,
      status: 'met',
      tag: toTagStatus('met')
    },
    {
      material: 'Totals',
      obligationToMeet: 0,
      awaitingAcceptance: 0,
      accepted: 0,
      outstanding: 0,
      status: 'met',
      tag: toTagStatus('met')
    }
  ]

  return {
    overallStatus: deriveOverallStatus(baseRows),
    obligationsRows,
    glassRows
  }
}
