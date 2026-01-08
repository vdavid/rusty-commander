//! Trial period tracking.

use crate::licensing::verification::get_license_info;
use serde::{Deserialize, Serialize};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri_plugin_store::StoreExt;

const TRIAL_DAYS: u64 = 14;
const STORE_KEY_FIRST_RUN: &str = "first_run_timestamp";

/// Current status of the application license/trial.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum AppStatus {
    /// User has a valid license.
    Licensed { email: String },
    /// User is in the trial period.
    Trial(TrialInfo),
    /// Trial has expired, license required.
    TrialExpired,
}

/// Information about the trial period.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrialInfo {
    pub days_remaining: u64,
    pub days_used: u64,
    pub total_days: u64,
}

/// Get the current application status (licensed, trial, or expired).
pub fn get_app_status(app: &tauri::AppHandle) -> AppStatus {
    // Check for valid license first
    if let Some(license) = get_license_info(app) {
        return AppStatus::Licensed { email: license.email };
    }

    // Check trial status
    let store = app.store("license.json").expect("Failed to open store");

    let first_run = match store.get(STORE_KEY_FIRST_RUN) {
        Some(value) => value.as_u64().unwrap_or_else(|| {
            let now = current_timestamp();
            store.set(STORE_KEY_FIRST_RUN, serde_json::json!(now));
            now
        }),
        None => {
            let now = current_timestamp();
            store.set(STORE_KEY_FIRST_RUN, serde_json::json!(now));
            now
        }
    };

    let now = current_timestamp();
    let elapsed_secs = now.saturating_sub(first_run);
    let days_used = elapsed_secs / 86400;

    if days_used < TRIAL_DAYS {
        AppStatus::Trial(TrialInfo {
            days_remaining: TRIAL_DAYS - days_used,
            days_used,
            total_days: TRIAL_DAYS,
        })
    } else {
        AppStatus::TrialExpired
    }
}

/// Reset the trial (for testing only, should be removed in production).
#[cfg(debug_assertions)]
pub fn reset_trial(app: &tauri::AppHandle) {
    let store = app.store("license.json").expect("Failed to open store");
    store.delete(STORE_KEY_FIRST_RUN);
    store.delete("license_key");
}

#[cfg(not(debug_assertions))]
pub fn reset_trial(_app: &tauri::AppHandle) {
    // No-op in release builds
}

fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_secs()
}
