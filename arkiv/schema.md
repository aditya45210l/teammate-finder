# Schema

`mumbai-teammate-v1` (see `src/arkiv/schema.ts`): author (addr, indexed), role (str, indexed), lookingFor (str, indexed), name, skills, note, contact.
Entities expire after 24h via `ExpirationTime.fromHours(24)`. Skill search is client-side because Arkiv has no "contains" operator.
