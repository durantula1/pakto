export const supportKinds = { problem: "Проблем", question: "Въпрос", idea: "Идея", other: "Друго" } as const;

export type SupportKind = keyof typeof supportKinds;
