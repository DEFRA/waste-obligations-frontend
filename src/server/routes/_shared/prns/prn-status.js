import { PRN_STATUS } from '#/server/services/schemas/waste-obligations.schemas.js'

// A PRN/PERN can be accepted or rejected only while it is awaiting acceptance.
// Any other known status is terminal; an unknown/missing status is treated as
// still editable (the API is the authority on whether the PATCH is allowed).
const NON_EDITABLE_PRN_STATUSES = new Set([
  PRN_STATUS.ACCEPTED,
  PRN_STATUS.REJECTED,
  PRN_STATUS.CANCELLED
])

/**
 * Whether the "accept"/"reject" actions should be offered for a PRN. Drives both
 * the button gate in `views/prn.njk` (passed in as `isStatusEditable`) and the
 * guard on the confirm-accept routes, so the rule lives in exactly one place.
 *
 * @param {{ status?: string } | undefined} prn
 * @returns {boolean}
 */
export function isPrnStatusEditable(prn) {
  return !NON_EDITABLE_PRN_STATUSES.has(prn?.status)
}
