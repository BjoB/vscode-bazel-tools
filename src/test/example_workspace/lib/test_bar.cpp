#include <bar.h>
#include <gtest/gtest.h>

class HelloTestFixture : public testing::Test {};

TEST(HelloSimpleTest, basic_test_1)
{
    test();
    EXPECT_STRNE("hello", "world");
    EXPECT_EQ(7 * 6, 42);
}


TEST(HelloSimpleTest, basic_test_2)
{
    EXPECT_EQ(7 * 6, 42);
}

TEST_F(HelloTestFixture, basic_fixture_test_1)
{
    EXPECT_EQ(7 * 6, 42);
}

TEST_F(HelloTestFixture, basic_fixture_test_2)
{
    EXPECT_EQ(7 * 6, 42);
}
