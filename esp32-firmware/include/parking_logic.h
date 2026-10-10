#pragma once
#include <stdint.h>

enum class SlotSelection : uint8_t { None = 0, Slot1 = 1, Slot2 = 2 };

SlotSelection slotForUid(const char* uid);
bool sensorIsOccupied(int rawLevel, bool activeLow);

