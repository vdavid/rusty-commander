//! Tauri commands for file system operations.

use crate::file_system::{FileEntry, FileSystemProvider, RealFileSystemProvider};
use std::path::PathBuf;

/// Lists the contents of a directory.
///
/// # Arguments
/// * `path` - The directory path to list. Supports tilde expansion (~).
///
/// # Returns
/// A vector of FileEntry representing the directory contents, sorted with directories first.
///
/// # Errors
/// Returns an error string if the directory cannot be read (e.g., permission denied, path not found).
#[tauri::command]
pub fn list_directory_contents(path: String) -> Result<Vec<FileEntry>, String> {
    let expanded_path = expand_tilde(&path);
    let path_buf = PathBuf::from(expanded_path);

    let provider = RealFileSystemProvider;
    provider
        .list_directory(&path_buf)
        .map_err(|e| format!("Failed to read directory '{}': {}", path, e))
}

/// Expands tilde (~) to the user's home directory.
fn expand_tilde(path: &str) -> String {
    if path.starts_with("~/") || path == "~" {
        if let Some(home) = dirs::home_dir() {
            return path.replacen("~", &home.to_string_lossy(), 1);
        }
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
