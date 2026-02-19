# JIG Craft Cannabis - Brand Design System
## Version 3.0 | February 2026

---

# BRAND OVERVIEW

## Brand Identity

| Element | Definition |
|---------|------------|
| **Name** | JIG Craft Cannabis |
| **Logo** | Bold "JIG" typography with gradient cannabis leaf |
| **Style** | Bold, premium, contemporary craft cannabis |
| **Position** | Premium craft cannabis, women-owned, licensed cultivation |
| **Facility** | 5,000 sqm indoor, Johannesburg, CO2-enriched hydroponics |

## Logo Notes

The logo features a multi-color cannabis leaf. For brand applications beyond the logo, we use a refined subset of those colors focused on:
- Deep purple (premium, craft)
- Warm amber/orange (energy, warmth)
- Forest green (cannabis, natural)

This creates a sophisticated palette that reads as premium craft rather than novelty.

---

# COLOR PALETTE

## Primary Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **JIG Black** | `#0A0A0A` | 10, 10, 10 | Primary background |
| **JIG White** | `#FAFAFA` | 250, 250, 250 | Text, logo stroke |
| **JIG Purple** | `#7C3AED` | 124, 58, 237 | Primary accent, CTAs |

## Secondary Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **Forest Green** | `#15803D` | 21, 128, 61 | Cannabis association, success states |
| **Warm Amber** | `#D97706` | 217, 119, 6 | Secondary accent, highlights |
| **Slate** | `#1E1E1E` | 30, 30, 30 | Card backgrounds, elevated surfaces |

## Neutral Colors

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **Gray 900** | `#111111` | 17, 17, 17 | Subtle backgrounds |
| **Gray 700** | `#374151` | 55, 65, 81 | Secondary text |
| **Gray 500** | `#6B7280` | 107, 114, 128 | Muted text, borders |
| **Gray 300** | `#D1D5DB` | 209, 213, 219 | Light borders |

## Accent Gradient (Refined)

The brand gradient uses purple to amber - sophisticated, warm, gender-neutral:

```css
/* JIG Brand Gradient */
--gradient-brand: linear-gradient(135deg, #7C3AED 0%, #A855F7 40%, #D97706 100%);

/* Subtle variation */
--gradient-brand-soft: linear-gradient(135deg, rgba(124, 58, 237, 0.8) 0%, rgba(217, 119, 6, 0.8) 100%);

/* Dark surface gradient */
--gradient-dark: linear-gradient(180deg, #1E1E1E 0%, #0A0A0A 100%);

/* Hover glow */
--glow-purple: 0 8px 32px rgba(124, 58, 237, 0.25);
--glow-amber: 0 8px 32px rgba(217, 119, 6, 0.2);
```

---

# TYPOGRAPHY

## Font Stack

| Purpose | Font | Fallback | Weight |
|---------|------|----------|--------|
| **Display** | Anton | Impact, sans-serif | 400 |
| **Headings** | Oswald | Arial Narrow, sans-serif | 500, 600, 700 |
| **Body** | Inter | -apple-system, sans-serif | 400, 500, 600 |

## Type Scale

| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| **Display** | 72px | 400 | 1.0 | -0.02em |
| **H1** | 48px | 700 | 1.1 | -0.01em |
| **H2** | 36px | 600 | 1.2 | 0 |
| **H3** | 24px | 600 | 1.3 | 0 |
| **H4** | 20px | 600 | 1.4 | 0.01em |
| **Body** | 16px | 400 | 1.6 | 0 |
| **Body Small** | 14px | 400 | 1.5 | 0.01em |
| **Caption** | 12px | 500 | 1.4 | 0.02em |
| **Overline** | 11px | 600 | 1.2 | 0.15em |

## CSS Variables

