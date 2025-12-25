//! Tests for file system operations

use super::operations::list_directory;
use std::fs;

#[test]
fn test_list_directory() {
    let temp_dir = std::env::temp_dir();
    let result = list_directory(&temp_dir);
    assert!(result.is_ok());
}

#[test]
fn test_list_directory_entries_have_names() {
    let temp_dir = std::env::temp_dir().join("rusty_commander_ops_test");
    fs::create_dir_all(&temp_dir).unwrap();

    let test_file = temp_dir.join("test_file.txt");
    fs::write(&test_file, "content").unwrap();

    let entries = list_directory(&temp_dir).unwrap();

    // Cleanup
    let _ = fs::remove_file(&test_file);
    let _ = fs::remove_dir(&temp_dir);

    assert!(!entries.is_empty());
    assert!(entries.iter().any(|e| e.name == "test_file.txt"));
}
