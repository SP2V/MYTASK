import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PRIORITY_META } from '@/lib/constants'
import type { DashboardStats } from '@/features/dashboard/lib/dashboard-stats'
import type { Category } from '@/features/categories/schemas/category.schema'
import { TASK_PRIORITIES } from '@/features/tasks/schemas/task.schema'

const CHART_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#64748b',
]

interface DashboardChartsProps {
  stats: DashboardStats
  categories: Category[]
}

export default function DashboardCharts({ stats, categories }: DashboardChartsProps) {
  const priorityData = TASK_PRIORITIES.map((p) => ({
    name: PRIORITY_META[p].label,
    value: stats.byPriority[p],
  }))

  const categoryData = stats.byCategory
    .map((entry) => ({
      name: entry.categoryId
        ? (categories.find((c) => c.id === entry.categoryId)?.name ?? 'Unknown')
        : 'Uncategorized',
      value: entry.count,
    }))
    .filter((entry) => entry.value > 0)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Tasks by Priority</CardTitle>
        </CardHeader>
        <CardContent className="h-64 pt-0">
          {priorityData.every((d) => d.value === 0) ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No active tasks yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid horizontal={false} strokeOpacity={0.2} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={64} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {priorityData.map((_entry, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tasks by Category</CardTitle>
        </CardHeader>
        <CardContent className="h-64 pt-0">
          {categoryData.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No active tasks yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {categoryData.map((_entry, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
