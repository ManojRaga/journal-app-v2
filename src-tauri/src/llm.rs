use anyhow::Result;
use llama_cpp_2::{
    context::{LlamaContext, params::LlamaContextParams},
    llama_backend::LlamaBackend,
    model::{LlamaModel, params::LlamaModelParams},
};
use std::path::Path;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub message: String,
    pub user_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub response: String,
    pub sources: Vec<String>,
}

// LlamaChat with proper lifetime management - store model and create contexts as needed
pub struct LlamaChat {
    backend: LlamaBackend,
    model: Option<LlamaModel>,
    model_path: Option<String>,
}

impl Clone for LlamaChat {
    fn clone(&self) -> Self {
        // Create a new instance with the same model path
        // The model will need to be reloaded on first use
        LlamaChat {
            backend: LlamaBackend::init().expect("Failed to initialize backend in clone"),
            model: None, // Model will be lazy-loaded on first use
            model_path: self.model_path.clone(),
        }
    }
}

impl LlamaChat {
    pub fn new() -> Result<Self> {
        let backend = LlamaBackend::init()?;

        Ok(LlamaChat {
            backend,
            model: None,
            model_path: None,
        })
    }

    pub async fn load_model(&mut self, model_path: &str) -> Result<()> {
        if !Path::new(model_path).exists() {
            return Err(anyhow::anyhow!("Model file not found: {}", model_path));
        }

        let model_params = LlamaModelParams::default();
        let model = LlamaModel::load_from_file(&self.backend, model_path, &model_params)?;

        self.model = Some(model);
        self.model_path = Some(model_path.to_string());

        log::info!("Loaded LLM model: {}", model_path);
        Ok(())
    }

    pub fn is_loaded(&self) -> bool {
        self.model.is_some()
    }

    pub async fn generate_response(&mut self, prompt: &str, _max_tokens: usize) -> Result<String> {
        // Lazy-load model if we have a path but no loaded model
        if self.model.is_none() && self.model_path.is_some() {
            let path = self.model_path.as_ref().unwrap().clone();
            self.load_model(&path).await?;
        }

        if !self.is_loaded() {
            return Err(anyhow::anyhow!("Model not loaded and no model path available"));
        }

        let model = self.model.as_ref().unwrap();

        // Create a fresh context for this generation
        let ctx_params = LlamaContextParams::default();
        let mut context = model.new_context(&self.backend, ctx_params)?;

        // For now, implement a simplified token generation
        // TODO: Use proper llama-cpp-2 API for token sampling once it's stabilized
        let response = self.generate_with_context(&mut context, prompt)?;

        log::info!("Generated response for prompt: {}", prompt.chars().take(50).collect::<String>());
        Ok(response)
    }

    fn generate_with_context(&self, _context: &mut LlamaContext, prompt: &str) -> Result<String> {
        // Temporary lightweight mock: extract the user question from the structured prompt
        // and produce a concise reflection without echoing system/context blocks.
        let mut user_q = None;
        if let Some(start_idx) = prompt.find("User question:\n") {
            let after = &prompt[start_idx + "User question:\n".len()..];
            // Stop at the next double newline or end
            if let Some(end_idx) = after.find("\n\n") {
                user_q = Some(after[..end_idx].trim().to_string());
            } else {
                user_q = Some(after.trim().to_string());
            }
        }

        let question = user_q.unwrap_or_else(|| "your message".to_string());

        let response = format!(
            "Here’s a quick reflection on your question: {}\n\n" \
            "- Consider how this relates to recent moods, themes, or goals in your entries.\n" \
            "- If helpful, try to write one concrete next step or a small experiment.",
            question
        );

        Ok(response)
    }

    pub async fn generate_embedding(&mut self, text: &str) -> Result<Vec<f32>> {
        // For now, we'll implement a simple placeholder
        // In a real implementation, we'd use a separate embedding model
        // like BGE-small or sentence-transformers

        // This is a placeholder that creates a simple hash-based embedding
        let mut embedding = vec![0.0f32; 384]; // BGE-small dimension

        let bytes = text.as_bytes();
        for (i, &byte) in bytes.iter().enumerate() {
            let index = (i + byte as usize) % embedding.len();
            embedding[index] += (byte as f32) / 255.0;
        }

        // Normalize the embedding
        let norm: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        if norm > 0.0 {
            for val in &mut embedding {
                *val /= norm;
            }
        }

        Ok(embedding)
    }
}

impl Default for LlamaChat {
    fn default() -> Self {
        Self::new().expect("Failed to create LlamaChat")
    }
}

// Utility functions for prompt construction
pub fn build_journal_prompt(question: &str, context_entries: &[(String, String, String)]) -> String {
    // Build a clean, structured prompt that keeps system guidance separate from the user question
    // and prevents the model from echoing system text.
    let mut prompt = String::new();

    // System role
    let system = build_system_prompt();
    prompt.push_str("System:\n");
    prompt.push_str(&system);
    prompt.push_str("\n\n");

    // Context block with truncated content to reduce prompt bloat
    if !context_entries.is_empty() {
        prompt.push_str("Context (journal snippets):\n");
        for (date, title, content) in context_entries.iter() {
            // Truncate each snippet to ~280 chars to avoid overwhelming the model
            let snippet: String = if content.len() > 280 {
                let mut s = content[..280].to_string();
                s.push_str("…");
                s
            } else {
                content.clone()
            };
            prompt.push_str(&format!("- [{}] {} — {}\n", date, title, snippet.replace('\n', " ")));
        }
        prompt.push_str("\n");
    }

    // Clear user instruction. Keep it last so the model focuses on answering it, not reiterating system text.
    prompt.push_str("User question:\n");
    prompt.push_str(question);
    prompt.push_str("\n\n");

    // Final assistant cue to answer directly.
    prompt.push_str("Assistant (answer the question concisely, referencing the context when useful):\n");

    prompt
}

pub fn build_system_prompt() -> String {
    "You are a helpful AI assistant for a personal journaling application. \
     You help users reflect on their journal entries, find patterns in their thoughts, \
     and provide gentle guidance for personal growth. Always be supportive, \
     non-judgmental, and respect the user's privacy.".to_string()
}