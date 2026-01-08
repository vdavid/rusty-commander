//! License key verification using Ed25519 signatures.

use crate::licensing::LicenseData;
use base64::{Engine, engine::general_purpose::STANDARD as BASE64};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use tauri_plugin_store::StoreExt;

// Ed25519 public key (32 bytes, hex-encoded).
// Generate this with: cd apps/license-server && pnpm run generate-keys
// Then copy the public key here.
const PUBLIC_KEY_HEX: &str = "0000000000000000000000000000000000000000000000000000000000000000";

const STORE_KEY_LICENSE: &str = "license_key";

/// Information about the current license.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseInfo {
    pub email: String,
    pub transaction_id: String,
    pub issued_at: String,
}

/// Activate a license key. Returns the license info if valid.
pub fn activate_license(app: &tauri::AppHandle, license_key: &str) -> Result<LicenseInfo, String> {
    // Validate the license key
    let data = validate_license_key(license_key)?;

    // Store the license key
    let store = app
        .store("license.json")
        .map_err(|e| format!("Failed to open store: {}", e))?;

    store.set(STORE_KEY_LICENSE, serde_json::json!(license_key));

    Ok(LicenseInfo {
        email: data.email,
        transaction_id: data.transaction_id,
        issued_at: data.issued_at,
    })
}

/// Get stored license info, if any.
pub fn get_license_info(app: &tauri::AppHandle) -> Option<LicenseInfo> {
    let store = app.store("license.json").ok()?;
    let license_key = store.get(STORE_KEY_LICENSE)?.as_str()?.to_string();

    validate_license_key(&license_key).ok().map(|data| LicenseInfo {
        email: data.email,
        transaction_id: data.transaction_id,
        issued_at: data.issued_at,
    })
}

/// Validate a license key and extract the data.
fn validate_license_key(license_key: &str) -> Result<LicenseData, String> {
    // License format: base64(payload).base64(signature)
    let parts: Vec<&str> = license_key.trim().split('.').collect();
    if parts.len() != 2 {
        return Err("Invalid license key format".to_string());
    }

    let payload_bytes = BASE64
        .decode(parts[0])
        .map_err(|_| "Invalid license key: bad payload encoding")?;

    let signature_bytes = BASE64
        .decode(parts[1])
        .map_err(|_| "Invalid license key: bad signature encoding")?;

    // Parse public key
    let public_key_bytes = hex_decode(PUBLIC_KEY_HEX).map_err(|_| "Internal error: invalid public key")?;

    let public_key = VerifyingKey::from_bytes(
        &public_key_bytes
            .try_into()
            .map_err(|_| "Internal error: invalid public key length")?,
    )
    .map_err(|_| "Internal error: invalid public key")?;

    // Parse signature
    let signature = Signature::from_slice(&signature_bytes).map_err(|_| "Invalid license key: bad signature")?;

    // Verify signature
    public_key
        .verify(&payload_bytes, &signature)
        .map_err(|_| "Invalid license key: signature verification failed")?;

    // Parse payload
    let data: LicenseData =
        serde_json::from_slice(&payload_bytes).map_err(|_| "Invalid license key: bad payload data")?;

    Ok(data)
}

fn hex_decode(hex: &str) -> Result<Vec<u8>, ()> {
    if !hex.len().is_multiple_of(2) {
        return Err(());
    }
    (0..hex.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).map_err(|_| ()))
        .collect()
}
