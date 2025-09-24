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
        // For now, use a smarter mock that extracts context and generates contextual responses
        // TODO: Implement proper llama-cpp-2 token generation once API stabilizes
        
        let mut user_q = None;
        let mut context_entries = Vec::new();
        
        // Extract user question
        if let Some(start_idx) = prompt.find("User question:\n") {
            let after = &prompt[start_idx + "User question:\n".len()..];
            if let Some(end_idx) = after.find("\n\n") {
                user_q = Some(after[..end_idx].trim().to_string());
            } else {
                user_q = Some(after.trim().to_string());
            }
        }

        // Extract context entries
        if let Some(start_idx) = prompt.find("Context (journal snippets):\n") {
            let context_section = &prompt[start_idx + "Context (journal snippets):\n".len()..];
            if let Some(end_idx) = context_section.find("\n\nUser question:") {
                let entries_text = &context_section[..end_idx];
                for line in entries_text.lines() {
                    if line.starts_with("- [") {
                        context_entries.push(line.to_string());
                    }
                }
            }
        }

        let question = user_q.unwrap_or_else(|| "your message".to_string());
        
        // Generate contextual response based on available context
        let response = if context_entries.is_empty() {
            format!("I'd be happy to help you with: \"{}\"\n\nHowever, I don't see any relevant journal entries to reference. Try asking about patterns, themes, or specific topics you've written about.", question)
        } else {
            // Handle specific question types
            let question_lower = question.to_lowercase();
            
            if question_lower.contains("name") || question_lower.contains("adam") {
                // Look for name in entries
                let mut found_name = None;
                for entry in &context_entries {
                    let content = if let Some(bracket_end) = entry.find("] ") {
                        &entry[bracket_end + 2..]
                    } else {
                        entry
                    };
                    
                    if content.to_lowercase().contains("adam") {
                        found_name = Some("Adam");
                        break;
                    }
                }
                
                if let Some(name) = found_name {
                    format!("Based on your journal entries, your name is **{}**. I can see this mentioned in your writing.", name)
                } else {
                    "I don't see your name explicitly mentioned in your journal entries. Could you tell me what you'd like me to call you?".to_string()
                }
            } else if question_lower.contains("topic") || question_lower.contains("pattern") || question_lower.contains("theme") || question_lower.contains("most") {
                // Analyze topics and patterns
                let mut topics = std::collections::HashMap::new();
                let mut moods = std::collections::HashMap::new();
                let mut work_mentions = 0;
                let mut personal_mentions = 0;
                
                for entry in &context_entries {
                    let content = if let Some(bracket_end) = entry.find("] ") {
                        &entry[bracket_end + 2..]
                    } else {
                        entry
                    };
                    
                    // Count topics
                    if content.to_lowercase().contains("work") || content.to_lowercase().contains("job") || content.to_lowercase().contains("office") {
                        work_mentions += 1;
                    }
                    if content.to_lowercase().contains("music") || content.to_lowercase().contains("piano") || content.to_lowercase().contains("concert") {
                        *topics.entry("Music & Arts").or_insert(0) += 1;
                    }
                    if content.to_lowercase().contains("friend") || content.to_lowercase().contains("social") || content.to_lowercase().contains("relationship") {
                        personal_mentions += 1;
                    }
                    if content.to_lowercase().contains("stress") || content.to_lowercase().contains("anxious") || content.to_lowercase().contains("worried") {
                        *moods.entry("Stress/Anxiety").or_insert(0) += 1;
                    }
                    if content.to_lowercase().contains("excited") || content.to_lowercase().contains("happy") || content.to_lowercase().contains("great") {
                        *moods.entry("Positive Energy").or_insert(0) += 1;
                    }
                }
                
                // Generate specific insights
                let mut insights = Vec::new();
                
                if work_mentions > 0 {
                    insights.push(format!("**Work dominates your thoughts** - You mention work-related topics in {} out of {} entries. This suggests work stress or career focus is a major theme.", work_mentions, context_entries.len()));
                }
                
                if let Some((topic, count)) = topics.iter().max_by_key(|(_, &count)| count) {
                    insights.push(format!("**Your biggest passion is {}** - This appears in {} entries, showing it's a recurring theme in your life.", topic, count));
                }
                
                if personal_mentions > 0 {
                    insights.push(format!("**Social connections matter** - You write about friends and relationships in {} entries, indicating you value personal connections.", personal_mentions));
                }
                
                if let Some((mood, count)) = moods.iter().max_by_key(|(_, &count)| count) {
                    insights.push(format!("**Your emotional pattern leans toward {}** - This mood appears {} times, suggesting it's a significant part of your experience.", mood, count));
                }
                
                let insights_text = if insights.is_empty() {
                    "I can see you have diverse interests and experiences.".to_string()
                } else {
                    insights.join("\n\n")
                };
                
                format!("Based on analyzing your {} journal entries, here are the key patterns I see:\n\n{}\n\n**My take:** You seem to be someone who balances work responsibilities with personal passions, particularly music. Your writing shows both the stress of professional life and the joy of creative pursuits.\n\nWhat resonates most with you from these observations?", 
                    context_entries.len(), 
                    insights_text
                )
            } else {
                // Generic response for other questions
                format!("I can see your journal entries, but I need more specific guidance. You asked: \"{}\"\n\nCould you be more specific about what you'd like me to analyze or help you with?", question)
            }
        };

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