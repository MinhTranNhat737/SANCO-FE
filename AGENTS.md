# Project instructions

The user wants automatic Git publishing. After completing each authorized source or documentation change, run the relevant checks, commit the changes, and push to `origin` on the current branch without requesting confirmation again. This includes small follow-up fixes.

Preserve unrelated work and staged changes. Never force-push or rewrite shared history. Never commit real environment values, secrets, downloaded OAuth client JSON, private certificates, dependencies, or build output. Keep sanitized `.env.example` files versioned.
