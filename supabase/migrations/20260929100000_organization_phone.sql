-- docs/chat-narrowing-plan.md, part 3: the company's public phone. The client portal shows it as
-- "Обадете се" and Viber buttons in place of the project-wide chat. Optional; as typed by the owner.
ALTER TABLE app.organizations
  ADD COLUMN phone text CHECK (phone IS NULL OR char_length(phone) BETWEEN 6 AND 30);
