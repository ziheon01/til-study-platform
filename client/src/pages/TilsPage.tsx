import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { tilsApi, type Til, type TilCategory } from '@/api/tils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

const CATEGORY_LABEL: Record<TilCategory, string> = {
  CS: 'CS',
  ALGORITHM: '알고리즘',
  BACKEND: '백엔드',
  FRONTEND: '프론트엔드',
  ETC: '기타',
}

const CATEGORY_COLOR: Record<TilCategory, string> = {
  CS: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  ALGORITHM: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  BACKEND: 'bg-green-500/15 text-green-400 border-green-500/30',
  FRONTEND: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  ETC: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
}

function TilCard({ til, onEdit, onDelete }: { til: Til; onEdit: (t: Til) => void; onDelete: (t: Til) => void }) {
  return (
    <Card className="hover:border-border/80 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-base font-semibold line-clamp-1">{til.title}</CardTitle>
            <p className="text-xs text-muted-foreground">{til.date}</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(til)}>
              <Pencil size={13} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(til)}>
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{til.content}</p>
        <Badge className={`text-xs border ${CATEGORY_COLOR[til.category]}`} variant="outline">
          {CATEGORY_LABEL[til.category]}
        </Badge>
      </CardContent>
    </Card>
  )
}

export function TilsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<Til | null>(null)

  const { data: tils, isLoading } = useQuery({
    queryKey: ['tils'],
    queryFn: () => tilsApi.list().then((r) => r.data.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tilsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tils'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success('TIL이 삭제되었습니다.')
      setDeleteTarget(null)
    },
    onError: () => toast.error('삭제 중 오류가 발생했습니다.'),
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">TIL</h1>
          <p className="text-sm text-muted-foreground mt-1">Today I Learned</p>
        </div>
        <Button onClick={() => navigate('/tils/new')} className="gap-2">
          <Plus size={16} /> 새 TIL 작성
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2"><Skeleton className="h-5 w-48" /></CardHeader>
              <CardContent><Skeleton className="h-16 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && tils?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground text-sm">아직 작성한 TIL이 없어요.</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={() => navigate('/tils/new')}>
            <Plus size={14} /> 첫 TIL 작성하기
          </Button>
        </div>
      )}

      {tils && tils.length > 0 && (
        <div className="space-y-4">
          {tils.map((til) => (
            <TilCard key={til.id} til={til} onEdit={(t) => navigate(`/tils/${t.id}/edit`)} onDelete={setDeleteTarget} />
          ))}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>TIL 삭제</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">"{deleteTarget?.title}"</span>을 삭제하시겠습니까?<br />
              삭제된 TIL은 복구할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>취소</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
