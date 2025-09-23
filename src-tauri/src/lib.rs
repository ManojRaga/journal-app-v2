mod db;
mod llm;
mod rag;

use db::{Database, CreateEntryRequest, UpdateEntryRequest, SearchRequest, JournalEntry};
use llm::ChatRequest;
use rag::RagResponse;

use tauri::{AppHandle, Manager, State};
use std::sync::Mutex;
use anyhow::Result;

// Global state for the application
// Note: LlamaChat is not Send+Sync, so we'll handle it differently
pub struct AppState {
    db: Mutex<Option<Database>>,
    llm_ready: Mutex<bool>,
    model_path: Mutex<Option<String>>,
}

impl AppState {
    fn new() -> Self {
        AppState {
            db: Mutex::new(None),
            llm_ready: Mutex::new(false),
            model_path: Mutex::new(None),
        }
    }
}

#[tauri::command]
async fn initialize_database(state: State<'_, AppState>, app: AppHandle) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;

    let db_path = app_dir.join("journal.db");
    let db_url = format!("sqlite:{}", db_path.to_string_lossy());

    let database = Database::new(&db_url).await.map_err(|e| e.to_string())?;

    // Create default user if none exists
    let user_id = database.create_user("default@journal.app").await.unwrap_or_else(|_| "default".to_string());
    log::info!("Default user ID: {}", user_id);

    // Store database in global state
    *state.db.lock().unwrap() = Some(database);

    Ok(())
}

#[tauri::command]
async fn load_llm_model(state: State<'_, AppState>, model_path: String) -> Result<(), String> {
    // For now, just store the model path and mark as ready
    // In a real implementation, we'd validate the model file exists
    if !std::path::Path::new(&model_path).exists() {
        return Err(format!("Model file not found: {}", model_path));
    }

    *state.model_path.lock().unwrap() = Some(model_path.clone());
    *state.llm_ready.lock().unwrap() = true;

    log::info!("LLM model path set: {}", model_path);
    Ok(())
}

#[tauri::command]
async fn create_entry(state: State<'_, AppState>, request: CreateEntryRequest) -> Result<JournalEntry, String> {
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    let entry = db.create_entry("default", request).await.map_err(|e| e.to_string())?;

    // TODO: Index the entry for RAG when we implement thread-safe LLM handling

    Ok(entry)
}

#[tauri::command]
async fn get_entries(state: State<'_, AppState>) -> Result<Vec<JournalEntry>, String> {
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    let entries = db.get_entries("default").await.map_err(|e| e.to_string())?;
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
async fn update_entry(state: State<'_, AppState>, request: UpdateEntryRequest) -> Result<Option<JournalEntry>, String> {
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
async fn search_entries(state: State<'_, AppState>, request: SearchRequest) -> Result<Vec<JournalEntry>, String> {
    let db = {
        let db_guard = state.db.lock().unwrap();
        db_guard.as_ref().ok_or("Database not initialized")?.clone()
    };

    let results = db.search_entries("default", request).await.map_err(|e| e.to_string())?;
    Ok(results)
}

#[tauri::command]
async fn chat_with_ai(state: State<'_, AppState>, request: ChatRequest) -> Result<RagResponse, String> {
    // Check if LLM is ready
    let llm_ready = *state.llm_ready.lock().unwrap();
    if !llm_ready {
        return Err("LLM not loaded yet. Please load a model first.".to_string());
    }

    // For now, return a mock response until we implement proper thread-safe LLM handling
    // TODO: Implement proper RAG pipeline with thread-safe LLM
    let mock_response = RagResponse {
        answer: format!("This is a mock response to: {}", request.message),
        sources: vec![],
        query: request.message,
    };

    Ok(mock_response)
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
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            initialize_database,
            load_llm_model,
            create_entry,
            get_entries,
            get_entry,
            update_entry,
            delete_entry,
            search_entries,
            chat_with_ai,
            get_system_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
