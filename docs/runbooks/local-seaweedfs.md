# Local SeaweedFS evidence storage

CGN uses the pinned `chrislusf/seaweedfs:4.46` image for local S3-compatible
evidence storage. Only the S3 API is published, on `127.0.0.1:18333`; master,
filer, volume and admin ports remain unpublished. A project-scoped Docker volume
stores SeaweedFS metadata and object data. This is a single-node development
service, not production availability or backup evidence.

## Start and verify

Run from the repository root with Docker running:

```bash
pnpm seaweedfs:up
pnpm seaweedfs:verify
pnpm seaweedfs:restart-smoke
```

The first start creates a private `cgn-evidence` bucket with a separate
initializer identity and application identity. The initializer's global Admin
credential is used only to create the bucket; the application credential is
limited to that bucket. Do not pass the initializer key to an application. No
anonymous identity is configured. When explicit
application credentials are not supplied, the lifecycle command generates
random local credentials and stores them in `.cgn/seaweedfs/credentials.json`;
the generated SeaweedFS identity config is `.cgn/seaweedfs/s3.json`. Both files
are ignored by Git. The config is readable to the container, while its parent
directory is owner-only on POSIX systems. To supply your own local application credentials, set both
`CGN_SEAWEEDFS_ACCESS_KEY` and `CGN_SEAWEEDFS_SECRET_KEY` before starting.

`seaweedfs:verify` checks authenticated bucket listing, anonymous denial,
denial outside the evidence bucket, and S3 put/get/head behavior. The restart
smoke writes an object, restarts the container and confirms the object and its
metadata remain available.

Applications should configure the S3 endpoint, region, bucket, access key and
secret key independently of the storage provider. For this local service, the
endpoint is `http://127.0.0.1:18333`, region is `us-east-1`, and bucket is
`cgn-evidence`. Do not put credentials in source files, logs, fixtures or
runbooks. Use a different identity and reviewed secret delivery for any shared
or production environment.

## Stop and remove local data

```bash
pnpm seaweedfs:down
```

This stops the service and preserves its volume. To remove only the volume
owned by this Compose project:

```bash
pnpm seaweedfs:reset
```

Reset does not prune or remove unrelated Docker volumes. The local credential
files remain so the same application configuration can be reused on the next
start.

## References

- [SeaweedFS 4.46 release](https://github.com/seaweedfs/seaweedfs/releases/tag/4.46)
- [SeaweedFS Docker Compose example](https://github.com/seaweedfs/seaweedfs/blob/4.46/docker/seaweedfs-compose.yml)
- [SeaweedFS S3 credentials](https://github.com/seaweedfs/seaweedfs/wiki/S3-Credentials)
