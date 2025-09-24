use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{migrate::MigrateDatabase, sqlite::SqliteRow, Row, Sqlite, SqlitePool};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JournalEntry {
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    pub title: String,
    pub body: String,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
    pub mood: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEntryRequest {
    pub title: String,
    pub body: String,
    pub mood: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateEntryRequest {
    pub id: String,
    pub title: Option<String>,
    pub body: Option<String>,
    pub mood: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchRequest {
    pub query: String,
    pub limit: Option<i32>,
}

#[derive(Clone)]
pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self> {
        // Create database if it doesn't exist
        if !Sqlite::database_exists(database_url).await.unwrap_or(false) {
            Sqlite::create_database(database_url).await?;
            log::info!("Created database: {}", database_url);
        }

        let pool = SqlitePool::connect(database_url).await?;

        let db = Database { pool };

        // Run migrations
        db.create_tables().await?;

        Ok(db)
    }

    async fn create_tables(&self) -> Result<()> {
        // Users table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE,
                created_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Journal entries table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS entries (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                body TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                mood TEXT,
                tags TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // FTS5 virtual tables for full-text search
        sqlx::query(
            r#"
            CREATE VIRTUAL TABLE IF NOT EXISTS entry_fts USING fts5(
                id UNINDEXED,
                title,
                body,
                content='entries',
                content_rowid='rowid'
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Chat messages table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                content TEXT NOT NULL,
                is_user BOOLEAN NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create indexes
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries (user_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries (created_at)")
            .execute(&self.pool)
            .await?;

        log::info!("Database tables created successfully");
        Ok(())
    }

    pub async fn create_user(&self, email: &str) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query("INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)")
            .bind(&id)
            .bind(email)
            .bind(&now)
            .execute(&self.pool)
            .await?;

        Ok(id)
    }

    pub async fn get_or_create_user(&self, email: &str) -> Result<String> {
        // First try to find existing user by email
        let existing_user = sqlx::query("SELECT id FROM users WHERE email = ?")
            .bind(email)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = existing_user {
            return Ok(row.get("id"));
        }

        // If user doesn't exist, create one
        self.create_user(email).await
    }

    pub async fn create_entry(
        &self,
        user_id: &str,
        request: CreateEntryRequest,
    ) -> Result<JournalEntry> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let tags_json = request
            .tags
            .as_ref()
            .map(|t| serde_json::to_string(t).unwrap());

        sqlx::query(
            "INSERT INTO entries (id, user_id, title, body, created_at, updated_at, mood, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(user_id)
        .bind(&request.title)
        .bind(&request.body)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .bind(&request.mood)
        .bind(&tags_json)
        .execute(&self.pool)
        .await?;

        // Insert into FTS
        sqlx::query("INSERT INTO entry_fts (id, title, body) VALUES (?, ?, ?)")
            .bind(&id)
            .bind(&request.title)
            .bind(&request.body)
            .execute(&self.pool)
            .await?;

        Ok(JournalEntry {
            id,
            user_id: user_id.to_string(),
            title: request.title.clone(),
            body: request.body.clone(),
            created_at: now,
            updated_at: now,
            mood: request.mood.clone(),
            tags: request.tags.clone(),
        })
    }

    pub async fn get_entries(&self, user_id: &str) -> Result<Vec<JournalEntry>> {
        let rows = sqlx::query(
            "SELECT id, user_id, title, body, created_at, updated_at, mood, tags FROM entries WHERE user_id = ? ORDER BY created_at DESC"
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await?;

        let mut entries = Vec::new();
        for row in rows {
            entries.push(self.row_to_entry(row)?);
        }

        Ok(entries)
    }

    pub async fn get_entry(&self, id: &str) -> Result<Option<JournalEntry>> {
        let row = sqlx::query(
            "SELECT id, user_id, title, body, created_at, updated_at, mood, tags FROM entries WHERE id = ?"
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(row) => Ok(Some(self.row_to_entry(row)?)),
            None => Ok(None),
        }
    }

    pub async fn update_entry(&self, request: UpdateEntryRequest) -> Result<Option<JournalEntry>> {
        let now = Utc::now();

        // Build dynamic update query
        let mut query_parts = vec!["UPDATE entries SET updated_at = ?"];
        let now_string = now.to_rfc3339();
        let mut bind_values: Vec<String> = vec![now_string];
        let mut _has_updates = false;

        if let Some(ref title) = request.title {
            query_parts.push("title = ?");
            bind_values.push(title.clone());
            _has_updates = true;
        }

        if let Some(ref body) = request.body {
            query_parts.push("body = ?");
            bind_values.push(body.clone());
            _has_updates = true;
        }

        if let Some(ref mood) = request.mood {
            query_parts.push("mood = ?");
            bind_values.push(mood.clone());
            _has_updates = true;
        }

        let tags_json = request
            .tags
            .as_ref()
            .map(|t| serde_json::to_string(t).unwrap());
        if let Some(ref tags_str) = tags_json {
            query_parts.push("tags = ?");
            bind_values.push(tags_str.clone());
            _has_updates = true;
        }

        query_parts.push("WHERE id = ?");
        bind_values.push(request.id.clone());

        let query_str = query_parts.join(", ").replace(", WHERE", " WHERE");

        let mut query = sqlx::query(&query_str);
        for value in &bind_values {
            query = query.bind(value);
        }

        query.execute(&self.pool).await?;

        // Update FTS if title or body changed
        if request.title.is_some() || request.body.is_some() {
            if let Some(entry) = self.get_entry(&request.id).await? {
                sqlx::query("UPDATE entry_fts SET title = ?, body = ? WHERE id = ?")
                    .bind(&entry.title)
                    .bind(&entry.body)
                    .bind(&request.id)
                    .execute(&self.pool)
                    .await?;
            }
        }

        self.get_entry(&request.id).await
    }

    pub async fn delete_entry(&self, id: &str) -> Result<bool> {
        let result = sqlx::query("DELETE FROM entries WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        // Delete from FTS
        sqlx::query("DELETE FROM entry_fts WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn search_entries(
        &self,
        user_id: &str,
        request: SearchRequest,
    ) -> Result<Vec<JournalEntry>> {
        let limit = request.limit.unwrap_or(50);

        // Try FTS5 search first, fall back to simple LIKE search if FTS fails
        let phrase_query = format!("\"{}\"", request.query.replace('"', "\""));

        // First try FTS5 search
        let fts_rows = sqlx::query(
            r#"
            SELECT e.id, e.user_id, e.title, e.body, e.created_at, e.updated_at, e.mood, e.tags
            FROM entries e
            INNER JOIN entry_fts fts ON e.id = fts.id
            WHERE e.user_id = ? AND entry_fts MATCH ?
            ORDER BY bm25(entry_fts)
            LIMIT ?
            "#,
        )
        .bind(user_id)
        .bind(&phrase_query)
        .bind(limit)
        .fetch_all(&self.pool)
        .await;

        let rows = match fts_rows {
            Ok(rows) if !rows.is_empty() => rows,
            _ => {
                // Fallback to simple LIKE search
                let like_query = format!("%{}%", request.query);
                sqlx::query(
                    r#"
                    SELECT id, user_id, title, body, created_at, updated_at, mood, tags
                    FROM entries
                    WHERE user_id = ? AND (title LIKE ? OR body LIKE ?)
                    ORDER BY created_at DESC
                    LIMIT ?
                    "#,
                )
                .bind(user_id)
                .bind(&like_query)
                .bind(&like_query)
                .bind(limit)
                .fetch_all(&self.pool)
                .await?
            }
        };

        let mut entries = Vec::new();
        for row in rows {
            entries.push(self.row_to_entry(row)?);
        }

        Ok(entries)
    }

    // --- Chat persistence ---
    pub async fn create_chat_message(
        &self,
        user_id: &str,
        content: &str,
        is_user: bool,
    ) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO chat_messages (id, user_id, content, is_user, created_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(user_id)
        .bind(content)
        .bind(is_user)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(id)
    }

    pub async fn get_chat_messages(
        &self,
        user_id: &str,
        limit: Option<i32>,
    ) -> Result<Vec<ChatMessage>> {
        let limit = limit.unwrap_or(50);
        let rows = sqlx::query(
            "SELECT id, user_id, content, is_user, created_at FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
        )
        .bind(user_id)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        let mut messages = Vec::new();
        for row in rows {
            messages.push(ChatMessage {
                id: row.try_get("id")?,
                user_id: row.try_get("user_id")?,
                content: row.try_get("content")?,
                is_user: row.try_get("is_user")?,
                created_at: row.try_get("created_at")?,
            });
        }

        // Reverse to get chronological order
        messages.reverse();
        Ok(messages)
    }

    fn row_to_entry(&self, row: SqliteRow) -> Result<JournalEntry> {
        let tags_str: Option<String> = row.try_get("tags")?;
        let tags = tags_str.and_then(|s| serde_json::from_str(&s).ok());

        Ok(JournalEntry {
            id: row.try_get("id")?,
            user_id: row.try_get("user_id")?,
            title: row.try_get("title")?,
            body: row.try_get("body")?,
            created_at: DateTime::parse_from_rfc3339(&row.try_get::<String, _>("created_at")?)?
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339(&row.try_get::<String, _>("updated_at")?)?
                .with_timezone(&Utc),
            mood: row.try_get("mood")?,
            tags,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub id: String,
    pub user_id: String,
    pub content: String,
    pub is_user: bool,
    pub created_at: String,
}
