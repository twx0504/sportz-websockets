import { MATCH_STATUS } from "../validation/matches.js";

// Determine the current status of a match based on start and end times
export function getMatchStatus(startTime, endTime, now = new Date()) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  // If either date is invalid, return null
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  // Match has not started yet
  if (now < start) {
    return MATCH_STATUS.SCHEDULED;
  }

  // Match has already ended
  if (now >= end) {
    return MATCH_STATUS.FINISHED;
  }

  // Match is currently ongoing
  return MATCH_STATUS.LIVE;
}

// Synchronize the match's status and update it if necessary
export async function syncMatchStatus(match, updateStatus) {
  // Determine what the status *should* be based on current time
  const nextStatus = getMatchStatus(match.startTime, match.endTime);

  // If status cannot be determined, keep the current status
  if (!nextStatus) {
    return match.status;
  }

  // If the current status is different from the calculated status, update it
  if (match.status !== nextStatus) {
    await updateStatus(nextStatus); // Call the provided function to persist the new status
    match.status = nextStatus; // Update the in-memory match object
  }

  return match.status; // Return the (possibly updated) status
}
