# Device Type Auto-Detection Enhancement

## Overview
Enhanced the device naming system to automatically detect and use the correct device type from Apple Developer Portal's `deviceClass` information.

## New Features

### 1. Device Class Mapping
- Maps Apple's `deviceClass` to platform: iPhone, iPad, Mac, Apple TV, Apple Watch, iPod
- More accurate than using just the platform field
- Automatically distinguishes between iPhone and iPad (both are iOS)

### 2. Auto-Detection Endpoint
**GET `/api/apple/detect-device?udid={UDID}`**

Queries Apple Developer Portal to detect device information:
```json
{
  "found": true,
  "udid": "00000000-0000000000000000",
  "name": "John's iPhone",
  "platform": "IOS",
  "deviceClass": "IPHONE",
  "appleDeviceId": "abc123",
  "model": "iPhone 15 Pro",
  "status": "ENABLED"
}
```

### 3. Smart Device Type Detection

#### In User Database Form
- Added "Detect" button next to UDID field
- Automatically queries Apple when UDID is entered
- Pre-selects the correct platform based on deviceClass
- Shows success feedback when detected

#### During Import from Apple
- Automatically detects and sets correct platform
- Stores Apple device ID for future syncing
- Uses deviceClass for accurate type detection

#### During Sync to Apple
- Updates platform if it differs from Apple's deviceClass
- Ensures local database matches Apple's records
- Updates device name with correct type

### 4. Enhanced Device Naming

Device names now use more specific types:
- **iPhone** (not just "iPhone" for all iOS devices)
- **iPad** (specifically for iPads)
- **Mac** (for all Mac devices)
- **Apple TV** (for Apple TV devices)
- **Apple Watch** (for watches)
- **iPod** (for iPod Touch)

Examples:
- `john_doe - iPhone 1`
- `john_doe - iPad 2`
- `john_doe - Mac 3`
- `john_doe - Apple TV 4`

## Implementation Details

### Helper Functions (`server/utils/device-naming.ts`)

```typescript
// Map deviceClass to platform enum
deviceClassToPlatform(deviceClass: string): 'IOS' | 'MAC_OS' | 'APPLE_TV'

// Get specific device type name from deviceClass
getDeviceTypeNameFromClass(deviceClass: string): string

// Generate device name with optional deviceClass for specificity
generateDeviceName(
  discordName: string,
  platform: string,
  deviceNumber: number,
  deviceClass?: string
): string
```

### Updated Endpoints

1. **Sync Endpoint** (`/api/registered-users/{id}/devices/{deviceId}/sync-to-apple`)
   - Now updates platform if Apple's deviceClass differs
   - Uses specific device type in naming

2. **Import Endpoint** (`/api/registered-users/import-from-apple`)
   - Detects correct platform from deviceClass
   - Stores appleDeviceId during import

3. **Detect Endpoint** (`/api/apple/detect-device`) - NEW
   - Queries Apple by UDID
   - Returns complete device information
   - Used for auto-detection in UI

## UI Enhancements

### Device Form
- **Detect Button**: Auto-detects device type from Apple
- **Visual Feedback**: Shows success when type is detected
- **Pre-selection**: Automatically selects correct platform
- **Loading State**: Shows spinner while detecting

### User Flow
1. User enters UDID
2. Clicks "Detect" button
3. System queries Apple Developer Portal
4. Platform is automatically selected
5. User confirms and saves

## Benefits

1. **Accuracy**: Uses Apple's official device classification
2. **Convenience**: No manual platform selection needed
3. **Consistency**: All devices use correct types
4. **Future-Proof**: Works with new device types automatically
5. **Sync-Ready**: Platform stays in sync with Apple

## Migration Notes

- Existing devices keep their current platform
- Platform will be updated on next sync with Apple
- No manual intervention required
- Auto-detection only works for devices in Apple Developer Portal

## Testing Checklist

- [x] Map all deviceClass values to platforms
- [x] Create detect endpoint
- [x] Update sync to detect and update platform
- [x] Update import to detect platform
- [x] Add detect button to UI
- [x] Show feedback on detection
- [x] Pre-select detected platform
- [ ] Test with iPhone
- [ ] Test with iPad
- [ ] Test with Mac
- [ ] Test with Apple TV
- [ ] Test detection failure handling
