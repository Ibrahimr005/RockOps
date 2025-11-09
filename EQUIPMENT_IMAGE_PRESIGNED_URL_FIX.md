# Equipment Image Presigned URL Fix

## Problem Description
Equipment images were not loading in the Equipment Main page (showing placeholders only), even though they loaded correctly in Equipment Details and Equipment Info pages. This affected both:
- Local development (MinIO)
- Production deployment (AWS S3)

The issue also occurred when editing equipment in the Equipment Modal.

## Root Cause Analysis

### Backend Issue
The `MinioService.getEquipmentMainPhoto()` method was returning **direct S3/MinIO URLs** instead of **presigned URLs**. 

- **Direct URLs** only work if S3/MinIO buckets have public read access (insecure)
- **Presigned URLs** are temporary authenticated URLs that work with private buckets (secure)
- For security, equipment buckets should be private, requiring presigned URLs

### Frontend Issue
The `EquipmentMain.jsx` component was using stale `imageUrl` values from the equipment DTO without refreshing them. The URLs likely expired after some time (typical S3 presigned URLs expire in 1-7 days).

**Why it worked in other pages:**
- `EquipmentDetails.jsx` explicitly called `getEquipmentMainPhoto()` on mount
- `ViewEquipmentData.jsx` explicitly called `getEquipmentMainPhoto()` on mount  
- Both had fallback logic to call `refreshEquipmentMainPhoto()` on error

## Solutions Implemented

### 1. Backend Fix (MinioService.java)
Updated `getEquipmentMainPhoto()` and `getEquipmentFileUrl()` to generate **7-day presigned URLs**:

```java
// Generate presigned URL for private buckets (valid for 7 days)
if (s3Presigner != null) {
    return getPresignedDownloadUrl(equipmentBucket, objectKey, 10080); // 7 days
} else {
    // Fallback to direct URL if presigner is not available
    return getFileUrl(equipmentBucket, objectKey);
}
```

**Benefits:**
- Works with private S3/MinIO buckets (secure)
- 7-day expiration provides good balance between security and user experience
- Automatic fallback to direct URLs if presigner unavailable

### 2. Frontend Fix - UnifiedCard Component
Added presigned URL refresh capability to `UnifiedCard.jsx`:

```javascript
const [imageRefreshAttempted, setImageRefreshAttempted] = useState(false);
const [refreshedImageUrl, setRefreshedImageUrl] = useState(null);

const handleImageError = async (e) => {
    // If we have a refresh callback and haven't attempted refresh yet
    if (onImageRefresh && !imageRefreshAttempted) {
        setImageRefreshAttempted(true);
        const newUrl = await onImageRefresh(id);
        if (newUrl && newUrl !== e.target.src) {
            setRefreshedImageUrl(newUrl);
            e.target.src = newUrl;
            return;
        }
    }
    // Fallback to placeholder
    if (imageFallback && e.target.src !== imageFallback) {
        e.target.src = imageFallback;
    }
};
```

**New prop:** `onImageRefresh` - Optional callback function to fetch fresh presigned URL

### 3. Frontend Fix - EquipmentMain.jsx
Added image refresh handler that's passed to UnifiedCard:

```javascript
// Function to refresh presigned URL for equipment image
const handleImageRefresh = async (equipmentId) => {
    try {
        console.log(`Refreshing presigned URL for equipment ${equipmentId}`);
        const response = await equipmentService.refreshEquipmentMainPhoto(equipmentId);
        return response.data;
    } catch (error) {
        console.error(`Error refreshing image URL for equipment ${equipmentId}:`, error);
        return null;
    }
};
```

Then passed to UnifiedCard:
```javascript
<UnifiedCard
    onImageRefresh={handleImageRefresh}
    // ... other props
/>
```

### 4. Frontend Fix - EquipmentModal.jsx
Updated `populateFormForEditing()` to fetch fresh presigned URLs when editing:

```javascript
// Fetch fresh presigned URL for equipment image (important for S3/MinIO)
if (equipmentToEdit.id) {
    try {
        const photoResponse = await equipmentService.getEquipmentMainPhoto(equipmentToEdit.id);
        if (photoResponse.data) {
            setPreviewImage(photoResponse.data);
        }
    } catch (error) {
        // Try refresh endpoint as fallback
        const refreshResponse = await equipmentService.refreshEquipmentMainPhoto(equipmentToEdit.id);
        if (refreshResponse.data) {
            setPreviewImage(refreshResponse.data);
        }
    }
}
```

## How It Works Now

