# Admin Guide: Working with Images in Notes

## Overview
The note editor now has enhanced image handling with automatic sizing, responsive display, and easy resizing capabilities.

## Inserting Images

### Method 1: Upload Button
1. Click the **image icon** (📷) in the toolbar
2. Click "Upload" tab
3. Select your image file
4. Image will be automatically:
   - Uploaded to Cloudinary
   - Optimized for web (max 800px width)
   - Inserted at 600px width (responsive)
   - Centered in the note

### Method 2: Paste from Clipboard
1. Copy an image (from screenshot, browser, etc.)
2. Paste directly into the editor (Ctrl+V / Cmd+V)
3. Image will be automatically sized to 600px width
4. You can resize it after pasting

### Method 3: Drag and Drop
1. Drag an image file from your computer
2. Drop it into the editor
3. Image will be uploaded and sized automatically

## Resizing Images

### Visual Resizing (Recommended)
1. Click on any image in the editor
2. You'll see **resize handles** (small squares) at the corners
3. Drag any corner to resize
4. Hold Shift while dragging to maintain aspect ratio
5. Image will remain responsive on user side

### Manual Size Entry
1. Click on the image
2. Click the image icon in toolbar (or right-click → Edit image)
3. Enter specific width/height in pixels
4. Click "Save"

## Image Best Practices

### Recommended Sizes
- **Small images**: 300-400px width
- **Medium images** (default): 600px width
- **Large images**: 800-1000px width
- **Full width**: Leave at 100% or don't specify width

### File Size Tips
- Images are automatically optimized by Cloudinary
- Original large images (5MB+) are reduced to ~200-500KB
- Format is automatically converted to WebP when supported
- No need to manually compress images before upload

### Accessibility
- Always add alt text to images:
  1. Click image
  2. Click image icon in toolbar
  3. Fill in "Alternative description" field
  4. This helps screen readers and SEO

## Tables

### Creating Tables
1. Click the **table icon** in toolbar
2. Select number of rows and columns
3. Table will have borders automatically
4. Click in cells to add content

### Table Features
- **Borders**: Automatically applied
- **Headers**: First row is styled as header
- **Responsive**: Tables scroll horizontally on mobile
- **Hover effect**: Rows highlight on hover

### Table Editing
- Right-click on table for options:
  - Insert row above/below
  - Insert column left/right
  - Delete row/column
  - Table properties

## Other Editor Features

### Fullscreen Mode
- Click the **fullscreen icon** to expand editor
- Great for writing long notes
- Press Esc or click icon again to exit

### Code View
- Click **code icon** to see HTML source
- Useful for advanced formatting
- Make sure HTML is valid before saving

### Text Formatting
- **Bold**: Ctrl+B / Cmd+B
- **Italic**: Ctrl+I / Cmd+I
- **Underline**: Ctrl+U / Cmd+U
- **Lists**: Click bullet or number icons
- **Links**: Click link icon or Ctrl+K / Cmd+K

## Preview Before Publishing

Always preview your note before publishing:
1. The preview pane shows exactly how users will see it
2. Check that:
   - Images are properly sized
   - Tables display correctly
   - Text wraps properly
   - Links work

## Troubleshooting

### Image Too Large
**Problem**: Image appears too big in editor
**Solution**: Click image and drag corner handles to resize smaller

### Image Not Uploading
**Problem**: Upload fails
**Solution**: 
- Check file size (max 10MB recommended)
- Ensure file is an image (JPG, PNG, GIF, WebP)
- Check internet connection
- Try again in a few seconds

### Table Borders Not Showing
**Problem**: Table looks plain
**Solution**: 
- Tables now have borders by default
- If not showing, try creating a new table
- Check preview pane to see final result

### Text Overflowing
**Problem**: Long URLs or text breaking layout
**Solution**: 
- Text now wraps automatically
- Long URLs will break across lines
- If still an issue, try adding spaces or hyphens

## Mobile Considerations

All content is automatically responsive:
- **Images**: Scale down to fit screen
- **Tables**: Scroll horizontally if needed
- **Text**: Wraps to screen width
- **Lists**: Properly indented

No special mobile formatting needed - it's automatic!

## Tips for Better Notes

1. **Use headings** to structure content (Blocks dropdown)
2. **Break up text** with images and lists
3. **Keep images relevant** and properly sized
4. **Use tables** for data comparison
5. **Add links** to external resources
6. **Preview often** to check formatting
7. **Save drafts** before publishing

## Need Help?

If you encounter issues:
1. Check this guide first
2. Try refreshing the page
3. Clear browser cache if problems persist
4. Contact technical support with:
   - Screenshot of the issue
   - Browser and version
   - Steps to reproduce
