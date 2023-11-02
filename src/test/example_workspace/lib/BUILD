cc_library(
    name = "bar",
    srcs = [
        "bar.cpp",
    ],
    hdrs = ["bar.h"],
    includes = ["."],
    visibility = ["//visibility:public"],
)

cc_test(
    name = "test_bar",
    srcs = ["test_bar.cpp"],
    deps = [
        ":bar",
        "@com_google_googletest//:gtest_main",
    ],
)

# bazel test //lib:test_bar --test_output=all --test_filter=HelloTest.basic_test_2

# bazel query 'kind("cc_test", //...)'
# bazel query "attr('srcs', //lib:test_bar.cpp, //lib:*)" <---- What rule target(s) contain file test_bar.cpp as a source?
# bazel query 'labels(srcs, //lib:test_bar)' <---- What src files does the target have?
