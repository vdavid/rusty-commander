//! File system watcher using the notify crate.
//! Provides cross-platform file system event watching (FSEvents on macOS, inotify on Linux).

#![allow(dead_code)] // Boilerplate for future use

use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::mpsc::{Receiver, channel};

/// Creates a new file system watcher that monitors the given path.
///
/// # Arguments
/// * `path` - The path to watch for changes
///
/// # Returns
/// A tuple of (watcher, receiver) where receiver yields file system events
pub fn create_watcher(
    path: &Path,
) -> Result<(RecommendedWatcher, Receiver<Result<Event, notify::Error>>), notify::Error> {
    let (tx, rx) = channel();

    let mut watcher = RecommendedWatcher::new(
        move |res| {
            let _ = tx.send(res);
        },
        Config::default(),
    )?;

    watcher.watch(path, RecursiveMode::NonRecursive)?;

    Ok((watcher, rx))
}
