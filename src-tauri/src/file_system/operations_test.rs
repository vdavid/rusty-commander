//! Tests for file system operations

use super::provider::FileSystemProvider;
use super::real_provider::RealFileSystemProvider;
use std::fs;

#[test]
fn test_list_directory() {
    let provider = RealFileSystemProvider;
    // Create our own temp directory to avoid permission issues
    let temp_dir = std::env::temp_dir().join("rusty_commander_list_test");
    fs::create_dir_all(&temp_dir).expect("Failed to create test directory");

    let result = provider.list_directory(&temp_dir);

    // Cleanup
    let _ = fs::remove_dir(&temp_dir);

    assert!(result.is_ok(), "list_directory failed: {:?}", result.err());
}

#[test]
fn test_list_directory_entries_have_names() {
    let provider = RealFileSystemProvider;
    let temp_dir = std::env::temp_dir().join("rusty_commander_ops_test");
    fs::create_dir_all(&temp_dir).unwrap();

    let test_file = temp_dir.join("test_file.txt");
    fs::write(&test_file, "content").unwrap();

    let entries = provider.list_directory(&temp_dir).unwrap();

    // Cleanup
    let _ = fs::remove_file(&test_file);
    let _ = fs::remove_dir(&temp_dir);

    assert!(!entries.is_empty());
    assert!(entries.iter().any(|e| e.name == "test_file.txt"));
}
