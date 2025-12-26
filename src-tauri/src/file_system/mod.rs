//! File system module - operations, watchers, and providers.

#[cfg(test)]
mod mock_provider;
mod operations;
mod provider;
mod real_provider;
mod watcher;

// Re-export public types
#[cfg(test)]
pub use mock_provider::MockFileSystemProvider;
pub use operations::FileEntry;
pub use provider::FileSystemProvider;
pub use real_provider::RealFileSystemProvider;

#[cfg(test)]
mod operations_test;

#[cfg(test)]
mod watcher_test;

#[cfg(test)]
mod mock_provider_test;
