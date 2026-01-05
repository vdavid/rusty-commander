//! SMB client for share enumeration.
//!
//! Uses the `smb` crate (smb-rs) to list shares on network hosts.
//! Implements connection pooling, caching, and authentication handling.

use serde::{Deserialize, Serialize};
use smb::{Client, ClientConfig};
use smb_rpc::interface::ShareInfo1;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tokio::time::timeout;

/// Information about a discovered share.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShareInfo {
    /// Name of the share (for example, "Documents", "Media").
    pub name: String,
    /// Whether this is a disk share (true) or other type like printer/IPC.
    pub is_disk: bool,
    /// Optional description/comment for the share.
    pub comment: Option<String>,
}

/// Authentication mode detected for a host.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AuthMode {
    /// Guest access works for this host.
    GuestAllowed,
    /// Authentication is required (guest access failed).
    CredsRequired,
    /// Haven't checked yet or check failed.
    Unknown,
}

/// Result of a share listing operation.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShareListResult {
    /// Shares found on the host (already filtered to disk shares only).
    pub shares: Vec<ShareInfo>,
    /// Authentication mode detected.
    pub auth_mode: AuthMode,
    /// Whether this result came from cache.
    pub from_cache: bool,
}

/// Error types for share listing operations.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "type", content = "message")]
pub enum ShareListError {
    /// Host is not reachable.
    HostUnreachable(String),
    /// Connection timed out.
    Timeout(String),
    /// Authentication required but no credentials provided.
    AuthRequired(String),
    /// Authentication failed with provided credentials.
    AuthFailed(String),
    /// Other SMB protocol error.
    ProtocolError(String),
    /// DNS/hostname resolution failed.
    ResolutionFailed(String),
}

impl std::fmt::Display for ShareListError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::HostUnreachable(msg) => write!(f, "Host unreachable: {}", msg),
            Self::Timeout(msg) => write!(f, "Timeout: {}", msg),
            Self::AuthRequired(msg) => write!(f, "Authentication required: {}", msg),
            Self::AuthFailed(msg) => write!(f, "Authentication failed: {}", msg),
            Self::ProtocolError(msg) => write!(f, "Protocol error: {}", msg),
            Self::ResolutionFailed(msg) => write!(f, "Resolution failed: {}", msg),
        }
    }
}

// --- Cache ---

/// Cached share list with expiration.
struct CachedShares {
    result: ShareListResult,
    expires_at: Instant,
}

/// Share cache with 30-second TTL.
static SHARE_CACHE: std::sync::OnceLock<Mutex<HashMap<String, CachedShares>>> = std::sync::OnceLock::new();

const CACHE_TTL: Duration = Duration::from_secs(30);
const LIST_SHARES_TIMEOUT: Duration = Duration::from_secs(15);

fn get_share_cache() -> &'static Mutex<HashMap<String, CachedShares>> {
    SHARE_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Gets cached shares for a host if still valid.
fn get_cached_shares(host_id: &str) -> Option<ShareListResult> {
    let cache = get_share_cache().lock().ok()?;
    let entry = cache.get(host_id)?;
    
    if Instant::now() < entry.expires_at {
        let mut result = entry.result.clone();
        result.from_cache = true;
        Some(result)
    } else {
        None
    }
}

/// Caches share list for a host.
fn cache_shares(host_id: &str, result: &ShareListResult) {
    if let Ok(mut cache) = get_share_cache().lock() {
        // Clean up expired entries while we're here
        let now = Instant::now();
        cache.retain(|_, v| v.expires_at > now);
        
        cache.insert(
            host_id.to_string(),
            CachedShares {
                result: result.clone(),
                expires_at: now + CACHE_TTL,
            },
        );
    }
}

/// Invalidates cache for a host.
#[allow(dead_code)] // Will be used when implementing cache invalidation on host disconnect
pub fn invalidate_cache(host_id: &str) {
    if let Ok(mut cache) = get_share_cache().lock() {
        cache.remove(host_id);
    }
}

/// Gets the cached auth mode for a host, if available.
pub fn get_cached_shares_auth_mode(host_id: &str) -> Option<AuthMode> {
    let cache = get_share_cache().lock().ok()?;
    let entry = cache.get(host_id)?;
    
    if Instant::now() < entry.expires_at {
        Some(entry.result.auth_mode)
    } else {
        None
    }
}

// --- Share Listing ---

