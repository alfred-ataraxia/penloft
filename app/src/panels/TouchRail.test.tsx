import { render, screen, fireEvent } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { TouchRail } from './TouchRail'

it('offers the five existing tools and undo with 52px targets', () => {
  const select = vi.fn(), undo = vi.fn()
  render(<TouchRail activeTool="Rectangle" onSelectTool={select} onUndo={undo} />)
  for (const name of ['Select', 'Line', 'Rectangle', 'Push/Pull', 'Orbit']) {
    const button = screen.getByRole('button', { name })
    expect(button.style.minHeight).toBe('52px')
    expect(button.style.minWidth).toBe('52px')
    fireEvent.click(button)
    expect(select).toHaveBeenLastCalledWith(name)
  }
  expect(screen.getByRole('button', { name: 'Rectangle' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
  expect(undo).toHaveBeenCalledOnce()
})
