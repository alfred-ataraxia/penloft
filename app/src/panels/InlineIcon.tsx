/**
 * Inline Material Symbols icon, shared by the tool rail, the tray toggles,
 * the command palette, and the contextual dock. The source SVGs carry no
 * `fill` attribute and a fixed intrinsic size, so both are spliced onto the
 * root `<svg>` tag here — `fill="currentColor"` lets the host's `color` style
 * (active vs. idle, hover) drive the icon color without a stylesheet.
 */
export function InlineIcon({ svg, size = 16 }: { svg: string; size?: number }) {
  const sized = svg
    .replace(/\swidth="[^"]*"/, '')
    .replace(/\sheight="[^"]*"/, '')
    .replace('<svg ', `<svg fill="currentColor" width="${size}" height="${size}" `)
  return (
    <span
      aria-hidden="true"
      style={{ width: `${size}px`, height: `${size}px`, display: 'block', overflow: 'hidden', flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: sized }}
    />
  )
}
