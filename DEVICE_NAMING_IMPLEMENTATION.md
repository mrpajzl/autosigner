# Device Naming System Rework - Implementation Summary

## Overview
The device naming system has been reworked to use a unified format across all users:

**Format:** `[Discord name] - [Device type] [number]`

**Examples:**
- `john_doe - iPhone 1`
- `john_doe - Mac 2`
- `john_doe - Apple TV 3`

## Changes Made

### 1. Database Schema (`prisma/schema.prisma`)
- Added `deviceNumber` field: Sequential number for each user's devices (1, 2, 3...)
- Added `appleDeviceId` field: Stores Apple Developer Portal device ID for syncing
- Added unique constraint on `[registeredUserId, deviceNumber]` to ensure unique numbering per user
- Migration applied successfully to existing database with 237 devices

### 2. Helper Functions (`server/utils/device-naming.ts`)
- `getDeviceTypeName(platform)`: Maps platform to user-friendly device type
- `generateDeviceName(discordName, platform, deviceNumber)`: Creates unified device name
- `parseDeviceName(deviceName)`: Extracts components from device name
- `getNextDeviceNumber(userId, prisma)`: Gets the next available device number for a user

### 3. Backend API Updates

#### Device Creation (`server/api/registered-users/[id]/devices/index.post.ts`)
- Auto-generates device names in the new format
- Name field is now optional (auto-generated from Discord name + platform + number)
- Returns `deviceNumber` in response

#### Device Update (`server/api/registered-users/[id]/devices/[deviceId].patch.ts`)
- Auto-regenerates device name when platform changes
- Maintains consistent naming format
- Returns `deviceNumber` in response

#### New Sync Endpoint (`server/api/registered-users/[id]/devices/[deviceId]/sync-to-apple.post.ts`)
- Syncs device name from local database to Apple Developer Portal
- Finds device in Apple by UDID
- Updates device name in Apple Developer Portal
- Stores Apple device ID for future reference

#### Import to Apple (`server/api/registered-users/[id]/import-to-apple.post.ts`)
- Uses pre-generated device names (already in unified format)
- Stores Apple device ID after successful registration
- Updated to work with new naming structure

#### Bulk Import (`server/api/registered-users/import-to-apple.post.ts`)
- Updated to use unified device names
- Stores Apple device IDs for all imported devices
- Handles APPLE_TV platform mapping to IOS for Apple API

#### Device List (`server/api/registered-users/index.get.ts`)
- Returns `deviceNumber` and `appleDeviceId` for each device
- Orders devices by `deviceNumber` (ascending) instead of creation date

### 4. Frontend Updates (`pages/profile/user-database.vue`)

#### Device Display
- Shows devices with unified naming format
- Displays device number badge
- Shows sync status (success/error messages)
- Added sync button for devices registered in Apple

#### Sync Button
- Appears only for devices registered in Apple
- Shows spinning icon while syncing
- Displays success/error feedback
- Auto-clears status after 3-5 seconds

#### Device Form Modal
- Removed manual name input (auto-generated)
- Shows info message explaining naming format
- Only requires UDID and platform selection
- Updated validation to not require name

#### Updated Interface
```typescript
interface Device {
  id: string
  udid: string
  name: string
  deviceNumber: number
  platform: string
  createdAt: string
  updatedAt: string
  isRegisteredInApple?: boolean
  appleDeviceId?: string
}
```

### 5. Migration Script (`scripts/migrate-device-names.ts`)
- Successfully migrated all 237 existing devices
- Converted old names to unified format
- Preserved device numbers based on creation order
- No errors or data loss

## Benefits

1. **Consistency**: All devices follow the same naming pattern
2. **Clarity**: Easy to identify device owner and type at a glance
3. **Scalability**: Device numbering allows unlimited devices per user
4. **Sync Ready**: Can update Apple Developer Portal names with one click
5. **Automatic**: No manual name entry needed when adding devices

## Testing Checklist

- [ ] Add new device - verify auto-generated name
- [ ] Edit device platform - verify name regeneration
- [ ] Sync device to Apple - verify button works
- [ ] Import single user to Apple - verify naming
- [ ] Import multiple users to Apple - verify naming
- [ ] Check device ordering (by deviceNumber)
- [ ] Verify sync button appears only for Apple-registered devices
- [ ] Test sync success/error feedback

## Migration Notes

- All existing devices have been migrated to the new format
- Device numbers assigned based on creation order (oldest = 1)
- No manual intervention required
- Apple Developer Portal names will be updated on next sync/import

## API Changes

### POST `/api/registered-users/{id}/devices`
- **Changed**: `name` field is now optional (auto-generated)
- **Added**: Returns `deviceNumber` in response

### PATCH `/api/registered-users/{id}/devices/{deviceId}`
- **Changed**: `name` field is ignored (auto-regenerated)
- **Added**: Returns `deviceNumber` in response

### POST `/api/registered-users/{id}/devices/{deviceId}/sync-to-apple` (NEW)
- **Purpose**: Sync device name to Apple Developer Portal
- **Returns**: `{ success, deviceName, appleDeviceId }`

### GET `/api/registered-users`
- **Added**: Returns `deviceNumber` and `appleDeviceId` for each device
- **Changed**: Devices ordered by `deviceNumber` instead of `createdAt`
