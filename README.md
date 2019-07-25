# electron-info [![Build Status](https://action-badges.now.sh/ffflorian/electron-info)](https://github.com/ffflorian/electron-info/actions/) [![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=ffflorian/electron-info)](https://dependabot.com)

Get informations about Electron versions.

## Usage

```
Usage: electron-info [options] [command]

Get informations about Electron versions.

Options:
  -f, --force           Force downloading the latest release file (default: false)
  -r, --raw             Output raw JSON (default: false)
  -v, --version         output the version number
  -h, --help            output usage information

Commands:
  chrome|c [version]    Get informations about a Chrome version (e.g. "chrome 73" or "chrome latest")
  electron|e [version]  Get informations about an Electron version (e.g. "electron 5.0.7" or "electron latest")
  all                   Get informations about all Electron versions
```

### Examples

```
electron-info electron 4
╔════════════╤═══════════════════════╗
║ Dependency │ Version               ║
╟────────────┼───────────────────────╢
║ Electron   │ 4.2.8                 ║
╟────────────┼───────────────────────╢
║ Node.js    │ 10.11.0               ║
╟────────────┼───────────────────────╢
║ Chrome     │ 69.0.3497.128         ║
╟────────────┼───────────────────────╢
║ OpenSSL    │ 1.1.0                 ║
╟────────────┼───────────────────────╢
║ V8         │ 6.9.427.31-electron.0 ║
╚════════════╧═══════════════════════╝

╔════════════╤═══════════════════════╗
║ Dependency │ Version               ║
╟────────────┼───────────────────────╢
║ Electron   │ 4.2.7                 ║
╟────────────┼───────────────────────╢
║ Node.js    │ 10.11.0               ║
╟────────────┼───────────────────────╢
║ Chrome     │ 69.0.3497.128         ║
╟────────────┼───────────────────────╢
║ OpenSSL    │ 1.1.0                 ║
╟────────────┼───────────────────────╢
║ V8         │ 6.9.427.31-electron.0 ║
╚════════════╧═══════════════════════╝

[...]

Found 41 releases.
```

```
$ electron-info chrome 71
╔════════════╤═════════════════════════════════════╗
║ Dependency │ Version                             ║
╟────────────┼─────────────────────────────────────╢
║ Electron   │ 5.0.0-nightly.20190122 (prerelease) ║
╟────────────┼─────────────────────────────────────╢
║ Node.js    │ 12.0.0                              ║
╟────────────┼─────────────────────────────────────╢
║ Chrome     │ 71.0.3578.98                        ║
╟────────────┼─────────────────────────────────────╢
║ OpenSSL    │ 1.1.0                               ║
╟────────────┼─────────────────────────────────────╢
║ V8         │ 7.1.302.31-electron.0               ║
╚════════════╧═════════════════════════════════════╝

╔════════════╤═════════════════════════════════════╗
║ Dependency │ Version                             ║
╟────────────┼─────────────────────────────────────╢
║ Electron   │ 5.0.0-nightly.20190121 (prerelease) ║
╟────────────┼─────────────────────────────────────╢
║ Node.js    │ 12.0.0                              ║
╟────────────┼─────────────────────────────────────╢
║ Chrome     │ 71.0.3578.98                        ║
╟────────────┼─────────────────────────────────────╢
║ OpenSSL    │ 1.1.0                               ║
╟────────────┼─────────────────────────────────────╢
║ V8         │ 7.1.302.31-electron.0               ║
╚════════════╧═════════════════════════════════════╝

Found 2 releases.
```
