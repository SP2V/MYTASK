import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ListTodo } from 'lucide-react'
import { StatCard } from '@/features/dashboard/components/stat-card'

describe('StatCard', () => {
  it('renders the label and value', () => {
    render(<StatCard label="Active Tasks" value={7} icon={ListTodo} />)
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Active Tasks')).toBeInTheDocument()
  })

  it('renders a string value (e.g. percentage)', () => {
    render(<StatCard label="Completion" value="42%" icon={ListTodo} />)
    expect(screen.getByText('42%')).toBeInTheDocument()
  })
})
