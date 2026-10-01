# Read state and notifications

## Ownership

| Module                         | Owns                                               | Does not own                           |
| ------------------------------ | -------------------------------------------------- | -------------------------------------- |
| `social/entries`               | Channel sequence and durable timeline position     | Read cursors, notification preferences |
| `social/read-state`            | Member cursor, unread summary, mark-read operation | Sound, push, mute rules                |
| `communities/channel-audience` | Current channel members and access                 | Message classification, unread count   |
| `social/mentions`              | Structured mention membership                      | Delivery policy                        |
| `notifications`                | Preferences, recipient decisions, delivery records | Timeline and read cursor               |
| `realtime`                     | Authenticated transport and rooms                  | Business decisions                     |

Controllers accept transport DTOs and call application services. Repositories read or write the data owned by their module. Application services compose narrow public contracts from other modules. Notification policy is an injectable domain service with no database or transport dependency.

## Product invariants

1. Unread means an eligible timeline entry after the member's cursor. It is independent of mute. Muting changes interruption, not history.
2. An alert is a decision for one recipient and one event. Channel default is mentions; DM default is all messages. Own messages never alert. An open conversation in a focused tab suppresses its local sound and explicitly advances read state through the latest received entry.
3. A badge for channels excludes DMs. The DM navigation badge is derived from the complete read-state summary, never from the five-row quick access list.
4. Every device of one member receives the same mark-read cursor. Applying an older cursor must never move state backwards.
5. Socket events are ordered while connected but are not durable. A snapshot on initial load and reconnect repairs gaps. A client must not replace a newer local cursor with an older event.
6. Content changes and read-state changes are different events. Pins and edits do not invalidate unread. Deleting an unread entry does.

## Event flow

Поточний шлях: `entry committed → local domain event → audience resolution → unread mutation + recipient policy → realtime delivery`. Для push і кількох інстансів джерелом цього самого процесора має стати транзакційний outbox.

The live unread event carries the channel, entry sequences, action and recipient alert decision. Clients apply it to one channel of the workspace projection, with deduplication by event ID. The source event identifies the actor and structured mentions; the notification policy decides `alert` for each recipient. A mark-read event carries the authoritative cursor and channel count to every device of that member. The initial workspace snapshot remains the recovery contract.

The server does not recompute the full workspace summary for each message. It reads the channel audience and preferences in separate bounded queries, then delivers one mutation to each eligible recipient. For a capped count at the display threshold, deletion may leave the `99+` presentation until the next snapshot; the exact server count remains authoritative for read operations.

## Durability and scale

The current `EventEmitter2` publication is process local. It cannot be the reliable basis for mobile push or cross-instance delivery. Before enabling push, write the domain event to a transactional outbox with the timeline entry, process it with retries and an idempotency key, and record per-device delivery attempts. The outbox worker can batch recipient lookups and coalesce noisy channel alerts. Tenant branding belongs to delivery templates, not read-state or preference policy.

Do not materialize one unread counter write per channel member on every message by default. That makes a large channel write path proportional to its audience. Keep cursors and the bounded read-state snapshot as truth, use live increments for connected clients, and measure snapshot cost and large-channel fanout before adding a materialized projection.

## Acceptance cases

- Twenty historical call rows do not create twenty active-call observers.
- A new entry in the open, focused conversation advances the cursor and leaves the badge clear. A background tab keeps its unread state until it becomes visible.
- Another device clears its badge after mark-read without fetching the workspace summary.
- Default channel messages without a mention are silent; a mention and an unmuted DM can alert. Mute is shared across devices.
- Channel and DM navigation counts are disjoint and include every unread conversation, not only the quick access subset.
- Reconnect restores exact state from one workspace snapshot. Socket events do not trigger workspace-wide read-state GETs.
