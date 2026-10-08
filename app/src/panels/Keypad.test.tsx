import { render, screen, fireEvent } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Keypad } from './Keypad'
import { parseLengthToMeters } from '../settings/units'

it('feeds the existing unit-aware VCB without focusing a native text input', () => {
  let text = ''
  const values: number[] = []
  render(<Keypad value="" onKey={key => {
    if (key === 'Enter') { values.push(parseLengthToMeters(text)! * 1000); text = '' }
    else text += key
  }} />)
  fireEvent.click(screen.getByRole('button', { name: 'Measurements' }))
  for (const key of ['2', 'm', 'Enter', '3', '0', '0', '0', 'mm', 'Enter']) {
    const button = screen.getByRole('button', { name: key, exact: true })
    expect(button.style.minHeight).toBe('52px')
    expect(button.style.minWidth).toBe('52px')
    fireEvent.click(button)
  }
  expect(values).toEqual([2000, 3000])
  expect(document.querySelector('input')).toBeNull()
})
