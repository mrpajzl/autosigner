# VPS web application and on-demand Mac signing

The Nuxt application, PostgreSQL queue and S3 storage run on the VPS. The Mac runs a
single signing command over SSH for each job. It does not run Nuxt, query PostgreSQL,
poll for jobs, or receive the Apple Developer API keys. A persistent reverse SSH tunnel
is the only additional idle process on the Mac when it is behind NAT.

`signing/engine.ts` owns macOS signing, keychain cleanup and signature verification.
`signing/runner.ts` reads a bounded JSON header followed by the IPA from stdin and
returns the verified signed IPA on stdout. Credentials travel only inside SSH stdin,
never in remote command arguments or logs. IPA transfers are streamed and checked
against their declared size and SHA-256. A macOS PID lock serializes signing commands.
Temporary files are private and removed when the command exits; interrupted signing
has a 20-minute deadline, including transfer. SIGKILL/power loss may leave a private
work directory/keychain requiring maintenance; never remove an active job directory.

The VPS queue is stored in `RemoteSigningJob`, with a partial unique index preventing
multiple running jobs and another preventing duplicate active targets. Claims are
serialized with a short PostgreSQL advisory transaction lock. Offline/busy Macs retry
after 60 seconds. An abandoned lease is retried after 30 minutes; attempts have a
25-minute deadline. Queue polling (15 seconds) happens only on the VPS. Signing errors
remain visible as failed jobs for manual retry.

## Configuration

Preserve the existing production PostgreSQL database, S3 bucket, `CRYPTO_SECRET`,
Discord credentials, and public domain. Existing `Session` rows authenticate the same
`as_session` cookies after the move. Apple Developer authentication is generated from
`AppleDeveloperCredentials` (`keyId`, `issuerId`, encrypted `.p8`); these must not be
regenerated. Also preserve all P12 files/passwords and provisioning profiles.

Runtime variables in Coolify:

- All existing `.env` values. `DATABASE_URL` may use the same database container's
  internal hostname and port on the `coolify` network instead of its public endpoint.
- `NUXT_PUBLIC_BASE_URL`: same value as `PUBLIC_BASE_URL` (canonical HTTPS domain).
- `NUXT_DISCORD_BOT_TOKEN` / `NUXT_DISCORD_GUILD_ID`: same corresponding Discord values.
- `SIGNING_BACKEND=ssh`, `SIGNING_QUEUE_ENABLED=true`.
- `SIGNER_SSH_HOST`, `SIGNER_SSH_PORT`, `SIGNER_SSH_USER`.
- `SIGNER_SSH_KEY_PATH`, `SIGNER_SSH_KNOWN_HOSTS`: mounted SSH credential files that the application cannot modify.
- `DISABLE_AUTO_CLEANUP=true` during migration, staging, and rollback observation.

The SSH client key on the Mac must have a forced command in `authorized_keys`:

```
restrict,command="/absolute/path/to/node /absolute/path/to/runner.mjs" ssh-ed25519 ...
```

Pin the Mac's actual SSH host public key in `known_hosts`. Never disable host-key
verification. `health` as the SSH command performs an on-demand runner check without
signing. Rebuild the standalone runner with `npm run build:signer`; deploy
`dist/signer/runner.mjs` to the Mac independently of the web image.

## Deployment and data preservation

1. Back up production PostgreSQL with `pg_dump -Fc` and copy the existing environment
   to protected storage outside Git. Back up the S3 bucket before changing cleanup.
2. Restore the dump into a separate database and compare every application table,
   including session tokens and encrypted credentials. Verify that all Apple private
   keys can be decrypted using the unchanged secret. Do not print their contents.
3. Apply `prisma/remote-signing/001_queue.sql` with `psql -v ON_ERROR_STOP=1`. It only
   adds the queue table/indexes. Historical `prisma/migrations` contain SQLite SQL:
   do **not** run them or `prisma db push --accept-data-loss` on production.
4. Build using `Dockerfile`. No secrets are needed at build time. Set environment
   variables as runtime-only in Coolify. Add the SSH directory through **Persistent
   Storage → Directory Mount**, with host `/data/coolify/fastsigner-ssh` and destination
   `/run/signer-ssh`. Do not use `custom_docker_run_options --volume`: Coolify can
   silently omit this option from generated Compose files. Prefer a read-only mount;
   if the directory mount is writable, use root ownership with group 1000, directory
   mode 0550 and file mode 0440 so the non-root application can read but not modify
   credentials. Set the container stop grace period to 1800 seconds for queue draining.
   After deploying, inspect the actual container mounts and run the SSH `health`
   command from inside the application container, followed by a real signing test.
   For MinIO on the same VPS, enable its Coolify **Connect to Predefined Network**
   option and set `MINIO_ENDPOINT` to the internal service URL (port 9000). Keep
   `MINIO_PUBLIC` unchanged. Verify a large signed IPA upload: routing server-to-server
   S3 writes through the public reverse proxy can fail even when small test files pass.
5. Stage against a restored database and a separate S3 bucket with cleanup disabled.
   Test login, Apple read APIs, uploads, both signing platforms, manifest URLs and
   signed IPA downloads. Verify real session tokens against the new production
   instance without creating/replacing production sessions.
6. Wait for the old Mac queue to drain, then switch the existing domains to the
   Coolify application. Preserve canonical HTTPS URLs and OAuth callback paths.
   Stop the old Nuxt process and disable its startup/auto-update/watchdog mechanisms.
   Preserve the old build and environment for rollback.
7. Verify public health, authentication, Apple accounts, assets, queue and idle Mac
   processes. Do not restore the pre-migration database over ongoing production writes.

Rollback: drain/stop the new queue, point the domains back to the retained Mac build,
and start that build with its original environment against the same live DB and S3.
The added queue table can remain. Never roll back by replacing the live database with
an older dump. Reconcile outstanding durable jobs before returning to the old queue.

## Validation

- `pnpm build` (use an isolated source directory when the existing build is live).
- `npm run test:storage-cleanup`.
- `npm run test:signer` (macOS; tests SSH protocol, failures and credential redaction).
- `DATABASE_URL=... node scripts/test-queue.mjs` against a disposable database whose
  name contains `restorecheck`, after applying the queue SQL. This suite clears only
  that database's queue table; never point it at production.
