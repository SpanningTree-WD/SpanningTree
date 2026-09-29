import { PageHeading } from '../../components/archive/ArchiveComponents'
import { memberGeneration, mentoringGroups, peopleGenerations } from '../../content/people'

function MentoringMembers({ label, names }: { label: string; names: readonly string[] }) {
  return (
    <div className="mentoring-members">
      <p className="mentoring-role">{label}</p>
      <ul className="mentoring-names" aria-label={label}>
        {names.map((name) => (
          <li key={name}>
            <span className="person">{name}</span>
            <small>{memberGeneration(name)}기</small>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PeoplePage() {
  return (
    <div className="page-container people-page">
      <PageHeading title="People">
        함께 배우고 성장하며, 서로의 길을 잇는 사람들. 기수별 구성원과 멘토링 모임을 소개합니다.
      </PageHeading>
      <div className="people-tree">
        {peopleGenerations.map((generation) => (
          <section
            className="generation"
            key={generation.number}
            aria-labelledby={`generation-${generation.number}`}
          >
            <header className="generation-label">
              <h2 id={`generation-${generation.number}`}>{generation.number}기</h2>
              <small>{generation.members.length}명</small>
            </header>
            <ul className="nodes" aria-label={`${generation.number}기 명단`}>
              {generation.members.map((name) => (
                <li className="person" key={name}>
                  {name}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <section className="mentoring-section" aria-labelledby="mentoring-heading">
        <div className="section-head">
          <h2 id="mentoring-heading">Mentoring</h2>
          <span className="mentoring-legend">멘토 → 멘티</span>
        </div>
        <div className="mentoring-groups">
          {mentoringGroups.map((group) => (
            <section
              className="mentoring-group"
              key={group.id}
              aria-labelledby={`mentoring-${group.id}`}
            >
              <header className="mentoring-subject">
                <p>{group.schedule}</p>
                <h3 id={`mentoring-${group.id}`}>{group.subject}</h3>
              </header>
              <div className="mentoring-connection">
                <MentoringMembers label="멘토" names={group.mentors} />
                <div className="mentoring-link" aria-hidden="true">
                  <span>→</span>
                </div>
                <MentoringMembers label="멘티" names={group.mentees} />
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  )
}
