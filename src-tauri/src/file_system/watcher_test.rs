//! Tests for file system watcher

use super::watcher::create_watcher;
use std::fs;
use std::time::Duration;

#[test]
fn test_watcher_creation() {
    let temp_dir = std::env::temp_dir();
    let result = create_watcher(&temp_dir);
    assert!(result.is_ok());
}

#[test]
fn test_watcher_detects_file_creation() {
    let temp_dir = std::env::temp_dir().join("rusty_commander_test");
    fs::create_dir_all(&temp_dir).unwrap();

    let (watcher, rx) = create_watcher(&temp_dir).unwrap();

    // Create a test file
    let test_file = temp_dir.join("test_file.txt");
    fs::write(&test_file, "test content").unwrap();

    // Wait for event with timeout
    let event = rx.recv_timeout(Duration::from_secs(2));

    // Cleanup
    let _ = fs::remove_file(&test_file);
    let _ = fs::remove_dir(&temp_dir);
    drop(watcher);

    assert!(event.is_ok());
}
