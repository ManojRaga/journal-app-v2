use crate::db::{Database, JournalEntry};
use crate::llm::{LlamaChat, build_journal_prompt};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetrievedDocument {
    pub entry_id: String,
    pub title: String,
    pub content: String,
    pub date: String,
    pub score: f32,
    pub chunk_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RagResponse {
    pub answer: String,
    pub sources: Vec<RetrievedDocument>,
    pub query: String,
}

pub struct RagPipeline {
    db: Database,
    llm: LlamaChat,
}

impl RagPipeline {
    pub fn new(db: Database, llm: LlamaChat) -> Self {
        RagPipeline { db, llm }
    }

    pub async fn query(&mut self, user_id: &str, question: &str, max_results: usize) -> Result<RagResponse> {
        // Step 1: Retrieve relevant documents using hybrid search
        let retrieved_docs = self.hybrid_retrieve(user_id, question, max_results).await?;

        // Step 2: Build context from retrieved documents
        let context_entries: Vec<(String, String, String)> = retrieved_docs
            .iter()
            .map(|doc| (doc.date.clone(), doc.title.clone(), doc.content.clone()))
            .collect();

        // Step 3: Generate response using LLM
        let prompt = build_journal_prompt(question, &context_entries);
        let answer = self.llm.generate_response(&prompt, 512).await?;

        Ok(RagResponse {
            answer,
            sources: retrieved_docs,
            query: question.to_string(),
        })
    }

    async fn hybrid_retrieve(&self, user_id: &str, query: &str, max_results: usize) -> Result<Vec<RetrievedDocument>> {
        // Hybrid search: combine keyword search (FTS5) with semantic search (embeddings)

        // Step 1: Keyword search using FTS5
        let keyword_results = self.keyword_search(user_id, query, max_results * 2).await?;

        // Step 2: Semantic search using embeddings (placeholder for now)
        let semantic_results = self.semantic_search(user_id, query, max_results * 2).await?;

        // Step 3: Combine and rerank results
        let combined_results = self.combine_and_rerank(keyword_results, semantic_results, max_results)?;

        Ok(combined_results)
    }

    async fn keyword_search(&self, user_id: &str, query: &str, limit: usize) -> Result<Vec<RetrievedDocument>> {
        let search_request = crate::db::SearchRequest {
            query: query.to_string(),
            limit: Some(limit as i32),
        };

        let entries = self.db.search_entries(user_id, search_request).await?;

        let mut results = Vec::new();
        for entry in entries {
            results.push(RetrievedDocument {
                entry_id: entry.id.clone(),
                title: entry.title.clone(),
                content: entry.body.clone(),
                date: entry.created_at.format("%Y-%m-%d").to_string(),
                score: 1.0, // FTS5 doesn't provide scores directly
                chunk_id: None,
            });
        }

        Ok(results)
    }

    async fn semantic_search(&self, _user_id: &str, _query: &str, _limit: usize) -> Result<Vec<RetrievedDocument>> {
        // Placeholder for semantic search
        // In a full implementation, this would:
        // 1. Generate embedding for the query
        // 2. Search for similar embeddings in the database
        // 3. Return ranked results by cosine similarity

        // For now, return empty results
        Ok(Vec::new())
    }

    fn combine_and_rerank(&self, keyword_results: Vec<RetrievedDocument>, semantic_results: Vec<RetrievedDocument>, max_results: usize) -> Result<Vec<RetrievedDocument>> {
        // Simple combination strategy: prioritize keyword results, then add semantic results
        let mut combined = HashMap::new();

        // Add keyword results with higher weight
        for (i, doc) in keyword_results.iter().enumerate() {
            let score = 1.0 - (i as f32 / keyword_results.len() as f32) * 0.5; // Higher score for earlier results
            combined.insert(doc.entry_id.clone(), (doc.clone(), score));
        }

        // Add semantic results with lower weight if not already present
        for (i, doc) in semantic_results.iter().enumerate() {
            if !combined.contains_key(&doc.entry_id) {
                let score = 0.5 - (i as f32 / semantic_results.len() as f32) * 0.3;
                combined.insert(doc.entry_id.clone(), (doc.clone(), score));
            }
        }

        // Sort by score and take top results
        let mut results: Vec<RetrievedDocument> = combined
            .into_iter()
            .map(|(_, (mut doc, score))| {
                doc.score = score;
                doc
            })
            .collect();

        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());
        results.truncate(max_results);

        Ok(results)
    }

    pub async fn index_entry(&mut self, entry: &JournalEntry) -> Result<()> {
        // Create text chunks for the entry
        let chunks = self.db.create_text_chunks(&entry.id, &entry.user_id, &entry.body).await?;
        let chunk_count = chunks.len();

        // Generate embeddings for each chunk (placeholder)
        for chunk in chunks {
            let _embedding = self.llm.generate_embedding(&chunk.text).await?;
            // TODO: Store embedding in database
            // For now, we'll just log that we would store it
            log::debug!("Generated embedding for chunk {} (length: {})", chunk.id, chunk.text.len());
        }

        log::info!("Indexed entry {} with {} chunks", entry.id, chunk_count);
        Ok(())
    }

    pub async fn delete_entry_index(&self, entry_id: &str) -> Result<()> {
        // Delete chunks and embeddings for the entry
        // This is handled by CASCADE DELETE in the database schema
        log::info!("Deleted index for entry {}", entry_id);
        Ok(())
    }

    // Utility function to extract keywords from a query
    fn extract_keywords(&self, query: &str) -> Vec<String> {
        query
            .to_lowercase()
            .split_whitespace()
            .filter(|word| word.len() > 2) // Filter out very short words
            .map(|word| word.trim_matches(|c: char| !c.is_alphanumeric()))
            .filter(|word| !word.is_empty())
            .map(|word| word.to_string())
            .collect()
    }

    // Calculate text similarity (simple word overlap for now)
    fn calculate_similarity(&self, query: &str, text: &str) -> f32 {
        let query_lower = query.to_lowercase();
        let text_lower = text.to_lowercase();
        let query_words: std::collections::HashSet<&str> = query_lower.split_whitespace().collect();
        let text_words: std::collections::HashSet<&str> = text_lower.split_whitespace().collect();

        let intersection = query_words.intersection(&text_words).count();
        let union = query_words.union(&text_words).count();

        if union == 0 {
            0.0
        } else {
            intersection as f32 / union as f32
        }
    }
}