import { PRN_STATUS } from '#/server/services/schemas/waste-obligations.schemas.js'

/**
 * Whether the "accept"/"reject" actions should be offered for a PRN. Drives both
 * the button gate in `views/prn.njk` (passed in as `isStatusEditable`) and the
 * guard on the confirm-accept routes, so the rule lives in exactly one place.
 *
 * Only `AwaitingAcceptance` is editable. Missing/unknown statuses are not —
 * the schema allows status to be omitted, and treating that as editable would
 * surface accept/reject for incomplete API payloads.
 *
 * @param {{ status?: string } | undefined} prn
 * @returns {boolean}
 */
export function isPrnStatusEditable(prn) {
  return prn?.status === PRN_STATUS.AWAITING_ACCEPTANCE
}
