# CI workflows

## `build-addon.yml`

Builds and publishes the Plex Now Showing add-on images to GitHub Container
Registry (GHCR), one image per arch.

### Tagging strategy

| Trigger                               | Image tag(s)       | Pushed? |
|---------------------------------------|--------------------|---------|
| Pull request touching the add-on      | — (build-only)     | no      |
| Push to `dev`                         | `:<config version>` + `:dev` | yes |
| Push to `main`                        | `:<config version>` + `:main` | yes |
| Tag `addon-v1.2.3`                    | `:1.2.3` + `:latest` | yes   |

### Image names

```
ghcr.io/rusty4444/plex-now-showing-amd64
ghcr.io/rusty4444/plex-now-showing-aarch64
ghcr.io/rusty4444/plex-now-showing-armv7
ghcr.io/rusty4444/plex-now-showing-armhf
ghcr.io/rusty4444/plex-now-showing-i386
```

These exactly match `image: ghcr.io/rusty4444/plex-now-showing-{arch}` in
`addons/plex-now-showing/config.yaml` — Supervisor substitutes `{arch}` at
install time and pulls the tag named by the add-on `version`.

### Cutting a release

```bash
# On dev, change the pre-release version in addons/plex-now-showing/config.yaml
# to the release version, update CHANGELOG.md, merge to main, then:
git tag addon-v2.1.0
git push origin addon-v2.1.0
```

The workflow will build all five arches in parallel and push
`:2.1.0` + `:latest`.

### Publishing the HA custom repository

Once `:dev` (or `:latest`) images exist, a user adds the repo to HA via:

1. Settings → Add-ons → Add-on store → ⋮ → Repositories
2. `https://github.com/rusty4444/now-showing-ha`

HA reads `repository.yaml` at the repo root and lists every subfolder under
`addons/` as an installable add-on.
