//! Tauri commands for file system operations.

use crate::file_system::{
    ChunkNextResult, SessionStartResult, list_directory_end as ops_list_directory_end,
    list_directory_next as ops_list_directory_next, list_directory_start as ops_list_directory_start,
};
use std::path::PathBuf;

/// Checks if a path exists.
///
/// # Arguments
/// * `path` - The path to check. Supports tilde expansion (~).
///
/// # Returns
/// True if the path exists.
#[tauri::command]
pub fn path_exists(path: String) -> bool {
    let expanded_path = expand_tilde(&path);
    let path_buf = PathBuf::from(expanded_path);
    path_buf.exists()
}

// ============================================================================
// Cursor-based pagination API
// ============================================================================

/// Starts a new paginated directory listing session.
///
/// Reads the directory once, caches it, and returns the first chunk.
/// Use `list_directory_next_chunk` to get subsequent chunks.
/// Call `list_directory_end_session` when done.
///
/// # Arguments
/// * `path` - The directory path to list. Supports tilde expansion (~).
/// * `chunk_size` - Number of entries in the first chunk.
#[tauri::command]
pub fn list_directory_start_session(path: String, chunk_size: usize) -> Result<SessionStartResult, String> {
    let expanded_path = expand_tilde(&path);
    let path_buf = PathBuf::from(&expanded_path);
    ops_list_directory_start(&path_buf, chunk_size)
        .map_err(|e| format!("Failed to start directory listing '{}': {}", path, e))
}

/// Gets the next chunk of entries from a cached session.
///
/// # Arguments
/// * `session_id` - The session ID from `list_directory_start_session`.
/// * `chunk_size` - Number of entries to return.
#[tauri::command]
pub fn list_directory_next_chunk(session_id: String, chunk_size: usize) -> Result<ChunkNextResult, String> {
    ops_list_directory_next(&session_id, chunk_size)
}

/// Ends a directory listing session and cleans up the cache.
///
/// # Arguments
/// * `session_id` - The session ID to clean up.
#[tauri::command]
pub fn list_directory_end_session(session_id: String) {
    ops_list_directory_end(&session_id);
}

/// Expands tilde (~) to the user's home directory.
fn expand_tilde(path: &str) -> String {
    if (path.starts_with("~/") || path == "~")
        && let Some(home) = dirs::home_dir()
    {
        return path.replacen("~", &home.to_string_lossy(), 1);
    }
    path.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_expand_tilde() {
        let expanded = expand_tilde("~/Documents");
        assert!(expanded.starts_with('/'));
        assert!(expanded.contains("Documents"));
        assert!(!expanded.contains('~'));
    }

    #[test]
    fn test_expand_tilde_alone() {
        let expanded = expand_tilde("~");
        assert!(expanded.starts_with('/'));
        assert!(!expanded.contains('~'));
    }

    #[test]
    fn test_no_tilde() {
        let path = "/usr/local/bin";
        assert_eq!(expand_tilde(path), path);
    }
}
