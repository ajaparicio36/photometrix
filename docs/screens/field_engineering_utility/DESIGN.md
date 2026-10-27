---
name: Field Engineering Utility
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3e4850'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6e7881'
  outline-variant: '#bec8d2'
  surface-tint: '#006591'
  primary: '#006591'
  on-primary: '#ffffff'
  primary-container: '#0ea5e9'
  on-primary-container: '#003751'
  inverse-primary: '#89ceff'
  secondary: '#855300'
  on-secondary: '#ffffff'
  secondary-container: '#fea619'
  on-secondary-container: '#684000'
  tertiary: '#006c49'
  on-tertiary: '#ffffff'
  tertiary-container: '#00b17b'
  on-tertiary-container: '#003b26'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c9e6ff'
  primary-fixed-dim: '#89ceff'
  on-primary-fixed: '#001e2f'
  on-primary-fixed-variant: '#004c6e'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 16px
  telemetry-hero:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.03em
  telemetry-hero-mobile:
    fontFamily: JetBrains Mono
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.02em
  telemetry-md:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  telemetry-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-tablet: 1rem
  gutter-desktop: 1.25rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

The design system establishes a high-precision, utilitarian aesthetic modeled after modern industrial instrumentation, calibration consoles, and building management systems (BMS). The target audience consists of commissioning electrical engineers, facility inspectors, energy compliance auditors, and academic researchers evaluating real-time ASHRAE, IESNA, and EN 12464 standards.

Visual principles:
- **Instrumentation Clarity**: Data takes precedence over decoration. Telemetry readouts mirror physical bench meters—precise, zero-fluff, and immediate.
- **Bimodal System Partitioning**: Clear visual separation between the two primary sub-systems: amber for luminous/photometric telemetry (lux, efficacy, uniformity ratios) and cyan for environmental/HVAC telemetry (temperature, CFM, relative humidity, static pressure).
- **Industrial Micro-textures**: Subtle borders, precise gridlines, and tabular mono-numeral treatments create a calibrated laboratory aesthetic.
- **Audit-Ready Legibility**: Unambiguous pass/fail indicators with high contrast ensure readability in varied field lighting conditions, from unlit mechanical plenums to direct daylight architectural atriums.

## Colors

The color architecture is built for strict functional role assignment, resisting decorative application in favor of immediate cognitive mapping.

### Primary Domain Palette
- **HVAC & Environmental (`#0EA5E9`)**: Assigned to HVAC setpoints, airflow telemetry, coil status, thermodynamic charts, and chiller/damper actuators.
- **Lighting & Photometrics (`#F59E0B`)**: Assigned to illuminance (lx), luminous flux, daylight harvesting ratios, circadian tuning curves, and fixture drivers.

### Compliance & Status States
- **Compliant / Pass (`#10B981`)**: Signals parameters meeting standard codes (e.g., target maintained lux met, HVAC comfort zone per ASHRAE 55 satisfied).
- **Anomaly / Uniformity Alert (`#F97316`)**: Flags threshold drifts, sensor calibration warnings, or light uniformity ratio deviations ($U_0 < 0.60$).
- **Non-Compliant / Critical (`#EF4444`)**: Flags catastrophic boundary violations, safety interlocks, driver failures, or air changes per hour (ACH) dropping below life safety codes.

### Structural Neutrals
- **Canvas Base (`#F8FAFC`)**: Industrial off-white that reduces glare during prolonged field tablet use.
- **Surface Elevation (`#FFFFFF`)**: Pure white containers for sensor cards, data grids, and telemetry pods.
- **Hardware Border (`#E2E8F0`)**: 1px structural hairline outlines separating discrete circuit/zone modules.
- **Primary Telemetry Text (`#0F172A`)**: Slate 900 for absolute contrast on values, headings, and active status tags.
- **Secondary Metadata Text (`#64748B`)**: Slate 500 for SI units, hardware register addresses, MAC/IP descriptors, and timestamps.

## Typography

The type scale bifurcates into two distinct functional disciplines:

1. **System Human Interface (`Inter`)**: Used for navigation headers, field descriptions, compliance state titles, and form components. Inter’s tall x-height and neutral geometry provide maximum legibility across dense administrative layouts.
2. **Telemetry & Register Readouts (`JetBrains Mono`)**: Strict tabular monospace numbers ensure values do not jitter or cause layout reflow when live stream telemetry updates (such as fluctuating lux readings or dynamic damper CFM outputs).

Typography Rules:
- SI units (`lx`, `°C`, `%RH`, `W/m²`, `ppm`) must always be rendered in `JetBrains Mono` at `font-weight: 500` and sized 2–4px smaller than their corresponding numerical values, aligned baseline-to-baseline.
- Sensor IDs (e.g., `SENS-LUM-04B`, `MODBUS-ADDR-12`) always use `label-code` in full uppercase with expanded letter-spacing.

## Layout & Spacing

The layout is built for high information density without visual crowding, accommodating dynamic telemetry streams across mobile handheld devices and wall-mounted field tablets.

