/** Staff events that can also arrive by email, with the default for people who never changed the setting. */
export const emailEvents = {
  decision_approved: { label: "Клиентът одобри оферта или промяна", group: "decisions", emailByDefault: true },
  decision_changes_requested: { label: "Клиентът поиска промяна", group: "decisions", emailByDefault: true },
  decision_declined: { label: "Клиентът отказа оферта или промяна", group: "decisions", emailByDefault: true },
  decision_disputed: { label: "Клиентът оспори решение", group: "decisions", emailByDefault: true },
  agreement_recorded: { label: "Колега отбеляза оферта или промяна като договорена", group: "decisions", emailByDefault: false },
  client_message: { label: "Въпрос от клиента", group: "activity", emailByDefault: true },
  revision_viewed: { label: "Клиентът отвори оферта или промяна", group: "activity", emailByDefault: false },
  revision_expired: { label: "Изтекла оферта или промяна", group: "deadlines", emailByDefault: true },
  payment_disputed: { label: "Клиентът оспори плащане", group: "deadlines", emailByDefault: true },
  payment_claimed: { label: "Клиентът отбеляза плащане", group: "deadlines", emailByDefault: true },
  acceptance_accepted: { label: "Клиентът прие работата", group: "decisions", emailByDefault: true },
  acceptance_issues: { label: "Клиентът има забележки по работата", group: "decisions", emailByDefault: true },
  choice_answered: { label: "Клиентът направи избор", group: "decisions", emailByDefault: true },
  contact_verified: { label: "Клиентът потвърди имейла си", group: "activity", emailByDefault: true },
} as const;

export type EmailEventType = keyof typeof emailEvents;

/** How the settings page groups the events, in display order. */
export const emailEventGroups = {
  decisions: { title: "Решения на клиента", description: "Когато клиентът отговори на оферта или промяна." },
  activity: { title: "Клиентът в портала", description: "Въпроси и отваряне на оферти." },
  deadlines: { title: "Срокове и плащания", description: "Неща, които чакат действие от фирмата." },
} as const;
