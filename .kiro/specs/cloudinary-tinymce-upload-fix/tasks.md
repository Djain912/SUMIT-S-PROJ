# Implementation Plan: Cloudinary TinyMCE Upload Fix

## Overview

This implementation plan fixes the Cloudinary image upload error in TinyMCE by removing client-side URL transformation and relying on server-side upload preset configuration. The fix involves modifying the `imageUploadHandler` function in `src/components/admin/tinymce-editor.tsx` to return URLs directly without manipulation, and documenting the required Cloudinary preset configuration.

## Tasks

- [ ] 1. Remove client-side URL transformation from imageUploadHandler
  - Open `src/components/admin/tinymce-editor.tsx`
  - Locate the `imageUploadHandler` function (around line 28)
  - Remove the line that applies transformation: `const transformedUrl = result.secure_url.replace('/upload/', '/upload/c_limit,w_800,q_auto,f_auto/');`
  - Change the return statement to return `result.secure_url` directly
  - Remove the console.log for transformedUrl
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 1.1 Write property test for URL returned without modification
  - **Property 1: URL returned without modification**
  - **Validates: Requirements 1.1, 1.2, 1.3**

- [ ] 2. Add response validation to imageUploadHandler
  - [ ] 2.1 Add validation for secure_url presence
    - After parsing the JSON response, check if `result.secure_url` exists
    - If missing, throw an Error with message: "Upload response missing secure_url"
    - _Requirements: 4.1, 4.3_
  
  - [ ] 2.2 Add validation for HTTPS protocol
    - After validating secure_url presence, check if it starts with 'https://'
    - If not HTTPS, throw an Error with message: "Invalid URL protocol, expected HTTPS"
    - _Requirements: 4.2_
  
  - [ ]* 2.3 Write property tests for response validation
    - **Property 2: HTTPS URL validation**
    - **Property 4: Secure URL presence validation**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ] 3. Improve error handling in imageUploadHandler
  - [ ] 3.1 Enhance error message formatting
    - Update the error handling block to include more context
    - Ensure error messages include the Cloudinary error text
    - _Requirements: 3.1, 3.2_
  
  - [ ]* 3.2 Write property test for error handling
    - **Property 3: Error thrown on upload failure**
    - **Validates: Requirements 3.1, 3.2**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 5. Write property tests for upload configuration
  - [ ]* 5.1 Write property test for upload preset consistency
    - **Property 6: Upload preset consistency**
    - **Validates: Requirements 5.1**
  
  - [ ]* 5.2 Write property test for endpoint URL format
    - **Property 7: Endpoint URL format**
    - **Validates: Requirements 5.3**
  
  - [ ]* 5.3 Write property test for form data completeness
    - **Property 8: Form data completeness**
    - **Validates: Requirements 5.4**

- [ ]* 6. Write property test for return value validation
  - **Property 5: Return value is secure_url string**
  - **Validates: Requirements 4.4**

- [ ] 7. Document Cloudinary preset configuration
  - [ ] 7.1 Create or update documentation file
    - Create/update `docs/cloudinary-setup.md` with preset configuration instructions
    - Document the required settings for `ml_default` preset
    - Include transformation parameters: width=800, crop=limit, quality=auto, fetch_format=auto
    - Document that preset must be configured as unsigned
    - Include supported image formats: jpg, jpeg, png, gif, webp
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 8. Final checkpoint - Verify fix and test
  - Manually test image upload in TinyMCE editor
  - Verify no transformation parameters in returned URLs
  - Verify images are still optimized (check file size and format)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The core fix is in task 1 - removing the URL transformation
- Tasks 2-3 improve robustness with validation and error handling
- Task 7 documents the required Cloudinary configuration
- Property tests validate correctness across many inputs
- The Cloudinary preset must be configured separately in the Cloudinary dashboard
