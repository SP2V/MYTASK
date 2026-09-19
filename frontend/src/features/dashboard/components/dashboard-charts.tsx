import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PRIORITY_META } from '@/lib/constants'
import type { DashboardStats } from '@/features/dashboard/lib/dashboard-stats'
import type { Category } from '@/features/categories/schemas/category.schema'
import { TASK_PRIORITIES } from '@/features/tasks/schemas/task.schema'

const PRIORITY_COLOR_MAP: Record<string, string> = {
  Urgent: '#ef4444',
  High: '#f59e0b',
  Medium: '#3b82f6',
  Low: '#94a3b8',
}

const CATEGORY_PALETTE = [
  '#6366f1',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
  '#64748b',
]

interface DashboardChartsProps {
  stats: DashboardStats
  categories: Category[]
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color?: string }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length > 0) {
    const data = payload[0]
    if (data) {
      return (
        <div className="rounded-lg border border-border/80 bg-popover/95 px-3 py-2 text-xs shadow-lg backdrop-blur-md">
          <span className="font-semibold text-foreground">{data.name}</span>
          <span className="ml-2 font-mono font-bold text-primary">{data.value} tasks</span>
        </div>
      )
    }
  }
  return null
}

export default function DashboardCharts({ stats, categories }: DashboardChartsProps) {
  const priorityData = TASK_PRIORITIES.map((p) => ({
    name: PRIORITY_META[p].label,
    value: stats.byPriority[p],
    color: PRIORITY_COLOR_MAP[PRIORITY_META[p].label] ?? '#3b82f6',
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
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* Priority Bar Chart */}
      <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">Tasks by Priority</CardTitle>
        </CardHeader>
        <CardContent className="h-68 pt-2">
          {priorityData.every((d) => d.value === 0) ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
              <span className="text-2xl">🎯</span>
              <p className="text-sm font-medium text-muted-foreground">No active tasks in priority queue</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} layout="vertical" margin={{ top: 10, left: 10, right: 20, bottom: 5 }}>
                <CartesianGrid horizontal={false} stroke="currentColor" className="opacity-10" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-muted-foreground"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  className="text-muted-foreground"
                  width={68}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {priorityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Category Donut Chart */}
      <Card className="border-border/60 bg-card/80 backdrop-blur-md shadow-xs">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-foreground">Tasks by Category</CardTitle>
        </CardHeader>
        <CardContent className="h-68 pt-2">
          {categoryData.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
              <span className="text-2xl">📁</span>
              <p className="text-sm font-medium text-muted-foreground">No categorized tasks yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {categoryData.map((_entry, index) => (
                    <Cell
                      key={index}
                      fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
