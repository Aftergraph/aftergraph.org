# Aftergraph iOS Web Distribution

Canonical production surface for direct iPhone distribution at https://install.aftergraph.org.

## Invariants
- Fail closed until Apple Web Distribution approval, notarization, App Store Connect IDs, Alternative Distribution Package, and the private alternative-distribution signing key exist.
- Never commit the private JWK.
- The public install surface may be live before `installable=true`.
- Bundle ID: `org.aftergraph.ios`.

## Activation inputs
Cloudflare secret:
- `ALT_DISTRIBUTION_PRIVATE_JWK`

Cloudflare vars to add after Apple issuance:
- `APPLE_ITEM_ID`
- `APPLE_VERSION_ID`
- `ALT_DISTRIBUTION_KEY_ID`
- `DISTRIBUTION_PACKAGE_URL`
- `WEB_DISTRIBUTION_ENABLED=true`

## Verify
```bash
npm ci
npm run check
```
