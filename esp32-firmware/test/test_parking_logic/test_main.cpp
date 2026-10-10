#include <unity.h>
#include "parking_logic.h"

void test_uid_mapping() {
  TEST_ASSERT_EQUAL(1, static_cast<int>(slotForUid("03:B7:F7:0F")));
  TEST_ASSERT_EQUAL(2, static_cast<int>(slotForUid("13:CD:2C:F8")));
  TEST_ASSERT_EQUAL(0, static_cast<int>(slotForUid("DE:AD:BE:EF")));
}
void test_sensor_polarity() {
  TEST_ASSERT_TRUE(sensorIsOccupied(0, true)); TEST_ASSERT_FALSE(sensorIsOccupied(1, true));
  TEST_ASSERT_FALSE(sensorIsOccupied(0, false)); TEST_ASSERT_TRUE(sensorIsOccupied(1, false));
}
int main(int, char**) { UNITY_BEGIN(); RUN_TEST(test_uid_mapping); RUN_TEST(test_sensor_polarity); return UNITY_END(); }
