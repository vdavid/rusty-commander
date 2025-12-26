//! Mock file system provider for testing.

use super::{FileEntry, provider::FileSystemProvider};
use std::path::Path;

/// Mock file system provider with configurable data for testing.
/// Can be used for stress testing with large file counts (e.g., 50k+ files).
pub struct MockFileSystemProvider {
    entries: Vec<FileEntry>,
}

impl MockFileSystemProvider {
    /// Creates a new mock provider with the given entries.
    pub fn new(entries: Vec<FileEntry>) -> Self {
        Self { entries }
    }

    /// Creates a mock provider with a configurable number of test files.
    /// Useful for stress testing with large file counts.
    pub fn with_file_count(count: usize) -> Self {
        let entries = (0..count)
            .map(|i| FileEntry {
                name: format!("file_{:06}.txt", i),
                path: format!("/mock/file_{:06}.txt", i),
                is_directory: i % 10 == 0, // Every 10th entry is a directory
                size: Some(1024 * (i as u64)),
                modified_at: Some(1640000000 + i as u64),
            })
            .collect();
        Self::new(entries)
    }
}

impl FileSystemProvider for MockFileSystemProvider {
    fn list_directory(&self, _path: &Path) -> Result<Vec<FileEntry>, std::io::Error> {
        Ok(self.entries.clone())
    }
}