### Grid & Form Factors
- **Mobile (portrait, < 600px)**: 4-column fluid layout with `margin: 1rem` and `gutter: 0.75rem`. Real-time sensor metrics deploy in 2-column card pairs or single full-width module bands.
- **Field Tablet (landscape / portrait, 600px - 1024px)**: 8-column layout with `margin: 1.5rem` and `gutter: 1rem`. Allows side-by-side floorplan zone overlays and tabular compliance matrix logs.
- **Desktop / Workstation (> 1024px)**: 12-column layout with `margin: 2rem` and `gutter: 1.25rem`, locked to a maximum container width of 1440px.

### Spatial Rhythm
- **Internal Card Padding**: Metric cards adhere strictly to `space-lg` (16px) perimeter padding to prevent high-density mono text from feeling constricted.
- **Vertical Rhythm**: Section groupings (such as between "Lighting Uniformity Matrix" and "HVAC Thermal Comfort Status") maintain a fixed `space-xl` (24px) baseline gap.

## Elevation & Depth

Visual hierarchy relies on crisp, structural separation rather than soft, deep atmospheric drops. This maintains an authentic physical instrumentation feel.

- **Flat Foundation**: The canvas base (`#F8FAFC`) anchors all child cards.
- **Hairline Framing**: Standard cards have zero drop-shadow. Separation is achieved through a sharp, high-precision border (`1px solid #E2E8F0`).
- **Tactile Surface Offset**: When a card represents an active sensor undergoing telemetry acquisition or manual calibration, apply a micro-depth shadow: `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)`.
- **Alert Elevation**: Floating calibration dialogs, threshold-override sheets, and critical life-safety warnings employ an elevated plane: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)` bordered with `#CBD5E1`.

## Shapes

The geometric framework balances contemporary software UI with industrial hardware front-panels:

- **Metric Cards & Module Containers**: Exactly `12px` border radius (`rounded-lg`), delivering structural definition without appearing overly circular or consumer-skewed.
- **Controls, Input Fields, Badges, & Buttons**: Exactly `8px` border radius (`rounded`), providing consistent tactile targets for one-handed thumb interactions in the field.
- **Telemetry Indicators & Status Dots**: Pure circular geometries (`50%` / full pill) exclusively reserved for live connection state pulses, power statuses, and pass/fail indicators.

## Components

### 1. Telemetry Metric Cards
- **Base**: `#FFFFFF` background, `1px solid #E2E8F0`, `border-radius: 12px`, `padding: 16px`.
- **Header**: Flex row with sensor label in `label-code` (`#64748B`), and an inline compliance status pill on the right.
- **Primary Metric Display**: `telemetry-hero` mono numeric string in `#0F172A`, paired with an SI unit suffix (`lx`, `°C`) in `#64748B`.
- **System Indicator Rail**: Left border accent (3px width) colored either `#F59E0B` (Lighting) or `#0EA5E9` (HVAC) to distinguish domain ownership at a glance.

### 2. Buttons & Actuators
- **Primary System Action**: `#0F172A` background, `#FFFFFF` text, `border-radius: 8px`, `font-size: 13px`, `font-weight: 600`. Hover/active state: `#1E293B`.
- **Domain Commissioning Buttons**: Outlined variants using `1.5px solid #0EA5E9` (HVAC calibration) or `1.5px solid #F59E0B` (Lighting cycle run), white background, text matching accent color.
- **Height & Touch Targets**: Minimum mobile touch target of 44px height; internal padding `10px 16px`.

### 3. Compliance Status Pills & Badges
- **Base Style**: `height: 22px`, `border-radius: 8px`, `padding: 2px 8px`, `font-family: JetBrains Mono`, `font-size: 10px`, `font-weight: 600`, uppercase text.
- **Pass Variant**: Background `#ECFDF5`, text `#065F46`, border `1px solid #A7F3D0`.
- **Warning / Anomaly Variant**: Background `#FFF7ED`, text `#9A3412`, border `1px solid #FED7AA`.
- **Non-Compliance Variant**: Background `#FEF2F2`, text `#991B1B`, border `1px solid #FECACA`.

### 4. Input Fields & Calibration Sliders
- **Numeric Calibration Inputs**: `height: 40px`, `border-radius: 8px`, `border: 1px solid #E2E8F0`, `#FFFFFF` surface. Active focus state uses a sharp `2px` focus ring in `#0EA5E9` with zero blur.
- **Domain Steppers**: Monospaced value display between standard `-` and `+` decrement/increment tap targets, optimized for field gloves.

### 5. Checkboxes, Toggles, & Radios
- **Hardware Toggles**: Track is `44px x 24px`, `#E2E8F0` when disengaged; thumb is `#FFFFFF` circle (20px). When engaged for Lighting, track turns `#F59E0B`; for HVAC, `#0EA5E9`.
- **Checkboxes**: 18px square, `border-radius: 4px`, `border: 1.5px solid #CBD5E1`. Checked state fills `#0F172A` with a white checkmark.

### 6. Domain-Specific Telemetry Gauge: Uniformity & ASHRAE Bands
- **Bar Component**: A continuous 6px high baseline track (`#F1F5F9`) with target zone tick marks rendered in `#CBD5E1`.
- **Marker / Fill**: Current measured value fills dynamically with `#10B981` (inside standard compliance limits) or shifts to `#F97316` / `#EF4444` when exceeding code thresholds.