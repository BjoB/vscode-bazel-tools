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
