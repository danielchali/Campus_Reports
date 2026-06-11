function pad(value: number) {
  return String(value).padStart(2, '0');
}

/** Local calendar date for <input type="date"> (YYYY-MM-DD). */
export function getTodayDateInputValue(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local time for <input type="time"> (HH:mm). */
export function getCurrentTimeInputValue(date = new Date()) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Local value for <input type="datetime-local"> (YYYY-MM-DDTHH:mm). */
export function getCurrentDateTimeLocalValue(date = new Date()) {
  return `${getTodayDateInputValue(date)}T${getCurrentTimeInputValue(date)}`;
}

/** Defaults for student case workflow timestamps that are usually "now". */
export function getStudentCaseProcessDateDefaults(date = new Date()) {
  const today = getTodayDateInputValue(date);
  const now = getCurrentTimeInputValue(date);

  return {
    reportedAt: getCurrentDateTimeLocalValue(date),
    reportDate: today,
    reportTime: now,
    takenDate: today,
    takenTime: now,
    recallTime: now,
    signedDate: today,
    signedTime: now,
    offenceDate: today,
    offenceTime: now,
  };
}
