#include "parking_logic.h"
#include <cstring>

SlotSelection slotForUid(const char* uid) {
  if (uid && std::strcmp(uid, "03:B7:F7:0F") == 0) return SlotSelection::Slot1;
  if (uid && std::strcmp(uid, "13:CD:2C:F8") == 0) return SlotSelection::Slot2;
  return SlotSelection::None;
}

bool sensorIsOccupied(int rawLevel, bool activeLow) {
  return activeLow ? rawLevel == 0 : rawLevel != 0;
}
