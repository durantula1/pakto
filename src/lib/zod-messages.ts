import { z } from "zod";

/**
 * Bulgarian fallback text for every zod rule without its own message, so no English or technical
 * wording ("Too small: expected string…") can reach a screen. Rules with their own message win.
 * Imported for its side effect by every module that parses input.
 */
z.config({
  customError(issue) {
    switch (issue.code) {
      case "too_small":
        if (issue.origin === "string") return issue.minimum === 1 || issue.minimum === 1n ? "Попълни полето." : `Въведи поне ${issue.minimum} знака.`;
        if (issue.origin === "array") return "Добави поне един запис.";
        return `Стойността е твърде малка (най-малко ${issue.minimum}).`;
      case "too_big":
        if (issue.origin === "string") return `Най-много ${issue.maximum} знака.`;
        if (issue.origin === "array") return `Най-много ${issue.maximum} записа.`;
        return `Стойността е твърде голяма (най-много ${issue.maximum}).`;
      case "invalid_type":
        return issue.input === undefined || issue.input === null ? "Попълни полето." : "Провери въведеното.";
      case "invalid_format":
        return issue.format === "email" ? "Въведи валиден имейл." : issue.format === "url" ? "Въведи валиден адрес." : "Провери въведеното.";
      case "invalid_value":
      case "unrecognized_keys":
      case "invalid_union":
        return "Провери въведеното.";
      default:
        return undefined;
    }
  },
});
