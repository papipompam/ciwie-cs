# Student application location

`/student/applications` uses Leaflet, initialized only after mount. Students must
select a location by clicking/dragging the marker, selecting the map center with
the keyboard, or explicitly requesting browser geolocation. The form sends numeric
`latitude` and `longitude`; the shared Zod schema validates their ranges in the UI
and mock API. Address remains a separate, required field.

Map tiles and attribution can be configured with `NUXT_PUBLIC_MAP_TILE_URL` and
`NUXT_PUBLIC_MAP_TILE_ATTRIBUTION`. The default OpenStreetMap tile service requires
visible attribution, has no SLA, and must not be used for bulk/offline downloads.
See https://operations.osmfoundation.org/policies/tiles/.

## Persistence boundary

Address lookup is user-triggered: the location picker receives the current
`letterAddress` value and searches only when the student presses the search button.
The first matching position is used as a suggested marker; the student must still
verify it and can click or drag the marker before saving. Students can also enter
latitude (-90 to 90) and longitude (-180 to 180) directly.
A valid pair moves the map and marker; clicking or dragging the marker updates
both input fields. Invalid text stays visible with inline feedback and prevents
saving, including edits. Clearing a field clears its submitted coordinate rather
than silently reusing the old value. Existing coordinates populate the edit form.

Geocoding is proxied through `/api/geocoding/search`, configured by
`NUXT_GEOCODING_BASE_URL` and `NUXT_GEOCODING_USER_AGENT`. The prototype defaults
to the public OpenStreetMap Nominatim service, caches repeated queries in memory,
and serializes uncached provider requests to stay at or below one request per
second. Production deployment must provide an identifying contact in the User-Agent
and review the provider policy or switch to a managed/self-hosted provider.

The current student application endpoints still use the prototype in-memory
store and fixed prototype student identity. GET/PATCH/DELETE now share that store
with POST, so page refreshes retain data while the same server process lives.
This is **not database persistence or authenticated production access**.

The target Prisma schema includes nullable `Decimal(10, 7)` coordinates on
`StudentApplication` (application snapshot) and `CompanySite` (shared location).
Nullable fields preserve compatibility with existing records without invented
coordinates. New application input requires both coordinates. Future readers
must convert Prisma decimals to JSON numbers and handle legacy null values.

Before enabling MySQL persistence, complete the existing backend foundation:

1. Resolve authenticated student identity and active `CycleEnrollment` server-side.
2. Establish the initial migration/baseline using the project's migration workflow.
3. Implement DB-backed application reads/writes and an atomic one-active-company
   constraint across the student's enrollments; do not rely on an unlocked read
   followed by insert.
4. Test restart persistence, ownership, concurrent creation and status changes.

No DB migration or automatic creation of user/cycle/enrollment records is performed
by this UI change. A tracking record remains blocking until the company marks it
`rejected`. Student cancellation remains blocking and requires staff follow-up.
Under the revised flow, `completed` represents the student's
confirmed selection and remains blocking, as does `accepted`. See
`student-application-flow.md` for the recipient fields and remaining document workflow.
