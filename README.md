# electron-info [![Build Status](https://action-badges.now.sh/ffflorian/electron-info)](https://github.com/ffflorian/electron-info/actions/) [![Dependabot Status](https://api.dependabot.com/badges/status?host=github&repo=ffflorian/electron-info)](https://dependabot.com)

Get informations about Electron versions.

## Usage

```
Usage: electron-info [options] [command]

Get informations about Electron versions.

Options:
  -f, --force           Force downloading the latest release file
  -v, --version         output the version number
  -h, --help            output usage information

Commands:
  chrome|c [version]    Get informations about a Chrome version (e.g. "chrome 73" or "chrome latest")
  electron|e [version]  Get informations about an Electron version (e.g. "electron 5.0.7" or "electron latest")
  all                   Get informations about all Electron versions
```

### Example

```
$ electron-info electron 4
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
```
