# LeadFlip Theme System

The application now features **6 beautiful themes** including 3 bubble tea-inspired color schemes!

## Available Themes

### Standard Themes

#### 🌞 Light
- Clean, bright interface with high contrast
- Default theme for new users
- Perfect for daytime use

#### 🌙 Dark
- Easy on the eyes in low-light conditions
- Reduces eye strain for extended use
- Sleek, modern appearance

#### 🌅 Warm
- Sunset-inspired orange and amber tones
- Cozy, comfortable atmosphere
- Great for evening work sessions

### Bubble Tea Themes 🧋

#### 💜 Taro (Purple Milk Tea)
- Soft purple and lavender hues
- Inspired by taro bubble tea
- Elegant and sophisticated
- **Colors**: Purple primary (#9B7BD8), lavender accents
- Perfect for a calming, creative workspace

#### 🍵 Matcha (Green Tea)
- Fresh green and earthy tones
- Inspired by matcha bubble tea
- Natural and refreshing
- **Colors**: Matcha green (#6B9362), sage accents
- Ideal for focus and productivity

#### 🍈 Honeydew (Melon Milk Tea)
- Light yellow-green and citrus tones
- Inspired by honeydew bubble tea
- Sweet and cheerful
- **Colors**: Honeydew (#B8C972), lime accents
- Brings energy and positivity to your workspace

## How to Switch Themes

1. **Click the theme toggle button** in the top-right corner (sun/moon icon)
2. **Select your preferred theme** from the dropdown menu
3. **Themes are organized into**:
   - **Standard Themes**: Light, Dark, Warm
   - **Bubble Tea Themes**: Taro, Matcha, Honeydew

## Theme Persistence

Your theme preference is automatically saved and will persist across:
- Page refreshes
- Browser sessions
- Different devices (when logged in)

## Technical Details

All themes are implemented using CSS custom properties (CSS variables) and are fully responsive. The theme system uses `next-themes` for seamless client-side theme switching with no flash of unstyled content.

### Color Scheme Variables

Each theme defines the following color tokens:
- `--background` / `--foreground` - Base colors
- `--card` / `--card-foreground` - Card containers
- `--primary` / `--primary-foreground` - Primary actions
- `--secondary` / `--secondary-foreground` - Secondary elements
- `--accent` / `--accent-foreground` - Accent highlights
- `--muted` / `--muted-foreground` - Subtle elements
- `--destructive` - Error/warning states
- `--border` / `--input` / `--ring` - UI elements
- `--chart-1` through `--chart-5` - Data visualization colors

## Adding New Themes

To add a new theme:

1. **Add CSS class to `src/app/globals.css`**:
```css
.your-theme-name {
  --background: [hsl values];
  --foreground: [hsl values];
  /* ... all other CSS variables */
}
```

2. **Add menu item to `src/components/ui/theme-toggle.tsx`**:
```tsx
<DropdownMenuItem onClick={() => setTheme("your-theme-name")}>
  <YourIcon className="mr-2 h-4 w-4" />
  Your Theme Name
</DropdownMenuItem>
```

3. **Choose an appropriate Lucide icon** that represents your theme

## Design Philosophy

The bubble tea themes were designed to:
- Provide a fun, unique alternative to standard themes
- Maintain excellent readability and contrast ratios
- Use colors inspired by actual bubble tea flavors
- Create distinct visual identities for different moods/contexts

Enjoy your personalized LeadFlip experience! 🎨🧋
