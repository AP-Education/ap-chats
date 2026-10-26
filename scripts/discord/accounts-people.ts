import { Pool } from 'pg';

/** A person as Accounts knows them: the id is the subject Chats signs them in with. */
export interface AccountsPerson {
  userId: string;
  names: string[];
}

/**
 * Reads backend-LMS, which owns Accounts, and never writes to it: the Discord accounts people linked
 * on the platform, and the application's staff with the names they go by. Its ids are char(36),
 * read as text so none arrives padded.
 */
export async function readAccounts(databaseUrl: string, applicationId: string) {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const linked = await pool.query<{ discordUserId: string; userId: string }>(
      `select i.value as "discordUserId", i.user_id::text as "userId"
       from identities i
       join users u on u.id = i.user_id and u.deleted_at is null
       where i.type = 'DISCORD' and i.application_id = $1`,
      [applicationId],
    );
    const staff = await pool.query<{ userId: string; displayName: string; fullName: string }>(
      `select distinct u.id::text as "userId", m.display_name as "displayName",
         trim(u.first_name || ' ' || u.last_name) as "fullName"
       from users u
       join memberships m on m.user_id = u.id and m.deleted_at is null
       join employees e on e.member_id = m.id and e.deleted_at is null
       where u.deleted_at is null and u.application_id = $1`,
      [applicationId],
    );

    const namesByUser = new Map<string, Set<string>>();
    for (const row of staff.rows) {
      const names = namesByUser.get(row.userId) ?? new Set();
      for (const name of [row.displayName, row.fullName]) if (name?.trim()) names.add(name.trim());
      namesByUser.set(row.userId, names);
    }

    return {
      discordLinks: Object.fromEntries(
        linked.rows.map((row) => [row.discordUserId, row.userId] as const),
      ),
      staff: [...namesByUser].map(([userId, names]): AccountsPerson => ({
        userId,
        names: [...names],
      })),
    };
  } finally {
    await pool.end();
  }
}