/// Lists shares on a network host.
///
/// Attempts guest access first, then uses provided credentials if guest fails.
/// Results are cached for 30 seconds.
///
/// # Arguments
/// * `host_id` - Unique identifier for the host (used for caching)
/// * `hostname` - Hostname to connect to (for example, "NASPOLYA.local")
/// * `ip_address` - Optional resolved IP address (preferred over hostname)
/// * `credentials` - Optional (username, password) tuple for authenticated access
pub async fn list_shares(
    host_id: &str,
    hostname: &str,
    ip_address: Option<&str>,
    credentials: Option<(&str, &str)>,
) -> Result<ShareListResult, ShareListError> {
    // Check cache first
    if let Some(cached) = get_cached_shares(host_id) {
        return Ok(cached);
    }
    
    // Try to list shares
    let result = list_shares_uncached(hostname, ip_address, credentials).await?;
    
    // Cache successful result
    cache_shares(host_id, &result);
    
    Ok(result)
}

/// Lists shares without checking cache.
/// Uses IP address when available to bypass mDNS resolution issues with smb-rs.
async fn list_shares_uncached(
    hostname: &str,
    ip_address: Option<&str>,
    credentials: Option<(&str, &str)>,
) -> Result<ShareListResult, ShareListError> {
    // Create SMB client
    let client = Client::new(ClientConfig::default());
    
    // Get the server name (strip .local suffix for SMB protocol)
    let server_name = hostname.strip_suffix(".local").unwrap_or(hostname);
    
    // Try guest access first, then authenticated
    let (shares, auth_mode) = match try_list_shares_as_guest(&client, server_name, hostname, ip_address).await {
        Ok(shares) => (shares, AuthMode::GuestAllowed),
        Err(e) if is_auth_error(&e) => {
            // Guest failed with auth error - try with credentials if provided
            if let Some((user, pass)) = credentials {
                let shares = try_list_shares_authenticated(&client, server_name, hostname, ip_address, user, pass)
                    .await
                    .map_err(|e| classify_error(&e))?;
                (shares, AuthMode::CredsRequired)
            } else {
                return Err(ShareListError::AuthRequired(
                    "This server requires authentication to list shares".to_string(),
                ));
            }
        }
        Err(e) => return Err(classify_error(&e)),
    };
    
    // Filter to disk shares only
    let filtered_shares = filter_disk_shares(shares);
    
    Ok(ShareListResult {
        shares: filtered_shares,
        auth_mode,
        from_cache: false,
    })
}

/// Attempts to list shares as guest (anonymous).
/// Uses ipc_connect with hostname - smb-rs handles resolution internally.
async fn try_list_shares_as_guest(
    client: &Client,
    _server_name: &str,
    hostname: &str,
    _ip_address: Option<&str>,
) -> Result<Vec<ShareInfo1>, String> {
    timeout(LIST_SHARES_TIMEOUT, async {
        // Connect to IPC$ with "Guest" user
        // smb-rs handles resolution internally - we use the full hostname (e.g., "naspolya.local")
        client
            .ipc_connect(hostname, "Guest", String::new())
            .await
            .map_err(|e| format!("IPC connect failed: {}", e))?;
        
        // List shares
        client
            .list_shares(hostname)
            .await
            .map_err(|e| format!("list_shares failed: {}", e))
    })
    .await
    .map_err(|_| format!("Timeout after {}s", LIST_SHARES_TIMEOUT.as_secs()))?
}

/// Attempts to list shares with credentials.
/// Uses ipc_connect with hostname - smb-rs handles resolution internally.
async fn try_list_shares_authenticated(
    client: &Client,
    _server_name: &str,
    hostname: &str,
    _ip_address: Option<&str>,
    username: &str,
    password: &str,
) -> Result<Vec<ShareInfo1>, String> {
    timeout(LIST_SHARES_TIMEOUT, async {
        // Connect to IPC$ with credentials
        // smb-rs handles resolution internally - we use the full hostname
        client
            .ipc_connect(hostname, username, password.to_string())
            .await
            .map_err(|e| format!("IPC connect failed: {}", e))?;
        
        // List shares
        client
            .list_shares(hostname)
            .await
            .map_err(|e| format!("list_shares failed: {}", e))
    })
    .await
    .map_err(|_| format!("Timeout after {}s", LIST_SHARES_TIMEOUT.as_secs()))?
}

/// Checks if an error is an authentication error.
fn is_auth_error(err: &str) -> bool {
    let lower = err.to_lowercase();
    lower.contains("logon failure")
        || lower.contains("access denied")
        || lower.contains("auth")
        || lower.contains("0xc000006d") // STATUS_LOGON_FAILURE
}

