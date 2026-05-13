import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync("cardkeeper.db");
    await initDB(db);
  }
  return db;
}

async function initDB(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY NOT NULL,
      first_name TEXT,
      last_name TEXT,
      title TEXT,
      company TEXT,
      phone TEXT,
      phone2 TEXT,
      email TEXT,
      website TEXT,
      linkedin TEXT,
      address TEXT,
      card_image_path TEXT,
      card_image_rotation INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  // Migrations for existing databases
  const migrations: [string, string][] = [
    ["card_image_rotation", "ALTER TABLE contacts ADD COLUMN card_image_rotation INTEGER DEFAULT 0"],
    ["first_name", "ALTER TABLE contacts ADD COLUMN first_name TEXT"],
    ["last_name", "ALTER TABLE contacts ADD COLUMN last_name TEXT"],
    ["phone2", "ALTER TABLE contacts ADD COLUMN phone2 TEXT"],
    ["linkedin", "ALTER TABLE contacts ADD COLUMN linkedin TEXT"],
  ];
  for (const [col, sql] of migrations) {
    try {
      await database.execAsync(sql);
    } catch {
      // Column already exists
    }
  }
  // Backfill: if first_name is null but name exists, split name into first/last
  try {
    await database.execAsync(
      `UPDATE contacts SET first_name = substr(name, 1, instr(name, ' ') - 1), last_name = substr(name, instr(name, ' ') + 1) WHERE first_name IS NULL AND name IS NOT NULL AND name LIKE '% %'`
    );
    await database.execAsync(
      `UPDATE contacts SET first_name = name WHERE first_name IS NULL AND name IS NOT NULL AND name NOT LIKE '% %'`
    );
  } catch {}
}

export async function insertContact(
  contact: {
    firstName: string | null;
    lastName: string | null;
    title: string | null;
    company: string | null;
    phone: string | null;
    phone2: string | null;
    email: string | null;
    website: string | null;
    linkedin: string | null;
    address: string | null;
    cardImagePath: string | null;
    cardImageRotation?: number;
  }
): Promise<string> {
  const database = await getDB();
  const now = Date.now();
  const id = `ck_${now}_${Math.random().toString(36).slice(2, 8)}`;
  await database.runAsync(
    `INSERT INTO contacts (id, first_name, last_name, title, company, phone, phone2, email, website, linkedin, address, card_image_path, card_image_rotation, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      contact.firstName,
      contact.lastName,
      contact.title,
      contact.company,
      contact.phone,
      contact.phone2,
      contact.email,
      contact.website,
      contact.linkedin,
      contact.address,
      contact.cardImagePath,
      contact.cardImageRotation || 0,
      now,
      now,
    ]
  );
  return id;
}

export async function getAllContacts(): Promise<any[]> {
  const database = await getDB();
  return database.getAllAsync(
    `SELECT * FROM contacts ORDER BY created_at DESC`
  );
}

export async function getContactById(id: string): Promise<any | null> {
  const database = await getDB();
  return database.getFirstAsync(
    `SELECT * FROM contacts WHERE id = ?`,
    [id]
  );
}

export async function updateCardImageRotation(id: string, rotation: number): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    `UPDATE contacts SET card_image_rotation = ?, updated_at = ? WHERE id = ?`,
    [rotation, Date.now(), id]
  );
}

export async function updateContact(
  id: string,
  fields: {
    firstName?: string | null;
    lastName?: string | null;
    title?: string | null;
    company?: string | null;
    phone?: string | null;
    phone2?: string | null;
    email?: string | null;
    website?: string | null;
    linkedin?: string | null;
    address?: string | null;
  }
): Promise<void> {
  const database = await getDB();
  const columnMap: Record<string, string> = {
    firstName: "first_name",
    lastName: "last_name",
    phone2: "phone2",
  };
  const sets: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(fields)) {
    const col = columnMap[key] || key;
    sets.push(`${col} = ?`);
    values.push(value);
  }
  sets.push("updated_at = ?");
  values.push(Date.now());
  values.push(id);

  await database.runAsync(
    `UPDATE contacts SET ${sets.join(", ")} WHERE id = ?`,
    values
  );
}

export async function deleteContact(id: string): Promise<void> {
  const database = await getDB();
  await database.runAsync(`DELETE FROM contacts WHERE id = ?`, [id]);
}

export async function searchContacts(query: string): Promise<any[]> {
  const database = await getDB();
  const like = `%${query}%`;
  return database.getAllAsync(
    `SELECT * FROM contacts WHERE
     first_name LIKE ? OR last_name LIKE ? OR company LIKE ? OR email LIKE ? OR phone LIKE ?
     ORDER BY created_at DESC`,
    [like, like, like, like, like]
  );
}
