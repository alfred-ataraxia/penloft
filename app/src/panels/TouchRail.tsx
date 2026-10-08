import type { ToolRailProps } from './ToolRail'
import { TOOL_ICON_SVG } from '../tools/toolIcons'
import { InlineIcon } from './InlineIcon'

export function TouchRail({ activeTool, onSelectTool, onUndo }: Pick<ToolRailProps, 'activeTool' | 'onSelectTool'> & { onUndo: () => void }) {
  return <nav aria-label="Tablet tools" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, background: 'var(--surface-panel)', borderRight: '1px solid var(--border-hairline)', overflowY: 'auto', touchAction: 'none' }}>
    {(['Select', 'Line', 'Rectangle', 'Push/Pull', 'Orbit', 'Undo'] as const).map(name => <button
      key={name} type="button" aria-label={name} aria-pressed={name === 'Undo' ? undefined : activeTool === name}
      onClick={() => name === 'Undo' ? onUndo() : onSelectTool(name)}
      style={{ minWidth: 52, minHeight: 52, padding: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 8, border: '1px solid var(--border-hairline)', background: activeTool === name ? 'var(--surface-hover)' : 'var(--surface-input)', color: 'var(--text-primary)', font: 'inherit', fontSize: 11, cursor: 'pointer' }}
    >{name !== 'Undo' && <InlineIcon svg={TOOL_ICON_SVG[name]} size={22} />}{name}</button>)}
  </nav>
}