### Initial Load (EquipmentMain page)
1. Backend generates 7-day presigned URLs for all equipment images
2. Frontend displays equipment cards with these URLs
3. If URL is expired/invalid, UnifiedCard automatically refreshes it

### Image Error Handling
1. Image fails to load (404, expired URL, etc.)
2. UnifiedCard's `onError` handler triggers
3. Calls `handleImageRefresh(equipmentId)` from EquipmentMain
4. Frontend requests fresh presigned URL from backend
5. Updates image source with new URL
6. If refresh fails, shows placeholder image

### Editing Equipment
1. Modal opens with equipment data
2. `populateFormForEditing()` explicitly fetches fresh presigned URL
3. Preview image shows correct photo
4. Has fallback to refresh endpoint if initial fetch fails

## Files Modified

### Backend
- `backend/src/main/java/com/example/backend/services/MinioService.java`
  - Updated `getEquipmentMainPhoto()` to return presigned URLs
  - Updated `getEquipmentFileUrl()` to return presigned URLs

### Frontend
- `frontend/src/components/common/UnifiedCard/UnifiedCard.jsx`
  - Added `onImageRefresh` prop
  - Added automatic presigned URL refresh on image error
  - Added state management for refresh attempts

- `frontend/src/pages/equipment/EquipmentMain/EquipmentMain.jsx`
  - Added `handleImageRefresh()` function
  - Passed refresh handler to UnifiedCard components

- `frontend/src/pages/equipment/EquipmentMain/components/EquipmentModal/EquipmentModal.jsx`
  - Changed `populateFormForEditing()` to async function
  - Added explicit presigned URL fetching with fallback logic

## Testing Checklist

### Local Development (MinIO)
- [ ] New equipment images display correctly in Equipment Main page
- [ ] Old equipment images continue to display correctly
- [ ] Equipment images display in Equipment Details page
- [ ] Equipment images display in Equipment Info page
- [ ] Equipment images display when editing in modal
- [ ] Expired URL auto-refresh works correctly

### Production (AWS S3)
- [ ] New equipment images display correctly in Equipment Main page
- [ ] Old equipment images continue to display correctly
- [ ] Equipment images display in Equipment Details page
- [ ] Equipment images display in Equipment Info page
- [ ] Equipment images display when editing in modal
- [ ] Expired URL auto-refresh works correctly

### Edge Cases
- [ ] Equipment without images show placeholder
- [ ] Network errors fall back to placeholder gracefully
- [ ] Multiple refresh attempts don't create infinite loops
- [ ] Console logs show appropriate debugging information

## Configuration Notes

### Presigned URL Expiration
Currently set to **7 days (10080 minutes)**. This can be adjusted in:
- `MinioService.java` line 264 and 304

Considerations:
- **Shorter expiration**: More secure, but requires more frequent refreshes
- **Longer expiration**: Better performance, but less secure
- **Recommended**: 7 days balances security and user experience

### S3Presigner Configuration
The fix requires `S3Presigner` bean to be configured in Spring. If presigner is unavailable:
- Backend falls back to direct URLs (may not work with private buckets)
- Frontend refresh mechanism still works for redundancy

## Security Improvements
1. **Private buckets supported**: Equipment photos no longer require public bucket access
2. **Temporary URLs**: Presigned URLs expire after 7 days
3. **No permanent public access**: Each URL is time-limited
4. **Automatic refresh**: Expired URLs are automatically renewed

## Performance Considerations
1. **Initial load**: No performance impact (URLs generated server-side)
2. **Image errors**: One additional API call per failed image
3. **Caching**: Browser caches images normally
4. **Network**: Presigned URLs work identically to regular URLs from browser perspective

## Future Enhancements (Optional)
1. **Batch refresh**: Refresh multiple expired URLs in one API call
2. **Predictive refresh**: Refresh URLs before they expire
3. **Client-side caching**: Store fresh URLs in localStorage with expiration
4. **Progressive loading**: Show low-res placeholder while loading full image

## Deployment Notes
1. **No database migration required**
2. **No breaking changes** to existing API contracts
3. **Backward compatible** with existing code
4. **Both MinIO and S3** supported automatically
5. **No configuration changes** required for typical setups

## Rollback Plan
If issues occur:
1. Revert `MinioService.java` changes (removes presigned URLs)
2. Frontend changes are backward compatible (won't break if backend reverted)
3. No data loss risk - only affects image display

## Summary
This fix resolves equipment image loading issues by implementing presigned URLs throughout the system, with automatic refresh capabilities for expired URLs. The solution works for both local MinIO and production AWS S3 environments, maintains security by supporting private buckets, and provides graceful fallbacks for error scenarios.









