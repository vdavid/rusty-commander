//! Real file system provider implementation.

use super::{operations, provider::FileSystemProvider, FileEntry};
use std::path::Path;

/// Real file system provider that accesses the actual file system.
pub struct RealFileSystemProvider;

impl FileSystemProvider for RealFileSystemProvider {
    fn list_directory(&self, path: &Path) -> Result<Vec<FileEntry>, std::io::Error> {
        operations::list_directory(path)
    }
}
