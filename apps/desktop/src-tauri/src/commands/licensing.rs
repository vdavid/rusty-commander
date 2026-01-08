//! Tauri commands for licensing.

use crate::licensing;

/// Get the current app status (licensed, trial, or expired).
#[tauri::command]
pub fn get_license_status(app: tauri::AppHandle) -> licensing::AppStatus {
    licensing::get_app_status(&app)
}

/// Activate a license key.
#[tauri::command]
pub fn activate_license(app: tauri::AppHandle, license_key: String) -> Result<licensing::LicenseInfo, String> {
    licensing::activate_license(&app, &license_key)
}

/// Get information about the current license (if any).
#[tauri::command]
pub fn get_license_info(app: tauri::AppHandle) -> Option<licensing::LicenseInfo> {
    licensing::get_license_info(&app)
}

/// Reset the trial (debug builds only).
#[tauri::command]
pub fn reset_trial(app: tauri::AppHandle) {
    licensing::reset_trial(&app);
}
