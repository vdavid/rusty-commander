//! SMB-RS Validation Spike
//!
//! This is spike 2.0 from the network-smb task list.
//! Tests the `smb` crate against real SMB servers to validate:
//! - Connection to various server types (QNAP NAS, Linux Samba, macOS)
//! - Guest access and authenticated access
//! - Share listing latency
//!
//! Run with:
//!   cargo run --example smb_spike --features smb-spike
//!
//! Or for a specific server only:
//!   SPIKE_SERVERS=NASPOLYA cargo run --example smb_spike --features smb-spike

use smb::{Client, ClientConfig};
use std::env;
use std::net::{SocketAddr, ToSocketAddrs};
use std::time::{Duration, Instant};
use tokio::time::timeout;

/// A server to test against
struct TestServer {
    name: &'static str,
    hostname: &'static str,
    server_type: &'static str,
    // Optional credentials for authenticated access (username, password)
    auth: Option<(&'static str, &'static str)>,
}

/// Results from testing a server
#[derive(Debug)]
struct TestResult {
    server_name: String,
    server_type: String,
    dns_resolved: bool,
    resolved_ip: Option<String>,
    guest_list_shares: Result<ShareListResult, String>,
    auth_list_shares: Option<Result<ShareListResult, String>>,
}

#[derive(Debug)]
struct ShareListResult {
    shares: Vec<ShareDetails>,
    latency_ms: u64,
}

#[derive(Debug)]
struct ShareDetails {
    name: String,
    share_type: String,
    comment: String,
}

const LIST_SHARES_TIMEOUT: Duration = Duration::from_secs(15);

#[tokio::main]
async fn main() {
    println!("═══════════════════════════════════════════════════════════════════");
    println!("                SMB-RS Validation Spike (Task 2.0)");
    println!("═══════════════════════════════════════════════════════════════════\n");

    // Define test servers - UPDATE THESE with your actual server hostnames/IPs!
    // You can override with env vars or edit this list.
    let servers = get_test_servers();

    // Filter by SPIKE_SERVERS env var if set (comma-separated names)
    let filter = env::var("SPIKE_SERVERS").ok();
    let servers: Vec<_> = servers
        .into_iter()
        .filter(|s| match &filter {
            Some(f) => f.split(',').any(|name| name.trim().eq_ignore_ascii_case(s.name)),
            None => true,
        })
        .collect();

    if servers.is_empty() {
        println!("⚠️  No servers to test. Set SPIKE_SERVERS env var or update the code.");
        println!("   Example: SPIKE_SERVERS=NASPOLYA,MacShare");
        return;
    }

    println!("Testing {} server(s):\n", servers.len());

    let mut results = Vec::new();

    for server in &servers {
        println!("───────────────────────────────────────────────────────────────────");
        println!("Testing: {} ({})", server.name, server.server_type);
        println!("───────────────────────────────────────────────────────────────────");

        let result = test_server(server).await;
        print_result(&result);
        results.push(result);

        println!();
    }

    // Print summary
    print_summary(&results);
}

fn get_test_servers() -> Vec<TestServer> {
    // These are example servers - update with your actual network hostnames!
    vec![
        TestServer {
            name: "NASPOLYA",
            hostname: "NASPOLYA.local", // QNAP NAS
            server_type: "QNAP NAS",
            auth: None, // Will try guest first, add ("user", "pass") for authenticated test
        },
        TestServer {
            name: "PI",
            hostname: "PI.local", // Linux Samba (Raspberry Pi)
            server_type: "Linux Samba",
            auth: None,
        },
        TestServer {
            name: "MacShare",
            hostname: "David's M1 MBP.local", // macOS file sharing (curly apostrophe!)
            server_type: "macOS",
            auth: None,
        },
    ]
}

async fn test_server(server: &TestServer) -> TestResult {
    let mut result = TestResult {
        server_name: server.name.to_string(),
        server_type: server.server_type.to_string(),
        dns_resolved: false,
        resolved_ip: None,
        guest_list_shares: Err("Not attempted".to_string()),
        auth_list_shares: None,
    };

    // Step 1: DNS resolution
    print!("  📡 Resolving {}... ", server.hostname);
    match resolve_hostname(server.hostname).await {
        Ok(ip) => {
            println!("✅ {}", ip);
            result.dns_resolved = true;
            result.resolved_ip = Some(ip.to_string());
        }
        Err(e) => {
            println!("❌ {}", e);
            result.guest_list_shares = Err(format!("DNS resolution failed: {}", e));
            return result;
        }
    }

    // Step 2: Try guest access
    print!("  🔓 Guest access (list_shares)... ");
    let resolved_ip = result.resolved_ip.clone().unwrap();
    result.guest_list_shares = test_list_shares(server.hostname, &resolved_ip, None).await;
    match &result.guest_list_shares {
        Ok(r) => {
            println!("✅ {} shares in {}ms", r.shares.len(), r.latency_ms);
        }
        Err(e) => {
            println!("❌ {}", e);
        }
    }

    // Step 3: Try authenticated access (if credentials provided)
    if let Some((user, pass)) = server.auth {
        print!("  🔐 Authenticated access ({})... ", user);
        let auth_result = test_list_shares(server.hostname, &resolved_ip, Some((user, pass))).await;
        match &auth_result {
            Ok(r) => {
                println!("✅ {} shares in {}ms", r.shares.len(), r.latency_ms);
            }
            Err(e) => {
                println!("❌ {}", e);
            }
        }
        result.auth_list_shares = Some(auth_result);
    }

    result
}

