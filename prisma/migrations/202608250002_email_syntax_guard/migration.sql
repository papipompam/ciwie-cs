-- Preserve the canonical email-only login invariant for every database writer.
ALTER TABLE `users`
  ADD CONSTRAINT `users_email_canonical_chk`
    CHECK (BINARY `email` = BINARY `normalized_email`),
  ADD CONSTRAINT `users_email_shape_chk`
    CHECK (`normalized_email` REGEXP '^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$');
