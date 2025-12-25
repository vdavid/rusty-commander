//! File system operations: read, list, copy, move, delete.

#![allow(dead_code)] // Boilerplate for future use

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// Represents a file or directory entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: Option<u64>,
    pub modified_at: Option<u64>,
}

/// Lists the contents of a directory.
///
/// # Arguments
/// * `path` - The directory path to list
///
/// # Returns
/// A vector of FileEntry representing the directory contents
pub fn list_directory(path: &Path) -> Result<Vec<FileEntry>, std::io::Error> {
    let mut entries = Vec::new();

    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let metadata = entry.metadata()?;
        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs());

        entries.push(FileEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_directory: metadata.is_dir(),
            size: if metadata.is_file() { Some(metadata.len()) } else { None },
            modified_at: modified,
        });
    }

    Ok(entries)
}
