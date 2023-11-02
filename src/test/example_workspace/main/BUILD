load("@hedron_compile_commands//:refresh_compile_commands.bzl", "refresh_compile_commands")

cc_binary(
    name = "foo",
    srcs = [
        "foo.cpp",
    ],
    deps = ["//lib:bar"],
)

refresh_compile_commands(
    name = "refresh_compile_commands",
    targets = [
        ":foo",
    ],
)
