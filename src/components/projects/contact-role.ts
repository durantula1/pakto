/** A client contact's role on a project: one decides on offers and changes, the rest only follow. */
export function contactRoleLabel(isPrimary: boolean) {
  return isPrimary ? "Решава по офертите" : "Само преглежда";
}

export function contactRoleHint(isPrimary: boolean) {
  return isPrimary ? "Одобрява, иска промяна или отказва оферти и промени." : "Вижда офертите и промените, без да решава по тях.";
}
