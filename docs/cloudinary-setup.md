# Cloudinary Setup Guide

## Overview

This guide explains how to configure Cloudinary for image uploads in the TinyMCE editor. The application uses unsigned uploads with server-side transformations configured via upload presets.

## Upload Preset Configuration

### Required Preset: `ml_default`

The TinyMCE editor uses an unsigned upload preset named `ml_default`. This preset must be configured in your Cloudinary dashboard with the following settings:

#### Signing Mode
- **Type**: Unsigned
- **Preset Name**: `ml_default`

#### Transformation Settings

Configure the following transformations to automatically optimize uploaded images:

| Setting | Value | Description |
|---------|-------|-------------|
| **Crop Mode** | `limit` | Resize to fit within bounds while maintaining aspect ratio |
| **Width** | `800` pixels | Maximum width for uploaded images |
| **Quality** | `auto` | Automatic quality optimization based on content |
| **Format** | `auto` | Automatic format selection (WebP for supported browsers) |

#### Allowed Image Formats

The preset should allow uploads of the following image formats:
- `jpg` / `jpeg`
- `png`
- `gif`
- `webp`

### Configuration Steps

1. **Log in to Cloudinary Dashboard**
   - Navigate to [cloudinary.com](https://cloudinary.com)
   - Sign in to your account

2. **Access Upload Presets**
   - Go to Settings → Upload
   - Click on "Upload presets" tab

3. **Create New Preset**
   - Click "Add upload preset"
   - Set preset name to `ml_default`
   - Set signing mode to "Unsigned"

4. **Configure Transformations**
   - In the "Edit" section, find "Incoming Transformation"
   - Add a new transformation with these parameters:
     ```
     Crop: limit
     Width: 800
     Quality: auto
     Fetch Format: auto
     ```

5. **Set Allowed Formats**
   - In the "Upload Manipulations" section
   - Set "Allowed formats" to: `jpg,jpeg,png,gif,webp`

6. **Save Preset**
   - Click "Save" to create the preset

### Example Preset Configuration (JSON)

If you're using the Cloudinary API to create the preset programmatically:

```json
{
  "name": "ml_default",
  "unsigned": true,
  "transformation": [
    {
      "width": 800,
      "crop": "limit",
      "quality": "auto",
      "fetch_format": "auto"
    }
  ],
  "allowed_formats": ["jpg", "jpeg", "png", "gif", "webp"]
}
```

## Environment Variables

Ensure the following environment variable is set in your `.env.local` file:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
```

Replace `your_cloud_name_here` with your actual Cloudinary cloud name (found in your Cloudinary dashboard).

## How It Works

### Upload Flow

1. User inserts or pastes an image in the TinyMCE editor
2. The `imageUploadHandler` function uploads the image to Cloudinary
3. Cloudinary applies the transformations defined in the `ml_default` preset
4. Cloudinary returns a `secure_url` pointing to the optimized image
5. The editor displays the optimized image

### Why Server-Side Transformations?

Previously, the application attempted to apply transformations by modifying the returned URL on the client side. This approach failed because:

- **Unsigned uploads don't support URL-based transformations**: Cloudinary requires signed URLs for on-the-fly transformations
- **Security**: URL manipulation can be bypassed by users
- **Reliability**: Server-side transformations are guaranteed to be applied

By configuring transformations in the upload preset:
- Images are automatically optimized during upload
- No client-side URL manipulation is needed
- The returned URL already points to the optimized image
- Unsigned uploads work correctly

## Image Optimization Benefits

The configured transformations provide:

1. **Responsive Images**: Maximum width of 800px ensures images fit well on most screens
2. **Automatic Quality**: Cloudinary optimizes quality based on image content
3. **Modern Formats**: Automatic WebP conversion for browsers that support it
4. **Bandwidth Savings**: Optimized images load faster and use less bandwidth
5. **Aspect Ratio Preservation**: The `limit` crop mode maintains original proportions

## Troubleshooting

### Upload Fails with "Invalid preset"

**Problem**: The `ml_default` preset doesn't exist or is misconfigured.

**Solution**: 
1. Verify the preset exists in your Cloudinary dashboard
2. Ensure the preset name is exactly `ml_default` (case-sensitive)
3. Confirm the preset is set to "Unsigned" mode

### Images Not Optimized

**Problem**: Uploaded images are not being resized or optimized.

**Solution**:
1. Check that transformations are configured in the preset
2. Verify the transformation parameters match the values above
3. Test by uploading a large image (>800px width) and checking the result

### Environment Variable Not Found

**Problem**: Upload fails with undefined cloud name.

**Solution**:
1. Ensure `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set in `.env.local`
2. Restart the development server after adding the variable
3. Verify the variable name matches exactly (including the `NEXT_PUBLIC_` prefix)

## Security Considerations

### Unsigned Uploads

Unsigned uploads are appropriate for this use case because:
- They're used in an admin interface (authenticated users only)
- The upload preset restricts allowed formats and transformations
- Cloudinary provides rate limiting and abuse prevention

### Additional Security Measures

Consider implementing:
- **File size limits**: Add `max_file_size` to the preset (e.g., 10MB)
- **Upload rate limiting**: Use Cloudinary's rate limiting features
- **Content moderation**: Enable Cloudinary's moderation features if needed

## Additional Resources

- [Cloudinary Upload Presets Documentation](https://cloudinary.com/documentation/upload_presets)
- [Cloudinary Transformation Reference](https://cloudinary.com/documentation/transformation_reference)
- [Unsigned Upload Documentation](https://cloudinary.com/documentation/upload_images#unsigned_upload)
