import { useQuery } from '@tanstack/react-query'
import { statsApi, type Stats } from '@/api/stats'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Flame, Trophy, CheckCircle2, BookOpenCheck, CalendarDays, TrendingUp } from 'lucide-react'

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}) {
  return (
    <Card className={accent ? 'border-primary/50 bg-primary/5' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon size={18} className={accent ? 'text-primary' : 'text-muted-foreground'} />
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100)
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-16 mt-1" /></CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function StatsContent({ stats }: { stats: Stats }) {
  const { streak, today, weekly } = stats
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">스트릭</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard icon={Flame} label="현재 스트릭" value={`${streak.currentStreak}일`} accent={streak.currentStreak > 0} />
          <StatCard icon={Trophy} label="최장 스트릭" value={`${streak.longestStreak}일`} />
          <StatCard
            icon={CalendarDays}
            label="마지막 학습일"
            value={streak.lastStudiedAt ?? '-'}
            sub={streak.lastStudiedAt ? undefined : '아직 TIL이 없어요'}
          />
          <StatCard icon={BookOpenCheck} label="이번 주 TIL" value={`${weekly.tilCount}일`} sub="월~오늘 기준" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">완료율</h2>
        <Card>
          <CardContent className="pt-6 space-y-5">
            <ProgressBar
              value={today.taskCompletionRate}
              label={`오늘 태스크 완료율 (${today.completedTasks}/${today.totalTasks})`}
            />
            <ProgressBar
              value={weekly.taskCompletionRate}
              label={`이번 주 태스크 완료율 (${weekly.completedTasks}/${weekly.totalTasks})`}
            />
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">요약</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={CheckCircle2}
            label="오늘 완료 태스크"
            value={today.completedTasks}
            sub={`전체 ${today.totalTasks}개`}
          />
          <StatCard
            icon={TrendingUp}
            label="이번 주 완료 태스크"
            value={weekly.completedTasks}
            sub={`전체 ${weekly.totalTasks}개`}
          />
        </div>
      </section>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['stats'],
    queryFn: () => statsApi.get().then((r) => r.data.data),
  })

  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">안녕하세요, {user?.nickname}님 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">{today}</p>
      </div>
      {isLoading && <LoadingSkeleton />}
      {isError && <p className="text-destructive text-sm">통계를 불러오는 데 실패했습니다.</p>}
      {data && <StatsContent stats={data} />}
    </div>
  )
}