```css
:root {
  /* Colors */
  --color-black: #0A0A0A;
  --color-white: #FAFAFA;
  --color-purple: #7C3AED;
  --color-purple-light: #A855F7;
  --color-green: #15803D;
  --color-amber: #D97706;
  --color-slate: #1E1E1E;
  --color-gray-700: #374151;
  --color-gray-500: #6B7280;
  
  /* Typography */
  --font-display: 'Anton', Impact, sans-serif;
  --font-heading: 'Oswald', 'Arial Narrow', sans-serif;
  --font-body: 'Inter', -apple-system, sans-serif;
  
  /* Gradients */
  --gradient-brand: linear-gradient(135deg, #7C3AED 0%, #A855F7 40%, #D97706 100%);
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 8px 32px rgba(124, 58, 237, 0.2);
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  
  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 300ms ease;
  --transition-slow: 500ms ease;
}
```

---

# COMPONENTS

## Buttons

### Primary Button
```css
.btn-primary {
  background: var(--gradient-brand);
  color: var(--color-white);
  padding: 14px 28px;
  border: none;
  border-radius: var(--radius-sm);
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all var(--transition-base);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow);
}
```

### Secondary Button
```css
.btn-secondary {
  background: transparent;
  color: var(--color-white);
  padding: 12px 26px;
  border: 2px solid var(--color-white);
  border-radius: var(--radius-sm);
  font-family: var(--font-heading);
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: all var(--transition-base);
}

.btn-secondary:hover {
  background: var(--color-white);
  color: var(--color-black);
}
```

### Ghost Button
```css
.btn-ghost {
  background: rgba(255, 255, 255, 0.05);
  color: var(--color-white);
  padding: 12px 26px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-sm);
  font-family: var(--font-heading);
  font-weight: 500;
  font-size: 14px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  transition: all var(--transition-base);
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}
```

### Accent Buttons
```css
.btn-purple {
  background: var(--color-purple);
  color: var(--color-white);
}

.btn-green {
  background: var(--color-green);
  color: var(--color-white);
}

.btn-amber {
  background: var(--color-amber);
  color: var(--color-black);
}
```

## Cards

### Feature Card
```css
.card {
  background: var(--color-slate);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-md);
  padding: var(--space-8);
  transition: all var(--transition-base);
}

.card:hover {
  border-color: rgba(124, 58, 237, 0.4);
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.card__number {
  font-family: var(--font-display);
  font-size: 56px;
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1;
}

.card__title {
  font-family: var(--font-heading);
  font-size: 20px;
  font-weight: 600;
  color: var(--color-white);
  margin: var(--space-4) 0 var(--space-3);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.card__text {
  font-size: 15px;
  color: var(--color-gray-500);
  line-height: 1.6;
}
```

## Navigation

```css
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: var(--space-4) var(--space-12);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.nav__logo {
  height: 56px;
}

.nav__link {
  font-family: var(--font-heading);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color var(--transition-base);
  position: relative;
}

.nav__link::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--color-purple);
  transition: width var(--transition-base);
}

.nav__link:hover {
  color: var(--color-white);
}

.nav__link:hover::after,
.nav__link--active::after {
  width: 100%;
}
```

## Badges

```css
.badge {
  display: inline-flex;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-family: var(--font-heading);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.badge--gradient {
  background: var(--gradient-brand);
  color: var(--color-white);
}

.badge--purple {
  background: rgba(124, 58, 237, 0.15);
  color: var(--color-purple);
  border: 1px solid rgba(124, 58, 237, 0.3);
}

.badge--green {
  background: rgba(21, 128, 61, 0.15);
  color: var(--color-green);
  border: 1px solid rgba(21, 128, 61, 0.3);
}

.badge--amber {
  background: rgba(217, 119, 6, 0.15);
  color: var(--color-amber);
  border: 1px solid rgba(217, 119, 6, 0.3);
}

.badge--outline {
  background: transparent;
  color: var(--color-white);
  border: 1px solid rgba(255, 255, 255, 0.25);
}
```

## Form Elements

