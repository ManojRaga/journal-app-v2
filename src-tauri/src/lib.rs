mod db;

use db::{
    ChatMessage, CreateEntryRequest, Database, JournalEntry, SearchRequest, UpdateEntryRequest,
};

use anyhow::Result;
use reqwest;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

// Python RAG Service integration
#[derive(Debug, Serialize, Deserialize)]
pub struct PythonChatRequest {
    pub user_id: String,
    pub message: String,
    pub conversation_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PythonChatResponse {
    pub answer: String,
    pub sources: Vec<serde_json::Value>,
    pub conversation_id: String,
}

// Global state for the application
pub struct AppState {
    db: Mutex<Option<Database>>,
    user_id: Mutex<Option<String>>,
}

impl AppState {
    fn new() -> Self {
        AppState {
            db: Mutex::new(None),
            user_id: Mutex::new(None),
        }
    }
}

#[tauri::command]
async fn initialize_database(state: State<'_, AppState>, app: AppHandle) -> Result<String, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;

    let db_path = app_dir.join("journal.db");
    let db_url = format!("sqlite:{}", db_path.to_string_lossy());

    let database = Database::new(&db_url).await.map_err(|e| e.to_string())?;

    // Create default user if none exists
    let user_id = database
        .get_or_create_user("default@journal.app")
        .await
        .map_err(|e| e.to_string())?;
    log::info!("Default user ID: {}", user_id);

    *state.db.lock().unwrap() = Some(database);
    *state.user_id.lock().unwrap() = Some(user_id.clone());

    Ok(user_id)
}

#[tauri::command]
async fn create_entry(
    state: State<'_, AppState>,
    request: CreateEntryRequest,
) -> Result<JournalEntry, String> {
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    let user_id = state
        .user_id
        .lock()
        .unwrap()
        .as_ref()
        .cloned()
        .ok_or("User not initialized")?;

    let entry = db
        .create_entry(&user_id, request)
        .await
        .map_err(|e| e.to_string())?;

    // TODO: Index the entry for RAG when we implement thread-safe LLM handling

    Ok(entry)
}

#[tauri::command]
async fn get_entries(state: State<'_, AppState>) -> Result<Vec<JournalEntry>, String> {
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    let user_id = state
        .user_id
        .lock()
        .unwrap()
        .as_ref()
        .cloned()
        .ok_or("User not initialized")?;

    let entries = db.get_entries(&user_id).await.map_err(|e| e.to_string())?;
    Ok(entries)
}

#[tauri::command]
async fn get_entry(state: State<'_, AppState>, id: String) -> Result<Option<JournalEntry>, String> {
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    let entry = db.get_entry(&id).await.map_err(|e| e.to_string())?;
    Ok(entry)
}

#[tauri::command]
async fn update_entry(
    state: State<'_, AppState>,
    request: UpdateEntryRequest,
) -> Result<Option<JournalEntry>, String> {
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    let entry = db.update_entry(request).await.map_err(|e| e.to_string())?;

    // TODO: Re-index the entry for RAG when we implement thread-safe LLM handling

    Ok(entry)
}

#[tauri::command]
async fn delete_entry(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    let deleted = db.delete_entry(&id).await.map_err(|e| e.to_string())?;

    // TODO: Remove from RAG index when we implement thread-safe LLM handling

    Ok(deleted)
}

#[tauri::command]
async fn search_entries(
    state: State<'_, AppState>,
    request: SearchRequest,
) -> Result<Vec<JournalEntry>, String> {
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    let user_id = state
        .user_id
        .lock()
        .unwrap()
        .as_ref()
        .cloned()
        .ok_or("User not initialized")?;

    let results = db
        .search_entries(&user_id, request)
        .await
        .map_err(|e| e.to_string())?;
    Ok(results)
}

#[tauri::command]
async fn chat_with_ai(
    state: State<'_, AppState>,
    request: PythonChatRequest,
) -> Result<PythonChatResponse, String> {
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    // Store user message
    let _ = db
        .create_chat_message(&request.user_id, &request.message, true)
        .await;

    // Call Python RAG service
    let client = reqwest::Client::new();
    let python_request = PythonChatRequest {
        user_id: request.user_id.clone(),
        message: request.message.clone(),
        conversation_id: request.conversation_id.clone(),
    };

    let response = client
        .post("http://127.0.0.1:8000/chat")
        .json(&python_request)
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Python service: {}", e))?
        .json::<PythonChatResponse>()
        .await
        .map_err(|e| format!("Failed to parse Python response: {}", e))?;

    // Store AI response
    let _ = db
        .create_chat_message(&request.user_id, &response.answer, false)
        .await;

    Ok(response)
}

#[tauri::command]
async fn get_system_info() -> Result<serde_json::Value, String> {
    let info = serde_json::json!({
        "platform": std::env::consts::OS,
        "architecture": std::env::consts::ARCH,
        "version": env!("CARGO_PKG_VERSION"),
    });
    Ok(info)
}

#[tauri::command]
async fn get_chat_history(state: State<'_, AppState>) -> Result<Vec<ChatMessage>, String> {
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    let user_id = {
        let uid_guard = state.user_id.lock().unwrap();
        uid_guard.clone().ok_or("User not initialized")?
    };

    let messages = db
        .get_chat_messages(&user_id, Some(50))
        .await
        .map_err(|e| e.to_string())?;
    Ok(messages)
}

// Simple greeting command for testing
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::new())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
                // Open DevTools in debug mode
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            initialize_database,
            create_entry,
            get_entries,
            get_entry,
            update_entry,
            delete_entry,
            search_entries,
            chat_with_ai,
            get_chat_history,
            get_system_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
