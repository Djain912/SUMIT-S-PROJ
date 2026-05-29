# Requirements Document

## Introduction

This document specifies the requirements for fixing the Cloudinary image upload error in the TinyMCE editor. The current implementation fails because it applies transformation parameters to URLs when using unsigned uploads, which Cloudinary doesn't allow. The solution moves transformation configuration from client-side URL manipulation to server-side upload preset configuration.

## Glossary

- **TinyMCE_Editor**: The rich text editor component used in the admin interface
- **Cloudinary_API**: The cloud-based image and video management service API
- **Upload_Preset**: A Cloudinary configuration that defines upload settings and transformations
- **Image_Upload_Handler**: The function that handles image uploads from TinyMCE to Cloudinary
- **Transformation_Parameters**: URL parameters that modify image properties (size, quality, format)
- **Unsigned_Upload**: A Cloudinary upload method that doesn't require authentication signatures

## Requirements

### Requirement 1: Remove Client-Side URL Transformation

**User Story:** As a developer, I want to remove client-side URL transformation, so that unsigned uploads work correctly with Cloudinary.

#### Acceptance Criteria

1. WHEN the Image_Upload_Handler receives an upload response from Cloudinary_API, THE Image_Upload_Handler SHALL return the secure_url directly without modification
2. THE Image_Upload_Handler SHALL NOT apply string replacement to add transformation parameters to the returned URL
3. WHEN an image is uploaded, THE returned URL SHALL NOT contain `/upload/c_limit,w_800,q_auto,f_auto/` inserted via client-side code

### Requirement 2: Configure Server-Side Transformations

**User Story:** As a system administrator, I want image transformations configured in the Cloudinary upload preset, so that images are automatically optimized without client-side URL manipulation.

#### Acceptance Criteria

1. THE Upload_Preset named `ml_default` SHALL be configured with transformation mode set to `limit`
2. THE Upload_Preset SHALL specify a maximum width of 800 pixels
3. THE Upload_Preset SHALL enable automatic quality optimization
4. THE Upload_Preset SHALL enable automatic format selection
5. THE Upload_Preset SHALL be configured as an unsigned upload preset

### Requirement 3: Handle Upload Errors

**User Story:** As a user, I want clear error messages when image uploads fail, so that I understand what went wrong and can take corrective action.

#### Acceptance Criteria

1. WHEN Cloudinary_API returns a non-OK HTTP status, THE Image_Upload_Handler SHALL throw an Error with a descriptive message
2. WHEN an upload fails, THE error message SHALL include the error text from Cloudinary_API
3. IF the upload response cannot be parsed as JSON, THEN THE Image_Upload_Handler SHALL throw an Error indicating the parsing failure
4. WHEN an Error is thrown, THE TinyMCE_Editor SHALL display the error message to the user

### Requirement 4: Validate Upload Response

**User Story:** As a developer, I want upload responses validated, so that only valid image URLs are returned to the editor.

#### Acceptance Criteria

1. WHEN Cloudinary_API returns a successful response, THE Image_Upload_Handler SHALL verify that secure_url is present in the response
2. THE Image_Upload_Handler SHALL verify that the returned secure_url starts with `https://`
3. IF the response is missing secure_url, THEN THE Image_Upload_Handler SHALL throw an Error
4. THE Image_Upload_Handler SHALL return only the secure_url string value

### Requirement 5: Maintain Upload Configuration

**User Story:** As a developer, I want the upload configuration to remain consistent, so that the integration continues to work reliably.

#### Acceptance Criteria

1. THE Image_Upload_Handler SHALL use the upload preset named `ml_default`
2. THE Image_Upload_Handler SHALL read the Cloudinary cloud name from environment variable `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
3. THE Image_Upload_Handler SHALL upload to the endpoint `https://api.cloudinary.com/v1_1/{cloudName}/image/upload`
4. THE Image_Upload_Handler SHALL send the file and upload_preset as form data

### Requirement 6: Support Multiple Image Formats

**User Story:** As a user, I want to upload images in various formats, so that I can use the most appropriate format for my content.

#### Acceptance Criteria

1. THE Upload_Preset SHALL allow uploads of JPEG files
2. THE Upload_Preset SHALL allow uploads of PNG files
3. THE Upload_Preset SHALL allow uploads of GIF files
4. THE Upload_Preset SHALL allow uploads of WebP files
5. WHEN a supported image format is uploaded, THE Cloudinary_API SHALL accept and process the upload

### Requirement 7: Optimize Image Delivery

**User Story:** As a user, I want uploaded images to be optimized for web display, so that pages load quickly without sacrificing visual quality.

#### Acceptance Criteria

1. WHEN an image is uploaded through the Upload_Preset, THE Cloudinary_API SHALL apply width limiting to a maximum of 800 pixels
2. WHEN an image is uploaded, THE Cloudinary_API SHALL apply automatic quality optimization
3. WHEN an image is uploaded, THE Cloudinary_API SHALL apply automatic format selection based on browser support
4. WHEN an image exceeds 800 pixels width, THE Cloudinary_API SHALL resize it proportionally while maintaining aspect ratio