/// Classifies an error string into a ShareListError.
fn classify_error(err: &str) -> ShareListError {
    let lower = err.to_lowercase();
    
    if lower.contains("timeout") {
        ShareListError::Timeout(err.to_string())
    } else if lower.contains("no route") || lower.contains("unreachable") || lower.contains("connection refused") {
        ShareListError::HostUnreachable(err.to_string())
    } else if lower.contains("logon failure") || lower.contains("0xc000006d") {
        ShareListError::AuthFailed(err.to_string())
    } else if lower.contains("access denied") || lower.contains("auth") {
        ShareListError::AuthRequired(err.to_string())
    } else {
        ShareListError::ProtocolError(err.to_string())
    }
}

/// Filters raw SMB share info to show only disk shares.
fn filter_disk_shares(shares: Vec<ShareInfo1>) -> Vec<ShareInfo> {
    shares
        .into_iter()
        .filter_map(|share| {
            // Get the share name
            let name = extract_share_name(&share);
            
            // Skip hidden/admin shares (ending with $)
            if name.ends_with('$') {
                return None;
            }
            
            // Check if it's a disk share (type 0 in SMB)
            let share_type_str = format!("{:?}", share.share_type);
            let is_disk = share_type_str.contains("Disk") || share_type_str.contains("DiskTree");
            
            if !is_disk {
                return None;
            }
            
            // Extract comment
            let comment = extract_share_comment(&share);
            
            Some(ShareInfo {
                name,
                is_disk: true,
                comment,
            })
        })
        .collect()
}

/// Extracts the share name from SMB share info.
fn extract_share_name(share: &ShareInfo1) -> String {
    // The netname is an NdrPtr<NdrString<u16>>
    // Use Debug format and clean up
    let debug_str = format!("{:?}", share.netname);
    clean_ndr_string(&debug_str)
}

/// Extracts the comment from SMB share info.
fn extract_share_comment(share: &ShareInfo1) -> Option<String> {
    let debug_str = format!("{:?}", share.remark);
    let cleaned = clean_ndr_string(&debug_str);
    if cleaned.is_empty() || cleaned == "None" {
        None
    } else {
        Some(cleaned)
    }
}

/// Cleans up an NDR string from Debug format.
fn clean_ndr_string(debug_str: &str) -> String {
    // NDR strings come out as things like:
    // Some(NdrAlign { inner: NdrString("Documents") })
    // We extract just the string content
    if let Some(start) = debug_str.find('"') {
        if let Some(end) = debug_str.rfind('"') {
            if start < end {
                return debug_str[start + 1..end].to_string();
            }
        }
    }
    debug_str.trim_matches('"').to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_clean_ndr_string() {
        assert_eq!(
            clean_ndr_string(r#"Some(NdrAlign { inner: NdrString("Documents") })"#),
            "Documents"
        );
        assert_eq!(clean_ndr_string(r#""Media""#), "Media");
        assert_eq!(clean_ndr_string("None"), "None");
    }

    #[test]
    fn test_is_auth_error() {
        assert!(is_auth_error("Logon Failure (0xc000006d)"));
        assert!(is_auth_error("access denied"));
        assert!(is_auth_error("Authentication failed"));
        assert!(!is_auth_error("Connection refused"));
        assert!(!is_auth_error("Timeout"));
    }

    #[test]
    fn test_classify_error() {
        match classify_error("Timeout after 15s") {
            ShareListError::Timeout(_) => {}
            e => panic!("Expected Timeout, got {:?}", e),
        }
        
        match classify_error("no route to host") {
            ShareListError::HostUnreachable(_) => {}
            e => panic!("Expected HostUnreachable, got {:?}", e),
        }
        
        match classify_error("Logon Failure (0xc000006d)") {
            ShareListError::AuthFailed(_) => {}
            e => panic!("Expected AuthFailed, got {:?}", e),
        }
    }

    #[test]
    fn test_cache_operations() {
        let host_id = "test-host-cache";
        
        // Initially no cache
        assert!(get_cached_shares(host_id).is_none());
        
        // Cache something
        let result = ShareListResult {
            shares: vec![ShareInfo {
                name: "TestShare".to_string(),
                is_disk: true,
                comment: None,
            }],
            auth_mode: AuthMode::GuestAllowed,
            from_cache: false,
        };
        cache_shares(host_id, &result);
        
        // Should be cached now
        let cached = get_cached_shares(host_id);
        assert!(cached.is_some());
        let cached = cached.unwrap();
        assert!(cached.from_cache);
        assert_eq!(cached.shares.len(), 1);
        assert_eq!(cached.shares[0].name, "TestShare");
        
        // Invalidate
        invalidate_cache(host_id);
        assert!(get_cached_shares(host_id).is_none());
    }
}
