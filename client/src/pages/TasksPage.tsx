import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi, type Task } from '@/api/tasks'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const todayDate = () => new Date().toISOString().slice(0, 10)

function TaskItem({
  task,
  onToggle,
  onDelete,
  onUpdate,
  isToggling,
  isDeleting,
}: {
  task: Task
  onToggle: () => void
  onDelete: () => void
  onUpdate: (title: string) => void
  isToggling: boolean
  isDeleting: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(task.title)

  const commitEdit = () => {
    const trimmed = editValue.trim()
    if (!trimmed) { setEditValue(task.title); setEditing(false); return }
    if (trimmed !== task.title) onUpdate(trimmed)
    setEditing(false)
  }

  return (
    <Card className={cn('transition-opacity', isDeleting && 'opacity-40')}>
      <CardContent className="flex items-center gap-3 py-3 px-4">
        <Checkbox
          checked={task.isCompleted}
          disabled={isToggling}
          onCheckedChange={onToggle}
          className="shrink-0"
        />
        {editing ? (
          <>
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') { setEditValue(task.title); setEditing(false) }
              }}
              className="flex-1 h-7 text-sm"
              autoFocus
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500" onClick={commitEdit}><Check size={14} /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditValue(task.title); setEditing(false) }}><X size={14} /></Button>
          </>
        ) : (
          <>
            <span className={cn('flex-1 text-sm', task.isCompleted && 'line-through text-muted-foreground')}>
              {task.title}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setEditing(true)}>
              <Pencil size={13} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive" onClick={onDelete} disabled={isDeleting}>
              <Trash2 size={13} />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function TasksPage() {
  const [newTitle, setNewTitle] = useState('')
  const qc = useQueryClient()
  const date = todayDate()

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', date],
    queryFn: () => tasksApi.list(date).then((r) => r.data.data),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tasks', date] })
    qc.invalidateQueries({ queryKey: ['stats'] })
  }

  const createMutation = useMutation({
    mutationFn: (title: string) => tasksApi.create({ title, date }),
    onSuccess: () => { invalidate(); setNewTitle('') },
    onError: () => toast.error('태스크 추가에 실패했습니다.'),
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => tasksApi.toggle(id),
    onSuccess: invalidate,
    onError: () => toast.error('상태 변경에 실패했습니다.'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => tasksApi.update(id, title),
    onSuccess: invalidate,
    onError: () => toast.error('수정에 실패했습니다.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: invalidate,
    onError: () => toast.error('삭제에 실패했습니다.'),
  })

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newTitle.trim()
    if (!trimmed) return
    createMutation.mutate(trimmed)
  }

  const completed = tasks?.filter((t) => t.isCompleted).length ?? 0
  const total = tasks?.length ?? 0

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">오늘의 태스크</h1>
        <p className="text-sm text-muted-foreground mt-1">{date}</p>
      </div>

      {!isLoading && total > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">완료</span>
            <span className="font-medium">{completed}/{total}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%' }}
            />
          </div>
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          placeholder="새 태스크를 입력하세요"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={createMutation.isPending || !newTitle.trim()} className="gap-1.5">
          <Plus size={16} />
          추가
        </Button>
      </form>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="py-3 px-4"><Skeleton className="h-5 w-full" /></CardContent></Card>
          ))}
        </div>
      )}

      {!isLoading && tasks?.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">오늘의 태스크가 없어요.</p>
          <p className="text-muted-foreground text-xs mt-1">위에서 태스크를 추가해보세요!</p>
        </div>
      )}

      {tasks && tasks.length > 0 && (
        <div className="space-y-2">
          {tasks.map((task: Task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={() => toggleMutation.mutate(task.id)}
              onDelete={() => deleteMutation.mutate(task.id)}
              onUpdate={(title) => updateMutation.mutate({ id: task.id, title })}
              isToggling={toggleMutation.isPending && toggleMutation.variables === task.id}
              isDeleting={deleteMutation.isPending && deleteMutation.variables === task.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
