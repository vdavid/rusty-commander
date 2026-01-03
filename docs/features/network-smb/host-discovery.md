# Host discovery

How Rusty Commander discovers SMB hosts on the local network.

## Overview

Network hosts are discovered automatically using **Bonjour** (Apple's implementation of mDNS/DNS-SD). When an
SMB-capable device advertises itself on the local network, it appears in the volume selector under "Network".

## How Bonjour works

Bonjour uses multicast DNS (mDNS) to discover services on the local network without requiring a central directory:

1. **Advertising**: Devices with SMB file sharing broadcast: _"I'm `Naspolya` and I have SMB on port 445"_
2. **Listening**: Our app listens for these broadcasts on multicast address `224.0.0.251`
3. **Resolution**: When a service is found, we resolve its hostname/IP to connect

### Service type

SMB shares advertise as `_smb._tcp.local`:

- `_smb` — the service (SMB file sharing)
- `_tcp` — the protocol (TCP)
- `.local` — the local network domain

## Implementation

### macOS APIs

We use Apple's `NSNetServiceBrowser` and `NSNetService` classes from Foundation framework, accessed via
`objc2-foundation`:

```
NSNetServiceBrowser (created at app startup)
    │
    ▼
searchForServicesOfType("_smb._tcp.", inDomain: "local.")
    │
    ▼
Delegate receives callbacks as services appear/disappear
    │
    ▼
NSNetService objects (one per discovered host)
    │
    ▼
resolve() each to get IP address + port
```

### Challenges

| Challenge              | Solution                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| **Delegate pattern**   | Create a Rust struct that implements `NSNetServiceBrowserDelegate` using `objc2`'s `declare_class!` macro |
| **Async/streaming**    | Services appear over time; use Rust channels or async streams to propagate updates                        |
| **Service resolution** | Each `NSNetService` needs `resolve()` call for IP/hostname (another async operation)                      |
| **Run loop**           | Bonjour callbacks require a run loop; use Tauri's main thread or dedicated run loop                       |

### Lifecycle

1. **App startup**: Start `NSNetServiceBrowser` listening for `_smb._tcp.local`
2. **Continuous**: Receive callbacks as hosts appear/disappear on network
3. **Cache results**: Keep discovered hosts in memory for instant volume selector display
4. **Volume selector opened**: Show cached hosts immediately; continue updating as new hosts found

### Lazy resolution

Resolution (getting IP/hostname from `NSNetService`) adds ~50–200 ms latency per host. To keep discovery snappy:

- **On discovery**: Store host name only (from mDNS announcement)
- **On hover (500 ms debounce)**: Resolve that specific host
- **On navigate**: Resolve if not already cached
- **Cache**: Keep resolved addresses in memory

This way the volume selector populates instantly with host names, and resolution happens just-in-time.

### Host disappearance

Bonjour proactively notifies when hosts stop advertising (via `netServiceBrowser:didRemoveService:`).

**UI behavior when a host disappears:**

- **In volume selector**: Remove host from list, keep cursor at same index (or last item if was last)
- **In file pane browsing network hosts**: Remove disappeared host, handle gracefully like any deleted item

### Prefetching for known hosts

After discovery settles (~3 seconds), prefetch share information for hosts in `knownNetworkShares`:

```
Discovery complete
    → For each known host that was discovered:
        → Queue share enumeration (parallel, cap at 10)
        → Cache results for instant display when user navigates
```

This provides instant response for servers the user has connected to before, without probing unknown hosts.

## UX behavior

### In the volume selector

```
📁 Favorites
   └── Documents
   └── Downloads
📁 Macintosh HD
📁 External Drive
📶 Network ← Click to expand or show inline
   └── David's M1 MBP
   └── Naspolya
   └── PI
   └── (Searching...) ← While initial discovery in progress
```

### Progress indication

- **While searching**: Subtle spinner or "Searching..." text
- **Hosts appear incrementally**: Each host shows up as discovered (streaming UX)
- **After ~3–5 seconds**: Consider discovery "complete" but keep listening for changes

## Network change detection

Bonjour automatically handles network changes, but we enhance this:

| Event                    | Detection               | Action                 |
| ------------------------ | ----------------------- | ---------------------- |
| Host starts advertising  | Bonjour callback        | Add to list            |
| Host stops advertising   | Bonjour callback        | Remove from list       |
| Network interface change | `SCNetworkReachability` | Pause/resume discovery |

## What Bonjour doesn't cover

Not all devices advertise via Bonjour:

| Scenario                      | Bonjour finds it?        |
| ----------------------------- | ------------------------ |
| Mac with File Sharing enabled | ✅ Yes                   |
| NAS devices (Synology, QNAP)  | ✅ Yes (usually)         |
| Windows with mDNS enabled     | ✅ Yes                   |
| Old Windows / no mDNS         | ❌ No                    |
| Enterprise servers            | ❌ Often no              |
| VPN-connected servers         | ❌ No (different subnet) |

**Future work**: Add "Connect to server..." option for manual server entry (see [index.md](./index.md#future-work)).

## Performance

| Metric          | Value                                    |
| --------------- | ---------------------------------------- |
| CPU usage       | Negligible (passive multicast listening) |
| Network traffic | Minimal (small UDP packets)              |
| Side effects    | None (read-only discovery)               |
| Startup impact  | Near-zero (async, non-blocking)          |

Discovery is lightweight enough to start immediately at app launch.

## Testing

### Unit tests

- Mock `NSNetServiceBrowser` to simulate host discovery
- Test callback handling for service found/lost events
- Test caching and deduplication logic
- Test lazy resolution caching

### Integration tests

- Verify hosts appear in volume list when discovered
- Test host disappearance when service goes offline
- Test behavior when no hosts found (empty "Network" section)
- Test prefetching triggers for known hosts
