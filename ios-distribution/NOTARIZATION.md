# Aftergraph iOS notarization

Canonical bundle ID: `org.aftergraph.ios`.

## What is automated

`.github/workflows/ios-notarization.yml` runs on GitHub's `xcode-27` macOS runner and can:

1. authenticate to App Store Connect with an API key;
2. verify that the Aftergraph app record exists;
3. cloud-sign and archive the native iOS app;
4. export and verify a signed IPA;
5. upload the build to App Store Connect;
6. wait until the build is visible in App Store Connect.

## Required GitHub Actions secrets

- `APPLE_TEAM_ID`
- `APPLE_API_KEY_ID`
- `APPLE_API_ISSUER_ID`
- `APPLE_API_PRIVATE_KEY_B64` — base64 of the downloaded `.p8` key

No Apple secret is committed to the repository.

## Apple-side prerequisites

The Account Holder must have accepted the current Apple Developer Program agreement.
An App Store Connect app record for `org.aftergraph.ios` must exist before the upload pipeline can proceed.

For AltStore PAL distribution, add AltStore as an alternative marketplace in App Store Connect using the marketplace token issued by AltStore, mark the app eligible for that marketplace, then submit the uploaded version using the **Notarization** review type.

After Apple accepts Notarization, obtain the Alternative Distribution Package and publish the AltStore source/ADP through the Aftergraph distribution host.

The workflow deliberately stops before review submission because review type, marketplace relationship, required metadata, screenshots, age rating, and legal declarations are account-owned App Store Connect state and must be correct rather than guessed.
