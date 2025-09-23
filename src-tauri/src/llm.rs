use anyhow::Result;
use llama_cpp_2::{
    context::{LlamaContext, params::LlamaContextParams},
    llama_backend::LlamaBackend,
    model::LlamaModel,
    token::{data_array::LlamaTokenDataArray, data::LlamaTokenData},
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

// Note: LlamaChat cannot derive Clone due to LlamaBackend, so we'll handle it differently
pub struct LlamaChat {
    backend: LlamaBackend,
    model: Option<LlamaModel>,
    context: Option<LlamaContext<'static>>,
    model_path: Option<String>,
}

impl Clone for LlamaChat {
    fn clone(&self) -> Self {
        // For now, create a new instance since we can't clone the backend
        // In production, we'd want a more sophisticated approach
        LlamaChat::new().expect("Failed to clone LlamaChat")
    }
}

impl LlamaChat {
    pub fn new() -> Result<Self> {
        let backend = LlamaBackend::init()?;

        Ok(LlamaChat {
            backend,
            model: None,
            context: None,
            model_path: None,
        })
    }

    pub async fn load_model(&mut self, model_path: &str) -> Result<()> {
        if !Path::new(model_path).exists() {
            return Err(anyhow::anyhow!("Model file not found: {}", model_path));
        }

        let model = LlamaModel::load_from_file(&self.backend, model_path)?;

        // Create context
        let ctx_params = LlamaContextParams::default();
        let context = model.new_context(&self.backend, &ctx_params)?;

        self.model = Some(model);
        self.context = Some(context);
        self.model_path = Some(model_path.to_string());

        log::info!("Loaded LLM model: {}", model_path);
        Ok(())
    }

    pub fn is_loaded(&self) -> bool {
        self.model.is_some() && self.context.is_some()
    }

    pub async fn generate_response(&mut self, prompt: &str, max_tokens: usize) -> Result<String> {
        if !self.is_loaded() {
            return Err(anyhow::anyhow!("Model not loaded"));
        }

        let context = self.context.as_mut().unwrap();

        // Tokenize the prompt
        let tokens = context.tokenize(prompt, true)?;

        // Evaluate the prompt
        context.eval(&tokens, 0)?;

        let mut response = String::new();
        let mut generated_tokens = 0;

        // Generate response tokens
        while generated_tokens < max_tokens {
            let logits = context.get_logits();
            let candidates = LlamaTokenDataArray::from_iter(
                logits.iter().enumerate().map(|(i, &logit)| {
                    LlamaTokenData {
                        id: i as u32,
                        logit,
                        p: 0.0,
                    }
                }),
                false,
            );

            // Sample next token (simple greedy sampling for now)
            let next_token = context.sample_token_greedy(&candidates);

            // Check for end of generation
            if context.token_is_eog(next_token) {
                break;
            }

            // Convert token to text
            let token_str = context.token_to_str(next_token)?;
            response.push_str(&token_str);

            // Evaluate the new token
            context.eval(&[next_token], context.n_ctx() as usize)?;

            generated_tokens += 1;
        }

        Ok(response.trim().to_string())
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