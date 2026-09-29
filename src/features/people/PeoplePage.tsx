import { PageHeading } from '../../components/archive/ArchiveComponents'
import { MentoringGraph } from './MentoringGraph'

export function PeoplePage() {
  return (
    <div className="page-container people-page">
      <PageHeading title="People">
        함께 배우고 성장하며, 서로의 길을 잇는 사람들. 기수별 구성원과 멘토링의 연결을 한눈에
        봅니다.
      </PageHeading>
      <MentoringGraph />
    </div>
  )
}
