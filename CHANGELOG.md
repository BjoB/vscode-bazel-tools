# Change Log

All notable changes for this extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] 2023-10-07

### Added

- Command to generate a `compile_commands.json` file based on the current bazel workspace, the .bazelrc and extension settings.

## [0.2.0] 2023-10-07

### Fixed

- Some README adaptions.

## [0.3.0] 2023-10-07

### Changed

- Use webpack to bundle extension.

## [0.4.0] 2023-10-09

### Added

- Log messages are now forwarded to extension output channel.

### Fixed

- Only touch 'external' paths in compile_commands.json with certain prefixes.

## [0.5.0] 2023-10-27

### Added

- Use progress notifications in addition to extension output

## [0.6.0] 2023-11-05

### Added

- Support official vscode testing API to discover, run, debug and anlyze `cc_test` targets via test explorer UI
- Additional setting to switch on/off testing feature
- Additional setting to reduce the search space for large projects with many build targets

### Fixed

- compile_commands.json generation didn't work properly in case no symlinks for bazel-* directories were used

## [0.6.1] 2023-11-27

### Fixed

Explicitly assume that a cc_test label name matches the main cpp test file to overcome wrong associations in case of additional source files

## [0.6.2] 2023-12-05

### Fixed

clangd seems to have problems to resolve "isystem" added includes placed in the compile commands file, when using gcc to compile. A replacement with normal includes works.

## [0.6.3] 2024-01-03

### Fixed

- Harmonized test file paths to avoid duplicate entries in Test Explorer UI
- Switched to stream handling for file manipulation to prevent errors in case of large compile_commands.json files

### Added

- Add a QuickPick popup to support workspace selection on startup

## [0.6.4] 2024-01-04

### Fixed

- Use only selected workspace for test discovery

## [0.6.5] 2024-01-08

### Added

- Provide additional setting to specify bazel workspace directory

## [0.6.6] 2024-01-11

### Fixed

- Handle test definition across multiple lines properly
