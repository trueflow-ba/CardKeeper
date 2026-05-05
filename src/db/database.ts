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
      name TEXT,
      title TEXT,
      company TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      address TEXT,
      card_image_path TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

export async function insertContact(
  contact: {
    name: string | null;
    title: string | null;
    company: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: string | null;
    cardImagePath: string | null;
  }
): Promise<string> {
  const database = await getDB();
  const now = Date.now();
  const id = `ck_${now}_${Math.random().toString(36).slice(2, 8)}`;
  await database.runAsync(
    `INSERT INTO contacts (id, name, title, company, phone, email, website, address, card_image_path, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      contact.name,
      contact.title,
      contact.company,
      contact.phone,
      contact.email,
      contact.website,
      contact.address,
      contact.cardImagePath,
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

export async function updateContact(
  id: string,
  fields: {
    name?: string | null;
    title?: string | null;
    company?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    address?: string | null;
  }
): Promise<void> {
  const database = await getDB();
  const sets: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(fields)) {
    sets.push(`${key} = ?`);
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
     name LIKE ? OR company LIKE ? OR email LIKE ? OR phone LIKE ?
     ORDER BY created_at DESC`,
    [like, like, like, like]
  );
}
