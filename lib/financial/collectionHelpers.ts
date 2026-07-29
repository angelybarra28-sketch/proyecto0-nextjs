function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function getOverdueDays(dueDate: string, referenceDate = startOfToday()): number {
  const due = new Date(dueDate);
  const dueOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffMs = referenceDate.getTime() - dueOnly.getTime();
  return Math.max(0, Math.floor(diffMs / 86400000));
}
