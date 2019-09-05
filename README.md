# electron-info [![Build Status](https://action-badges.now.sh/ffflorian/electron-info)](https://github.com/ffflorian/electron-info/actions/) [![npm version](https://img.shields.io/npm/v/electron-info.svg?style=flat)](https://www.npmjs.com/package/electron-info) [![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=ffflorian/electron-info)](https://dependabot.com)

Get informations about Electron releases. Uses [electron-releases](https://unpkg.com/electron-releases@latest/lite.json).

## Installation

Just run `npx electron-info`.

If you'd like to install it permanently, run `yarn global add electron-info` or `npm i -g electron-info`.

## CLI Usage

```
Usage: electron-info [options] [command]

Get informations about Electron releases.

Allowed version argument inputs:
  - SemVer versions (e.g. "~7")
  - npm dist tags (e.g. "5-0-x", only Electron)
  - "all"

Options:
  -d, --debug             Enable debug logging
  -f, --force             Force downloading the latest release file
  -l, --limit <number>    Limit output of releases
  -r, --raw               Output raw JSON
  -s, --source <url>      Use a custom releases source URL or path
  -t, --timeout <number>  Use a custom HTTP timeout
  --no-colors             Don't use colors for displaying
  --no-prereleases        Don't include Electron prereleases
  -v, --version           output the version number
  -h, --help              output usage information

Commands:
  electron|e [version]    Get informations about an Electron release
  chrome|c [version]      Get informations about a chrome release
  modules|m [version]     Get informations about a modules release
  node|n [version]        Get informations about a node release
  openssl|o [version]     Get informations about an openssl release
  uv|u [version]          Get informations about an uv release
  v8|v [version]          Get informations about a v8 release
  zlib|z [version]        Get informations about a zlib release
  all|a                   Get informations about all releases
```

### Examples

```shell
$ electron-info electron 4
╔══════════════╤═══════════════════════╗
║ Electron     │ 4.2.9                 ║
╟──────────────┼───────────────────────╢
║ Published on │ 08/06/2019            ║
╟──────────────┼───────────────────────╢
║ Node.js      │ 10.11.0               ║
╟──────────────┼───────────────────────╢
║ Chrome       │ 69.0.3497.128         ║
╟──────────────┼───────────────────────╢
║ OpenSSL      │ 1.1.0                 ║
╟──────────────┼───────────────────────╢
║ Modules      │ 69                    ║
╟──────────────┼───────────────────────╢
║ uv           │ 1.23.0                ║
╟──────────────┼───────────────────────╢
║ V8           │ 6.9.427.31-electron.0 ║
╟──────────────┼───────────────────────╢
║ zlib         │ 1.2.11                ║
╚══════════════╧═══════════════════════╝

╔══════════════╤═══════════════════════╗
║ Electron     │ 4.2.8                 ║
╟──────────────┼───────────────────────╢
║ Published on │ 07/20/2019            ║
╟──────────────┼───────────────────────╢
║ Node.js      │ 10.11.0               ║
╟──────────────┼───────────────────────╢
║ Chrome       │ 69.0.3497.128         ║
╟──────────────┼───────────────────────╢
║ OpenSSL      │ 1.1.0                 ║
╟──────────────┼───────────────────────╢
║ Modules      │ 69                    ║
╟──────────────┼───────────────────────╢
║ uv           │ 1.23.0                ║
╟──────────────┼───────────────────────╢
║ V8           │ 6.9.427.31-electron.0 ║
╟──────────────┼───────────────────────╢
║ zlib         │ 1.2.11                ║
╚══════════════╧═══════════════════════╝

[...]

Found 42 releases.
```

```shell
$ electron-info chrome 71
╔══════════════╤═════════════════════════════════════╗
║ Electron     │ 5.0.0-nightly.20190122 (prerelease) ║
╟──────────────┼─────────────────────────────────────╢
║ Published on │ 01/22/2019                          ║
╟──────────────┼─────────────────────────────────────╢
║ Node.js      │ 12.0.0                              ║
╟──────────────┼─────────────────────────────────────╢
║ Chrome       │ 71.0.3578.98                        ║
╟──────────────┼─────────────────────────────────────╢
║ OpenSSL      │ 1.1.0                               ║
╟──────────────┼─────────────────────────────────────╢
║ Modules      │ 68                                  ║
╟──────────────┼─────────────────────────────────────╢
║ uv           │ 1.24.1                              ║
╟──────────────┼─────────────────────────────────────╢
║ V8           │ 7.1.302.31-electron.0               ║
╟──────────────┼─────────────────────────────────────╢
║ zlib         │ 1.2.11                              ║
╚══════════════╧═════════════════════════════════════╝

╔══════════════╤═════════════════════════════════════╗
║ Electron     │ 5.0.0-nightly.20190121 (prerelease) ║
╟──────────────┼─────────────────────────────────────╢
║ Published on │ 01/22/2019                          ║
╟──────────────┼─────────────────────────────────────╢
║ Node.js      │ 12.0.0                              ║
╟──────────────┼─────────────────────────────────────╢
║ Chrome       │ 71.0.3578.98                        ║
╟──────────────┼─────────────────────────────────────╢
║ OpenSSL      │ 1.1.0                               ║
╟──────────────┼─────────────────────────────────────╢
║ Modules      │ 68                                  ║
╟──────────────┼─────────────────────────────────────╢
║ uv           │ 1.24.1                              ║
╟──────────────┼─────────────────────────────────────╢
║ V8           │ 7.1.302.31-electron.0               ║
╟──────────────┼─────────────────────────────────────╢
║ zlib         │ 1.2.11                              ║
╚══════════════╧═════════════════════════════════════╝

Found 2 releases.
```

## TypeScript Usage

- [see definitions](https://unpkg.com/browse/electron-info@latest/dist/ElectronInfo.d.ts)
- [see CLI](./src/cli.ts)
