import { useId, useState } from 'react'
import { mentoringGroups, peopleGenerations } from '../../content/people'
import { buildMentoringGraph } from './graphLayout'

const graph = buildMentoringGraph(peopleGenerations, mentoringGroups)

export function MentoringGraph() {
  const id = useId().replaceAll(':', '')
  const [focused, setFocused] = useState<string | null>(null)
  return (
    <figure className="people-graph">
      <div
        className="people-graph-scroll"
        tabIndex={0}
        role="region"
        aria-label="기수별 멘토링 그래프"
        aria-describedby={`${id}-help`}
      >
        <svg
          className="people-graph-canvas"
          viewBox={`0 0 ${graph.width} ${graph.height}`}
          aria-labelledby={`${id}-title`}
        >
          <title id={`${id}-title`}>36기·37기·38기 구성원과 멘토링 연결</title>
          <defs>
            {mentoringGroups.map((group) => (
              <marker
                key={group.id}
                id={`${id}-${group.id}`}
                className={`mentoring-color-${group.id}`}
                viewBox="0 0 8 8"
                refX="8"
                refY="4"
                markerWidth="7"
                markerHeight="7"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path d="M 0 1 L 7 4 L 0 7" fill="none" stroke="currentColor" strokeWidth="1.3" />
              </marker>
            ))}
          </defs>
          {graph.rows.map((row) => (
            <g key={row.generation} className="people-graph-layer">
              <text x="12" y={row.y - 3} className="people-graph-generation">
                {row.generation}기
              </text>
              <text x="14" y={row.y + 23} className="people-graph-count">
                {row.nodes.length}명
              </text>
              {row.nodes.length > 1 && (
                <line
                  x1={row.nodes[0].x}
                  x2={row.nodes[row.nodes.length - 1].x}
                  y1={row.y}
                  y2={row.y}
                  className="people-graph-cohort"
                />
              )}
            </g>
          ))}
          <g className="people-graph-edges" aria-hidden="true">
            {graph.edges.map((edge) => (
              <path
                key={`${edge.groupId}-${edge.mentor}-${edge.mentee}`}
                d={edge.path}
                className={`people-graph-edge mentoring-color-${edge.groupId}${focused === edge.mentor || focused === edge.mentee ? ' is-highlighted' : ''}`}
                markerEnd={`url(#${id}-${edge.groupId})`}
              />
            ))}
          </g>
          {graph.rows.map((row) => (
            <g key={row.generation} aria-label={`${row.generation}기 명단`}>
              {row.nodes.map((node) => {
                const memberships = mentoringGroups.filter(
                  (group) => group.mentors.includes(node.name) || group.mentees.includes(node.name)
                )
                const description = `${node.name}, ${node.generation}기${memberships.map((group) => `, ${group.subject} ${group.mentors.includes(node.name) ? '멘토' : '멘티'}`).join('')}`
                return (
                  <g
                    key={node.name}
                    className="people-graph-person"
                    role="img"
                    aria-label={description}
                    tabIndex={0}
                    onMouseEnter={() => setFocused(node.name)}
                    onMouseLeave={() => setFocused(null)}
                    onFocus={() => setFocused(node.name)}
                    onBlur={() => setFocused(null)}
                  >
                    <title>{description}</title>
                    <circle cx={node.x} cy={node.y} r={graph.radius} />
                    <text x={node.x} y={node.y} dy=".35em" textAnchor="middle">
                      {node.name}
                    </text>
                  </g>
                )
              })}
            </g>
          ))}
        </svg>
      </div>
      <figcaption>
        <p className="people-graph-key">실선: 같은 기수 · 점선 화살표: 멘토 → 멘티</p>
        <p className="people-graph-help" id={`${id}-help`}>
          작은 화면에서는 그래프를 좌우로 움직여 볼 수 있습니다.
        </p>
        <ul className="people-graph-legend" aria-label="멘토링 과목과 시간">
          {mentoringGroups.map((group) => (
            <li key={group.id}>
              <span className={`mentoring-swatch mentoring-color-${group.id}`} aria-hidden="true" />
              <div>
                <strong>{group.subject}</strong>
                <span>{group.schedule}</span>
              </div>
            </li>
          ))}
        </ul>
        <ul className="visually-hidden" aria-label="멘토링 관계 설명">
          {mentoringGroups.map((group) => (
            <li key={group.id}>
              {group.subject}, {group.schedule}. 멘토: {group.mentors.join(', ')}. 멘티:{' '}
              {group.mentees.join(', ')}.
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  )
}
