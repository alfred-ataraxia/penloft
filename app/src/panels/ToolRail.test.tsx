import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ToolRail, RAIL_NARROW_WIDTH, RAIL_WIDE_WIDTH } from './ToolRail'
import { RAIL_GROUPS, toolsInGroup } from '../tools/toolRegistry'

const railTools = RAIL_GROUPS.flatMap((group) => toolsInGroup(group).map((t) => t.name))

describe('ToolRail narrow mode', () => {
  it('keeps every rail tool one click away', () => {
    const onSelectTool = vi.fn()
    render(
      <ToolRail
        activeTool="Select"
        onSelectTool={onSelectTool}
        onOpenPalette={vi.fn()}
        onOpenLibrary={vi.fn()}
        narrow
        onToggleNarrow={vi.fn()}
      />,
    )
    expect(railTools.length).toBeGreaterThan(0)
    for (const name of railTools) {
      const row = screen.getByRole('radio', { name })
      fireEvent.click(row)
      expect(onSelectTool).toHaveBeenLastCalledWith(name)
      expect(row).toHaveAttribute('title', expect.stringContaining(name))
    }
    expect(screen.getByRole('button', { name: 'Library' })).toBeInTheDocument()
  })

  it('shrinks the palette field to a search button and swaps the rail width', () => {
    const onOpenPalette = vi.fn()
    const { rerender } = render(
      <ToolRail activeTool="Select" onSelectTool={vi.fn()} onOpenPalette={onOpenPalette} paletteKbd="⌘/" narrow onToggleNarrow={vi.fn()} />,
    )
    const search = screen.getByRole('button', { name: 'Search tools, actions, help' })
    expect(search).toHaveAttribute('title', 'Search tools, actions, help (⌘/)')
    expect(search).not.toHaveTextContent('Search…')
    fireEvent.click(search)
    expect(onOpenPalette).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('complementary', { name: 'Tool rail' })).toHaveStyle({ width: `${RAIL_NARROW_WIDTH}px` })

    rerender(
      <ToolRail activeTool="Select" onSelectTool={vi.fn()} onOpenPalette={onOpenPalette} paletteKbd="⌘/" narrow={false} onToggleNarrow={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Search tools, actions, help' })).toHaveTextContent('Search…')
    expect(screen.getByRole('complementary', { name: 'Tool rail' })).toHaveStyle({ width: `${RAIL_WIDE_WIDTH}px` })
  })

  it('the chevron toggles, and its label and expanded state follow the mode', () => {
    const onToggleNarrow = vi.fn()
    const { rerender } = render(
      <ToolRail activeTool="Select" onSelectTool={vi.fn()} narrow={false} onToggleNarrow={onToggleNarrow} />,
    )
    const compact = screen.getByRole('button', { name: 'Compact tool rail' })
    expect(compact).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(compact)
    expect(onToggleNarrow).toHaveBeenCalledTimes(1)

    rerender(<ToolRail activeTool="Select" onSelectTool={vi.fn()} narrow onToggleNarrow={onToggleNarrow} />)
    expect(screen.getByRole('button', { name: 'Expand tool rail' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('hides the chevron when no toggle handler is given', () => {
    render(<ToolRail activeTool="Select" onSelectTool={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /tool rail/ })).toBeNull()
  })
})

describe('ToolRail radiogroup', () => {
  it.each([false, true])('holds exactly the tools as its options (narrow=%s)', (narrow) => {
    const { container } = render(
      <ToolRail
        activeTool="Select"
        onSelectTool={vi.fn()}
        onOpenPalette={vi.fn()}
        onOpenLibrary={vi.fn()}
        narrow={narrow}
        onToggleNarrow={vi.fn()}
      />,
    )
    const group = screen.getByRole('radiogroup', { name: 'Tools' })
    expect(within(group).getAllByRole('radio').map((r) => r.getAttribute('aria-label'))).toEqual(railTools)
    // The chevron, the palette field, and Library sit outside the group; the
    // narrow group dividers are decorative and hidden from assistive tech.
    expect(within(group).queryAllByRole('button')).toEqual([])
    expect(within(group).queryAllByRole('separator')).toEqual([])
    const dividers = container.querySelectorAll('[data-rail-divider]')
    expect(dividers).toHaveLength(narrow ? RAIL_GROUPS.length + 1 : 0)
    dividers.forEach((d) => expect(d).toHaveAttribute('aria-hidden', 'true'))
  })
})