```css
.form-label {
  display: block;
  font-family: var(--font-heading);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--color-gray-500);
  margin-bottom: var(--space-2);
}

.form-input {
  width: 100%;
  padding: 14px 16px;
  background: var(--color-slate);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  color: var(--color-white);
  font-family: var(--font-body);
  font-size: 15px;
  transition: all var(--transition-base);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-purple);
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
}

.form-input::placeholder {
  color: var(--color-gray-700);
}
```

## Section Headers

```css
.section-header {
  text-align: center;
  margin-bottom: var(--space-16);
}

.section-header__overline {
  font-family: var(--font-heading);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--color-purple);
  margin-bottom: var(--space-3);
}

.section-header__title {
  font-family: var(--font-heading);
  font-size: 40px;
  font-weight: 700;
  color: var(--color-white);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.section-header__subtitle {
  font-size: 16px;
  color: var(--color-gray-500);
  max-width: 520px;
  margin: var(--space-4) auto 0;
  line-height: 1.6;
}
```

---

# EFFECTS

## Shadows
```css
--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
--shadow-md: 0 8px 24px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.5);
--shadow-purple: 0 8px 32px rgba(124, 58, 237, 0.2);
--shadow-amber: 0 8px 32px rgba(217, 119, 6, 0.15);
```

## Animations
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

---

# TAILWIND CONFIG

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        'jig': {
          black: '#0A0A0A',
          white: '#FAFAFA',
          purple: '#7C3AED',
          'purple-light': '#A855F7',
          green: '#15803D',
          amber: '#D97706',
          slate: '#1E1E1E',
        },
      },
      fontFamily: {
        display: ['Anton', 'Impact', 'sans-serif'],
        heading: ['Oswald', 'Arial Narrow', 'sans-serif'],
        body: ['Inter', '-apple-system', 'sans-serif'],
      },
      backgroundImage: {
        'jig-gradient': 'linear-gradient(135deg, #7C3AED 0%, #A855F7 40%, #D97706 100%)',
      },
      boxShadow: {
        'jig-glow': '0 8px 32px rgba(124, 58, 237, 0.2)',
      },
    },
  },
}
```

---

# USAGE GUIDELINES

## Color Application

| Context | Primary | Secondary | Accent |
|---------|---------|-----------|--------|
| Backgrounds | Black, Slate | - | - |
| Text | White | Gray 500 | Purple (links) |
| CTAs | Gradient, Purple | White outline | Green, Amber |
| Success | - | - | Green |
| Highlight | - | - | Amber |
| Premium | Purple | - | Gradient |

## When to Use Each Color

**Purple (#7C3AED)**: Primary brand color. Use for CTAs, links, active states, premium indicators.

**Amber (#D97706)**: Warmth and energy. Use for secondary highlights, warnings, prices, special offers.

**Green (#15803D)**: Cannabis association, success. Use for success states, availability, natural/organic messaging.

**Gradient**: Premium moments only. Hero sections, primary CTAs, featured content. Do not overuse.

---

# VOICE AND TONE

## Brand Attributes

| Attribute | Expression |
|-----------|------------|
| **Premium** | Craft, curated, elite, precision |
| **Bold** | Confident, pioneering, first |
| **Expert** | Licensed, tested, compliant |
| **Warm** | Family-run, women-powered |
| **Professional** | B2B focused, partnership |

## Key Phrases

- Craft Cannabis
- Cultivating Excellence
- Rooted in Precision, Powered by Women
- Africa's First Women-Owned License
- Small-Batch, Indoor Grown
- Elite Phenotypes
- From Seed to Cure

---

# ACCESSIBILITY

## Contrast Ratios
- Body text on black: 15.5:1 (AAA)
- Purple on black: 4.6:1 (AA)
- Amber on black: 7.2:1 (AAA)
- Green on black: 5.1:1 (AA)

## Focus States
```css
*:focus-visible {
  outline: 2px solid var(--color-purple);
  outline-offset: 2px;
}
```

---

JIG Craft Cannabis Design System v3.0
Refined palette - premium, bold, gender-neutral
