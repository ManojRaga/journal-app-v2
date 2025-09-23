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
        // For now, we'll return a contextual mock response based on the model being loaded
        // In a full implementation, this would:
        // 1. Tokenize the prompt using the model's tokenizer
        // 2. Run inference through the context
        // 3. Sample tokens and decode them back to text

        let model_name = self.model_path.as_ref()
            .and_then(|p| Path::new(p).file_name())
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");

        let contextual_response = format!(
            "Based on your journal entries and using model '{}', I can help you reflect on: '{}'. \
            This response demonstrates that the LLM infrastructure is working and can be extended \
            to provide meaningful insights about your thoughts and experiences. \
            The model is loaded and ready to process your journal content contextually.",
            model_name,
            prompt.chars().take(100).collect::<String>()
        );

        Ok(contextual_response)
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
    let mut prompt = String::new();

    prompt.push_str("You are a thoughtful AI assistant helping with journal reflection. ");
    prompt.push_str("You have access to the user's past journal entries to provide context and insights. ");
    prompt.push_str("Be empathetic, insightful, and help the user reflect on their thoughts and experiences.\n\n");

    if !context_entries.is_empty() {
        prompt.push_str("Relevant journal entries:\n");
        for (date, title, content) in context_entries {
            prompt.push_str(&format!("- [{}] {}: {}\n", date, title, content));
        }
        prompt.push_str("\n");
    }

    prompt.push_str(&format!("User: {}\n\nAssistant: ", question));

    prompt
}

pub fn build_system_prompt() -> String {
    "You are a helpful AI assistant for a personal journaling application. \
     You help users reflect on their journal entries, find patterns in their thoughts, \
     and provide gentle guidance for personal growth. Always be supportive, \
     non-judgmental, and respect the user's privacy.".to_string()
}