async fn resolve_hostname(hostname: &str) -> Result<SocketAddr, String> {
    // Use tokio's spawn_blocking for DNS resolution
    let hostname = hostname.to_string();
    let result = tokio::task::spawn_blocking(move || {
        // Try SMB port 445
        let addr_str = format!("{}:445", hostname);
        addr_str
            .to_socket_addrs()
            .map_err(|e| e.to_string())?
            .next()
            .ok_or_else(|| "No addresses found".to_string())
    })
    .await
    .map_err(|e| format!("Spawn error: {}", e))?;

    result
}

async fn test_list_shares(
    server: &str,
    resolved_ip: &str,
    auth: Option<(&str, &str)>,
) -> Result<ShareListResult, String> {
    let start = Instant::now();

    // Create client
    let client = Client::new(ClientConfig::default());

    // For list_shares, we need the server name (without the .local suffix)
    // Note: Currently unused as ipc_connect uses hostname with .local for resolution
    let _server_name = server
        .strip_suffix(".local")
        .unwrap_or(server);
    
    // Parse the resolved IP address (which includes port 445)
    // Note: Currently unused - for future use with connect_to_address
    let _socket_addr: SocketAddr = resolved_ip.parse()
        .map_err(|e| format!("Invalid socket address: {}", e))?;

    // Try to list shares with timeout
    // Note: We've already resolved the IP to verify reachability, but smb-rs
    // does its own resolution internally - this is the trade-off of a high-level API
    let list_result = timeout(LIST_SHARES_TIMEOUT, async {
        // Connect to IPC$ for RPC operations (list_shares uses SRVSVC)
        // Use the full server name - smb-rs will resolve it
        // Note: smb-rs SSPI layer rejects empty username, so we use "Guest" for anonymous
        let (user, pass) = auth.unwrap_or(("Guest", ""));
        client
            .ipc_connect(server, user, pass.to_string())
            .await
            .map_err(|e| format!("IPC connect failed: {}", e))?;

        // Now list shares using the authenticated IPC connection
        client
            .list_shares(server)
            .await
            .map_err(|e| format!("list_shares error: {}", e))
    })
    .await
    .map_err(|_| format!("Timeout after {}s", LIST_SHARES_TIMEOUT.as_secs()))?;

    let shares_info = list_result?;
    let latency_ms = start.elapsed().as_millis() as u64;

    let shares: Vec<ShareDetails> = shares_info
        .into_iter()
        .map(|s| {
            // Extract share info - use Debug format for complex NDR types
            let name = format!("{:?}", s.netname);
            // Clean up the name (remove quotes if wrapped)
            let name = name.trim_matches('"').to_string();
            let share_type = format!("{:?}", s.share_type);
            let comment = format!("{:?}", s.remark);
            ShareDetails {
                name,
                share_type,
                comment,
            }
        })
        .collect();

    Ok(ShareListResult { shares, latency_ms })
}

fn print_result(result: &TestResult) {
    if let Ok(ref share_result) = result.guest_list_shares {
        println!("\n  📂 Shares found:");
        for share in &share_result.shares {
            // Determine share type icon from string
            let type_icon = if share.share_type.contains("Disk") || share.share_type.contains("DiskTree") {
                "📁"
            } else if share.share_type.contains("Print") {
                "🖨️"
            } else if share.share_type.contains("IPC") {
                "⚙️"
            } else {
                "📄"
            };
            let comment_clean = if share.comment == "None" || share.comment.is_empty() {
                String::new()
            } else {
                format!(" - {}", share.comment.trim_matches('"'))
            };
            println!("      {} {}{}", type_icon, share.name, comment_clean);
        }
    }
}

fn print_summary(results: &[TestResult]) {
    println!("═══════════════════════════════════════════════════════════════════");
    println!("                            SUMMARY");
    println!("═══════════════════════════════════════════════════════════════════\n");

    println!(
        "{:<15} {:<12} {:<10} {:<12} {:<10}",
        "Server", "Type", "DNS", "Guest", "Latency"
    );
    println!("{}", "-".repeat(67));

    for result in results {
        let dns = if result.dns_resolved { "✅" } else { "❌" };
        let guest = match &result.guest_list_shares {
            Ok(_) => "✅",
            Err(_) => "❌",
        };
        let latency = match &result.guest_list_shares {
            Ok(r) => format!("{}ms", r.latency_ms),
            Err(_) => "-".to_string(),
        };

        println!(
            "{:<15} {:<12} {:<10} {:<12} {:<10}",
            result.server_name, result.server_type, dns, guest, latency
        );
    }

    println!("\n───────────────────────────────────────────────────────────────────");

    // Overall assessment
    let all_pass = results.iter().all(|r| r.guest_list_shares.is_ok());
    let some_pass = results.iter().any(|r| r.guest_list_shares.is_ok());

    if all_pass {
        println!("🎉 All servers passed! smb-rs is validated for use.");
    } else if some_pass {
        println!("⚠️  Mixed results - some servers worked, some failed.");
        println!("   Review the failures to determine if fallback is needed.");
    } else {
        println!("❌ No servers passed. May need to debug smb-rs integration.");
    }

    // Print any error details
    for result in results {
        if let Err(ref e) = result.guest_list_shares {
            if e != "Not attempted" {
                println!("\n   {} error: {}", result.server_name, e);
            }
        }
    }

    println!();
}

