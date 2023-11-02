#include <bar.h>
#include <gtest/gtest.h>

TEST(Hellotest1, basic_test)
{
    test();
    EXPECT_STRNE("hello", "world");
    EXPECT_EQ(7 * 6, 42);
}


TEST(HelloTest2, basic_test_2)
{
    EXPECT_EQ(7 * 6, 42);
}
