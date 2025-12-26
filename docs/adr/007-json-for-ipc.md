# ADR 007: Use JSON for Tauri IPC, optimize with chunking

## Status

Accepted

## Context

Tauri 2.0 supports both JSON (default) and binary formats via Raw Payloads (MessagePack, Protobuf, etc.). For lists of
50k files, we need to choose the right serialization approach.

### Options considered

1. **JSON (default)** - Simple, debuggable, no extra dependencies
2. **MessagePack** - ~37% smaller, ~4x faster serialization
3. **Protobuf** - Schema-based, very compact, complex setup

### Benchmarks (from research)

For 50k file entries (~200 bytes/entry):

- JSON: ~10MB payload, ~50ms serialization
- MessagePack: ~6.3MB payload, ~12ms serialization

## Decision

Use **JSON** for IPC, combined with **chunking** (1000 entries per response).

Rationale:

1. The chunking strategy reduces per-request payload to ~200KB regardless of format
2. JSON is simpler to debug (readable in browser devtools)
3. No additional dependencies (`rmp-serde`, `@msgpack/msgpack`)
4. Can always switch to MessagePack later if profiling shows bottleneck

## Consequences

### Positive

- Simpler implementation, no binary serialization libraries
- Easier debugging with browser devtools
- Tauri's default path, best documented

### Negative

- Slightly larger payloads (~37% overhead vs MessagePack)
- Slightly slower serialization (negligible with chunking)

### Notes

If profiling reveals IPC as a bottleneck with 50k+ files after virtual scrolling and chunking are implemented, we can
revisit this decision and switch to MessagePack using Tauri 2.0's `Response::new(bytes)` API.
