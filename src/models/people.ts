export interface PeopleGeneration {
  number: number
  members: readonly string[]
}

export interface MentoringGroup {
  id: string
  subject: string
  schedule: string
  mentors: readonly string[]
  mentees: readonly string[]
}
