import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tilsApi, type TilCategory } from '@/api/tils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

const CATEGORIES: { value: TilCategory; label: string }[] = [
  { value: 'CS', label: 'CS' },
  { value: 'ALGORITHM', label: '알고리즘' },
  { value: 'BACKEND', label: '백엔드' },
  { value: 'FRONTEND', label: '프론트엔드' },
  { value: 'ETC', label: '기타' },
]

export function TilFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<TilCategory>('ETC')

  const { data: existing } = useQuery({
    queryKey: ['tils', id],
    queryFn: () => tilsApi.get(id!).then((r) => r.data.data),
    enabled: isEdit,
  })

  useEffect(() => {
    if (existing) {
      setTitle(existing.title)
      setContent(existing.content)
      setCategory(existing.category)
    }
  }, [existing])

  const createMutation = useMutation({
    mutationFn: () => tilsApi.create({ title, content, category }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tils'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success('TIL이 작성되었습니다!')
      navigate('/tils')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message
      toast.error(msg ?? 'TIL 작성에 실패했습니다.')
    },
  })

  const updateMutation = useMutation({
    mutationFn: () => tilsApi.update(id!, { title, content, category }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tils'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success('TIL이 수정되었습니다!')
      navigate('/tils')
    },
    onError: () => toast.error('TIL 수정에 실패했습니다.'),
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 모두 입력해주세요.')
      return
    }
    isEdit ? updateMutation.mutate() : createMutation.mutate()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tils')}>
          <ArrowLeft size={18} />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isEdit ? 'TIL 수정' : '새 TIL 작성'}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEdit ? '내용을 수정하세요' : '오늘 배운 것을 기록하세요'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">카테고리</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  category === value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border hover:border-foreground/30'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">제목</Label>
          <Input
            id="title"
            placeholder="오늘 배운 주제를 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="content">내용 (마크다운 지원)</Label>
          <Textarea
            id="content"
            placeholder="오늘 배운 내용을 자세히 기록해보세요..."
            className="min-h-64 font-mono text-sm resize-y"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/tils')}>
            취소
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? '저장 중...' : isEdit ? '수정하기' : '작성하기'}
          </Button>
        </div>
      </form>
    </div>
  )
}
