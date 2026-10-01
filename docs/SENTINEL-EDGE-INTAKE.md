# Sentinel edge intake v1

This branch stages a public GitHub webhook ingress at aftergraph.org for the Sentinel GitHub App.

Design invariants:
- GitHub webhook signatures are verified at the edge before durable acceptance.
- The VDS remains private and uses outbound-only retrieval.
- Delivery IDs are idempotent.
- Events are short-lived and acknowledged only after the local Sentinel receiver accepts them.
- No GitHub App private key, webhook secret, or Relay administrator token is stored in this repository.
- Existing Sentinel review semantics remain unchanged; the edge transports signed deliveries only.

Target flow:

GitHub -> aftergraph.org edge -> short-lived inbox -> outbound Sentinel poller -> 127.0.0.1 Sentinel receiver -> verdict/check

This replaces the blocked Tailscale Funnel dependency without opening a VDS ingress port.
