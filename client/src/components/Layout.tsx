import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { LayoutDashboard, BookOpen, CheckSquare, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

const navItems = [
  { to: '/', label: '대시보드', icon: LayoutDashboard },
  { to: '/tils', label: 'TIL', icon: BookOpen },
  { to: '/tasks', label: '오늘의 태스크', icon: CheckSquare },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('로그아웃 되었습니다')
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-60 flex flex-col border-r border-border bg-card px-4 py-6 shrink-0">
        <div className="mb-8 px-2">
          <h1 className="text-lg font-bold text-foreground">TiL Study</h1>
          <p className="text-xs text-muted-foreground truncate mt-1">{user?.nickname}</p>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
        <Separator className="my-4" />
        <Button variant="ghost" size="sm" className="justify-start gap-3 text-muted-foreground" onClick={handleLogout}>
          <LogOut size={16} />
          로그아웃
        </Button>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  )
}
