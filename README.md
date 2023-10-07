# vscode-bazel-tools

This extension adds some utility to ease the work with C/C++ targets in a bazel workspace and allows to work efficiently with IntelliSense.

## Features

- Generates a `compile_commands.json` for an existing bazel workspace via command, based on the [bazel-compile-commands-extractor](https://github.com/hedronvision/bazel-compile-commands-extractor) tool.

## Requirements

- The `bazel` command needs to be known from command line, so make sure bazel is properly installed.
- Your bazel project needs to depend on hedronvision's [bazel-compile-commands-extractor](https://github.com/hedronvision/bazel-compile-commands-extractor), as this tool is currently used to generate the compile commands.

## Usage

Having a file from your bazel workspace opened, just enter `bazel-tools` from the command palette (`Strg+Shift+P`). 
Via `Generate compile commands` the `compile_commands.json` file will be generated. 

In large repositories you might want to limit the number of targets to generate compile commands for with 
a custom `refresh_compile_commands` bazel target (see [bazel-compile-commands-extractor](https://github.com/hedronvision/bazel-compile-commands-extractor) for details). You can reference this via the `customCompileCommandsTarget` setting.

## Extension Settings

* `bazeltools.customCompileCommandsTarget`: Specifies a custom bazel target (label) to generate the compile commands.
