# Theme Color Reference

Quick reference for all theme color schemes.

## Standard Themes

### Light Theme ☀️
```
Background: White (HSL: 0, 0%, 100%)
Foreground: Near Black (HSL: 0, 0%, 4%)
Primary: Dark Gray (HSL: 0, 0%, 9%)
Secondary: Light Gray (HSL: 0, 0%, 96%)
Accent: Light Gray (HSL: 0, 0%, 96%)
```

### Dark Theme 🌙
```
Background: Near Black (HSL: 0, 0%, 4%)
Foreground: Near White (HSL: 0, 0%, 98%)
Primary: White (HSL: 0, 0%, 98%)
Secondary: Dark Gray (HSL: 0, 0%, 15%)
Accent: Dark Gray (HSL: 0, 0%, 15%)
```

### Warm Theme 🌅
```
Background: Warm Beige (HSL: 30, 20%, 98%)
Foreground: Brown (HSL: 20, 14%, 10%)
Primary: Orange (HSL: 24, 80%, 50%)
Secondary: Golden Yellow (HSL: 45, 90%, 60%)
Accent: Warm Orange (HSL: 15, 85%, 55%)
Border: Tan (HSL: 30, 25%, 85%)
```

## Bubble Tea Themes 🧋

### Taro Theme 💜
```
Background: Light Purple (HSL: 270, 25%, 97%)
Foreground: Deep Purple (HSL: 270, 15%, 15%)
Primary: Purple (HSL: 270, 60%, 65%)
Secondary: Lavender (HSL: 280, 50%, 80%)
Accent: Bright Purple (HSL: 285, 70%, 70%)
Border: Soft Purple (HSL: 270, 20%, 88%)

Chart Colors:
- Chart 1: Purple (HSL: 270, 60%, 65%)
- Chart 2: Bright Purple (HSL: 285, 70%, 70%)
- Chart 3: Deep Purple (HSL: 260, 50%, 60%)
- Chart 4: Lilac (HSL: 275, 55%, 75%)
- Chart 5: Royal Purple (HSL: 265, 65%, 55%)
```

### Matcha Theme 🍵
```
Background: Light Green (HSL: 120, 25%, 97%)
Foreground: Dark Green (HSL: 120, 20%, 12%)
Primary: Matcha Green (HSL: 115, 50%, 45%)
Secondary: Sage Green (HSL: 125, 40%, 75%)
Accent: Forest Green (HSL: 110, 60%, 50%)
Border: Pale Green (HSL: 120, 20%, 85%)

Chart Colors:
- Chart 1: Matcha Green (HSL: 115, 50%, 45%)
- Chart 2: Tea Green (HSL: 125, 40%, 55%)
- Chart 3: Dark Green (HSL: 105, 60%, 35%)
- Chart 4: Mint Green (HSL: 130, 45%, 65%)
- Chart 5: Jade Green (HSL: 110, 55%, 50%)
```

### Honeydew Theme 🍈
```
Background: Pale Yellow-Green (HSL: 75, 30%, 96%)
Foreground: Olive (HSL: 75, 25%, 15%)
Primary: Honeydew (HSL: 75, 65%, 55%)
Secondary: Lime Cream (HSL: 70, 55%, 75%)
Accent: Bright Lime (HSL: 80, 70%, 60%)
Border: Soft Lime (HSL: 75, 25%, 82%)

Chart Colors:
- Chart 1: Honeydew (HSL: 75, 65%, 55%)
- Chart 2: Bright Lime (HSL: 80, 70%, 60%)
- Chart 3: Olive Green (HSL: 70, 55%, 50%)
- Chart 4: Yellow-Green (HSL: 85, 60%, 65%)
- Chart 5: Moss Green (HSL: 65, 50%, 45%)
```

## Color Accessibility

All themes meet **WCAG AA** contrast requirements:
- Text on background: ≥ 4.5:1 contrast ratio
- Large text on background: ≥ 3:1 contrast ratio
- Interactive elements have clear focus indicators

## HSL Color Space Benefits

Using HSL (Hue, Saturation, Lightness) allows for:
- **Easy theming**: Change hue while maintaining saturation/lightness
- **Consistent brightness**: All backgrounds have similar lightness values
- **Predictable variations**: Dark/light variations by adjusting lightness
- **Better color harmony**: Related colors share similar HSL values

## Usage in Code

Colors are accessed via CSS custom properties:

```css
.my-component {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
}
```

```tsx
// In Tailwind classes
<div className="bg-background text-foreground border-border">
  <button className="bg-primary text-primary-foreground">
    Click me
  </button>
</div>
```
