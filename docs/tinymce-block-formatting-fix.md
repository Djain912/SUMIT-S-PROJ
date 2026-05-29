# TinyMCE Block Formatting Fix

## Issue

When changing a line to Heading 1, Heading 2, or Paragraph in the TinyMCE editor, the formatting was affecting other lines instead of just the selected line.

## Root Cause

TinyMCE's default block formatting behavior was not properly configured, causing it to apply formatting to multiple blocks or inherit styles across paragraphs.

## Solution

Added three key configuration options to the TinyMCE editor initialization:

### 1. `block_formats`

```typescript
block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4; Heading 5=h5; Heading 6=h6'
```

**Purpose**: Explicitly defines the available block formats and their corresponding HTML tags. This ensures consistent behavior when users select different heading levels or paragraph format.

**Available Formats**:
- Paragraph → `<p>` tag
- Heading 1 → `<h1>` tag
- Heading 2 → `<h2>` tag
- Heading 3 → `<h3>` tag
- Heading 4 → `<h4>` tag
- Heading 5 → `<h5>` tag
- Heading 6 → `<h6>` tag

### 2. `forced_root_block`

```typescript
forced_root_block: 'p'
```

**Purpose**: Forces TinyMCE to wrap all content in `<p>` (paragraph) tags by default. This ensures:
- Consistent block-level structure
- Each line is treated as a separate block
- Formatting changes apply only to the current block

### 3. `keep_styles`

```typescript
keep_styles: false
```

**Purpose**: Prevents style inheritance when creating new blocks. When set to `false`:
- New paragraphs don't inherit formatting from previous lines
- Heading styles don't carry over to subsequent content
- Each block maintains its own independent formatting

## How It Works

### Before the Fix

```
User types: "Line 1"
User presses Enter
User types: "Line 2"
User selects "Line 1" and changes to Heading 1
Result: Both "Line 1" AND "Line 2" become Heading 1 ❌
```

### After the Fix

```
User types: "Line 1"
User presses Enter
User types: "Line 2"
User selects "Line 1" and changes to Heading 1
Result: Only "Line 1" becomes Heading 1, "Line 2" stays as Paragraph ✅
```

## Expected Behavior

1. **Single Line Selection**: When cursor is on a line or a single line is selected, only that line's format changes
2. **Multiple Line Selection**: When multiple lines are selected, all selected lines change to the chosen format
3. **No Style Inheritance**: New lines created after a heading automatically become paragraphs
4. **Independent Blocks**: Each line/paragraph is treated as an independent block

## Testing

To verify the fix works correctly:

1. **Test 1: Single Line Format Change**
   - Type multiple lines of text
   - Place cursor on the first line
   - Change format to "Heading 1"
   - Verify only the first line becomes a heading

2. **Test 2: No Style Inheritance**
   - Create a Heading 1
   - Press Enter to create a new line
   - Type text on the new line
   - Verify the new line is a paragraph, not a heading

3. **Test 3: Multiple Line Selection**
   - Type 3 lines of text
   - Select lines 1 and 2
   - Change format to "Heading 2"
   - Verify only lines 1 and 2 become headings, line 3 stays as paragraph

4. **Test 4: Format Switching**
   - Create a Heading 1
   - Change it to Paragraph
   - Change it to Heading 2
   - Verify each change applies correctly without affecting other content

## Additional Configuration

The fix also includes:

- `forced_root_block_attrs: {}` - Ensures no default attributes are added to root blocks
- Maintains all existing TinyMCE functionality (images, tables, lists, etc.)

## Related Files

- **Modified**: `src/components/admin/tinymce-editor.tsx`
- **Configuration Section**: Lines 79-84 (approximately)

## References

- [TinyMCE Block Formats Documentation](https://www.tiny.cloud/docs/tinymce/6/content-formatting/#block_formats)
- [TinyMCE Forced Root Block Documentation](https://www.tiny.cloud/docs/tinymce/6/content-filtering/#forced_root_block)
- [TinyMCE Keep Styles Documentation](https://www.tiny.cloud/docs/tinymce/6/content-formatting/#keep_styles)
