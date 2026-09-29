import { describe, expect, it } from 'vitest'
import { mentoringGroups, peopleGenerations } from '../../content/people'
import { buildMentoringGraph, mentoringPath } from './graphLayout'

describe('layered mentoring graph', () => {
  it('places each member once on their generation with space between names', () => {
    const graph = buildMentoringGraph(peopleGenerations, mentoringGroups)
    const nodes = graph.rows.flatMap((row) => row.nodes)
    expect(nodes).toHaveLength(23)
    expect(new Set(nodes.map((node) => node.name)).size).toBe(23)
    for (const row of graph.rows) {
      expect(row.nodes.map((node) => node.name).sort()).toEqual(
        [...peopleGenerations.find((g) => g.number === row.generation)!.members].sort()
      )
      for (let i = 0; i < row.nodes.length; i++) {
        const node = row.nodes[i]
        expect(node.y).toBe(row.y)
        expect(node.x - graph.radius).toBeGreaterThan(100)
        expect(node.x + graph.radius).toBeLessThan(graph.width)
        if (i) expect(node.x - row.nodes[i - 1].x).toBeGreaterThan(graph.radius * 2)
      }
    }
  })
  it('connects only the provided mentoring groups, including same-generation and upward relations', () => {
    const graph = buildMentoringGraph(peopleGenerations, mentoringGroups)
    expect(graph.edges).toHaveLength(24)
    expect(graph.edges.some((edge) => edge.mentor === '임호준' || edge.mentee === '임호준')).toBe(
      false
    )
    for (const edge of graph.edges) {
      const group = mentoringGroups.find((group) => group.id === edge.groupId)!
      expect(group.mentors).toContain(edge.mentor)
      expect(group.mentees).toContain(edge.mentee)
    }
    const nodes = graph.rows.flatMap((row) => row.nodes)
    const byName = (name: string) => nodes.find((node) => node.name === name)!
    expect(byName('최정우').y).toBeGreaterThan(byName('장민준').y)
    expect(byName('송정한').y).toBe(byName('김윤서').y)
    expect(graph.edges.some((edge) => edge.mentor === '최정우' && edge.mentee === '장민준')).toBe(
      true
    )
    expect(graph.edges.some((edge) => edge.mentor === '송정한' && edge.mentee === '김윤서')).toBe(
      true
    )
  })
  it('routes from the correct circle boundaries without drawing through a same-row node', () => {
    const from = { name: 'mentor', generation: 37, x: 200, y: 310 }
    const coordinates = (path: string) => path.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    const same = coordinates(mentoringPath(from, { ...from, name: 'peer', x: 368 }))
    expect(same[1]).toBeLessThan(from.y)
    expect(same[3]).toBeLessThan(same[1])
    expect(same[5]).toBeLessThan(same[1])
    const up = coordinates(mentoringPath(from, { ...from, name: 'older', y: 90 }))
    expect(up[1]).toBeLessThan(from.y)
    expect(up.at(-1)).toBeGreaterThan(90)
    const down = coordinates(mentoringPath(from, { ...from, name: 'younger', y: 530 }))
    expect(down[1]).toBeGreaterThan(from.y)
    expect(down.at(-1)).toBeLessThan(530)
  })
  it('bypasses intermediate-generation people instead of implying an extra connection', () => {
    const from = { name: 'mentor', generation: 36, x: 200, y: 90 }
    const to = { name: 'mentee', generation: 38, x: 200, y: 530 }
    const middle = { name: 'unrelated', generation: 37, x: 200, y: 310 }
    const path = mentoringPath(from, to, [from, middle, to])
    const lane = Number(path.match(/ L (-?\d+(?:\.\d+)?)/)![1])
    expect(Math.abs(lane - middle.x)).toBeGreaterThan(32)
  })
  it('keeps a person in several groups as a single node and retains isolated members', () => {
    const graph = buildMentoringGraph(
      [
        { number: 1, members: ['A', 'C'] },
        { number: 2, members: ['B'] },
      ],
      [
        { id: 'one', subject: 'One', schedule: '', mentors: ['A'], mentees: ['B'] },
        { id: 'two', subject: 'Two', schedule: '', mentors: ['A'], mentees: ['B'] },
      ]
    )
    expect(
      graph.rows
        .flatMap((row) => row.nodes)
        .map((node) => node.name)
        .sort()
    ).toEqual(['A', 'B', 'C'])
    expect(graph.edges).toHaveLength(2)
  })
})
