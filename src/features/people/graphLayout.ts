import type { MentoringGroup, PeopleGeneration } from '../../models/people'

export interface PersonNode {
  name: string
  generation: number
  x: number
  y: number
}

const radius = 32
const spacing = 84
const firstColumn = 124
const rowY = (index: number) => 90 + index * 220

export function mentoringPath(from: PersonNode, to: PersonNode, nodes: PersonNode[] = []) {
  if (from.y === to.y) {
    // Same-generation links arch above the row instead of passing through people.
    const height = 48 + Math.abs(to.x - from.x) * 0.28
    const top = from.y - radius
    return `M ${from.x} ${top} C ${from.x} ${top - height}, ${to.x} ${top - height}, ${to.x} ${top}`
  }
  const direction = Math.sign(to.y - from.y)
  const start = from.y + radius * direction
  const end = to.y - radius * direction
  const intermediate = nodes.filter(
    (node) => node.y > Math.min(from.y, to.y) && node.y < Math.max(from.y, to.y)
  )
  const clearance = radius + 14
  const blocking = intermediate.filter(
    (node) =>
      node.x >= Math.min(from.x, to.x) - clearance && node.x <= Math.max(from.x, to.x) + clearance
  )
  if (blocking.length) {
    // A 36→38 edge must pass around 37th-generation nodes, not through them.
    const side = from.x <= to.x ? -1 : 1
    let lane =
      side < 0
        ? Math.min(from.x, to.x, ...blocking.map((node) => node.x)) - clearance
        : Math.max(from.x, to.x, ...blocking.map((node) => node.x)) + clearance
    while (intermediate.some((node) => Math.abs(node.x - lane) < clearance)) lane += spacing * side
    const bend = 48 * direction
    return `M ${from.x} ${start} C ${from.x} ${start + bend}, ${lane} ${start + bend}, ${lane} ${from.y + 104 * direction} L ${lane} ${to.y - 104 * direction} C ${lane} ${end - bend}, ${to.x} ${end - bend}, ${to.x} ${end}`
  }
  const middle = (start + end) / 2
  return `M ${from.x} ${start} C ${from.x} ${middle}, ${to.x} ${middle}, ${to.x} ${end}`
}

export function buildMentoringGraph(
  generations: readonly PeopleGeneration[],
  groups: readonly MentoringGroup[]
) {
  let cursor = firstColumn
  const columns = groups.map((group) => {
    const participants = new Set([...group.mentors, ...group.mentees])
    const maximum = Math.max(
      1,
      ...generations.map(
        (generation) => generation.members.filter((name) => participants.has(name)).length
      )
    )
    const width = maximum * spacing
    const column = { participants, center: cursor + width / 2, width }
    cursor += width + 20
    return column
  })
  const positions = new Map<string, PersonNode>()
  let overflow = 0
  const rows = generations.map((generation, index) => {
    const y = rowY(index)
    const nodes: PersonNode[] = []
    const place = (names: readonly string[], center: number) =>
      names.forEach((name, position) => {
        const node = {
          name,
          generation: generation.number,
          x: center + (position - (names.length - 1) / 2) * spacing,
          y,
        }
        positions.set(name, node)
        nodes.push(node)
      })
    const emptyColumns: typeof columns = []
    for (const column of columns) {
      const names = generation.members.filter(
        (name) => column.participants.has(name) && !positions.has(name)
      )
      if (names.length) place(names, column.center)
      else emptyColumns.push(column)
    }
    // People without a recorded relationship stay in their generation, without edges.
    const remaining = generation.members.filter((name) => !positions.has(name))
    for (const column of emptyColumns) {
      place(remaining.splice(0, Math.floor(column.width / spacing)), column.center)
    }
    if (remaining.length) {
      place(remaining, cursor + (remaining.length * spacing) / 2)
      overflow = Math.max(overflow, remaining.length * spacing)
    }
    return { generation: generation.number, y, nodes: nodes.sort((a, b) => a.x - b.x) }
  })
  const edges = groups.flatMap((group) =>
    group.mentors.flatMap((mentor) =>
      group.mentees.map((mentee) => {
        const from = positions.get(mentor)
        const to = positions.get(mentee)
        if (!from || !to)
          throw new Error(`Mentoring member missing from roster: ${mentor} → ${mentee}`)
        return {
          groupId: group.id,
          mentor,
          mentee,
          path: mentoringPath(from, to, [...positions.values()]),
        }
      })
    )
  )
  return {
    rows,
    edges,
    width: cursor + overflow + 12,
    height: rowY(generations.length - 1) + 66,
    radius,
  }
}
