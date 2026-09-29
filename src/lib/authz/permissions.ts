export const PERMISSION_KEYS = [
  "projects.create",
  "milestones.manage",
  "offers.edit",
  "changes.draft",
  "documents.send",
  "drafts.view_all",
  "notes.view",
  "payments.record",
  "finance.view",
  "clients.manage",
] as const;

export type Permission = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_GROUPS: { label: string; items: { key: Permission; label: string; description: string }[] }[] = [
  {
    label: "Обекти",
    items: [
      { key: "projects.create", label: "Създава обекти", description: "Нови обекти и клиенти." },
      { key: "milestones.manage", label: "Управлява етапи", description: "Отбелязва етапи като започнати или завършени." },
      { key: "clients.manage", label: "Редактира клиенти", description: "Името и контактите на клиента във всичките му обекти. Нужен е достъп до всички обекти." },
    ],
  },
  {
    label: "Оферти",
    items: [
      { key: "offers.edit", label: "Прави оферти", description: "Създава и редактира оферти." },
      { key: "changes.draft", label: "Подготвя промени", description: "Чернови на допълнителна работа по обекта." },
      { key: "documents.send", label: "Изпраща на клиента", description: "Замразява офертата или промяната и я праща за решение." },
      { key: "drafts.view_all", label: "Вижда чужди чернови", description: "Без това вижда само своите чернови и изпратените оферти и промени." },
      { key: "notes.view", label: "Вътрешни бележки", description: "Вижда бележките, които клиентът не вижда." },
    ],
  },
  {
    label: "Пари",
    items: [
      { key: "payments.record", label: "Записва плащания", description: "Отбелязва получени суми и корекции." },
      { key: "finance.view", label: "Финанси", description: "Секция „Плащания“ и месечната справка." },
    ],
  },
];

export const PRESETS = {
  field: { label: "Терен", description: "Подготвя промени и отчита етапи.", permissions: ["changes.draft", "milestones.manage"] },
  office: {
    label: "Офис",
    description: "Оферти, изпращане към клиента, финанси.",
    permissions: PERMISSION_KEYS.filter((key) => key !== "payments.record"),
  },
} satisfies Record<string, { label: string; description: string; permissions: Permission[] }>;

export type PresetKey = keyof typeof PRESETS;

type Subject = { role: string; permissions: readonly Permission[] };

export function can(subject: Subject, permission: Permission) {
  return subject.role === "owner" || subject.permissions.includes(permission);
}

export function sortPermissions(permissions: readonly Permission[]) {
  return PERMISSION_KEYS.filter((key) => permissions.includes(key));
}

export function presetOf(permissions: readonly Permission[]): PresetKey | null {
  const current = sortPermissions(permissions).join();
  for (const [key, preset] of Object.entries(PRESETS)) {
    if (sortPermissions(preset.permissions).join() === current) return key as PresetKey;
  }
  return null;
}

export function roleLabel(subject: Subject) {
  if (subject.role === "owner") return "Собственик";
  const preset = presetOf(subject.permissions);
  return preset ? PRESETS[preset].label : "По избор";
}
