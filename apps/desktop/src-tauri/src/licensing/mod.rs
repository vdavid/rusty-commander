//! License verification and trial management.
//!
//! Uses Ed25519 signatures for offline license validation.
//! The public key is embedded at compile time.

mod trial;
mod verification;

pub use trial::{AppStatus, TrialInfo, get_app_status, reset_trial};
pub use verification::{LicenseInfo, activate_license, get_license_info};

use serde::{Deserialize, Serialize};

/// License data encoded in the license key.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseData {
    pub email: String,
    pub transaction_id: String,
    pub issued_at: String,
}
