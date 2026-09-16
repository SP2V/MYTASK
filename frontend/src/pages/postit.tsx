import { PageHeader } from '@/components/common/page-header'
import { PostitBoard } from '@/features/tasks/components/postit-board'

export default function PostitPage() {
  return (
    <>
      <PageHeader title="Post-it" description="Drag a note into the trash to delete it." />
      <PostitBoard />
    </>
  )
}
