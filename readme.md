# PHP-WASM version packages

This project builds every version of PHP-WASM as an individual package. It is based on [`@php-wasm/node`](hhttps://github.com/WordPress/wordpress-playground/tree/trunk/packages/php-wasm/node) and [`@php-wasm/web`](https://github.com/WordPress/wordpress-playground/tree/trunk/packages/php-wasm/web), which compile PHP to WebAssembly for Node.js and the web.

## Why

The original packages are published with all versions together, where each package's download size is ~300MB. In contrast, this project creates individual version packages that are ~33MB each.

## Changes

- [x] Create version-specific packages
- [x] Remove unused dependencies
- [x] Test every version package for target Node
- [x] Test every version package for target Web

## Packages

### Node

- `@expreva/php-wasm-7-4`
- `@expreva/php-wasm-8-0`
- `@expreva/php-wasm-8-1`
- `@expreva/php-wasm-8-2`
- `@expreva/php-wasm-8-3`
- `@expreva/php-wasm-8-4`

### Web

- `@expreva/php-wasm-web-7-4`
- `@expreva/php-wasm-web-8-0`
- `@expreva/php-wasm-web-8-1`
- `@expreva/php-wasm-web-8-2`
- `@expreva/php-wasm-web-8-3`
- `@expreva/php-wasm-web-8-4`

## Develop

```sh
# Install
git clone https://github.com/expreva/php-wasm-versions
cd php-wasm-versions
bun install

# Build all
bun run build
# Build packages
bun run build:packages
# Build test
bun run build:test
# Run test
bun run test
# Serve web site - Visit http://localhost:3000 for test results
bun run serve
```

## Release

```sh
# Release dry-run
bun run release:dry-run
# Release - Generate and pass one-time pass
OTP=XXX bun run release
```

Note: The one-time pass can expire during the release process because of how many packages are published at the same time. Regenerate the OTP and run the command again to continue. It may be necessary to wait a while before re-running the command because the version check is done by requesting the registry, which is not updated immediately after package is published.
