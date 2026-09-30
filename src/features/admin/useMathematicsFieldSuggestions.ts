import { useEffect, useState } from 'react'
import { getMathematicsFields } from '../../models/mathematicsFields'
import { mathematicsRepository } from '../../repositories/adminRepositories'

// Reuse fields from saved articles (including drafts visible to administrators).
// This does not create a separate taxonomy collection or change existing records.
export function useMathematicsFieldSuggestions() {
  const [fields, setFields] = useState<string[]>([])
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setError(false)
    mathematicsRepository.listAll()
      .then((records) => {
        if (active) setFields([...new Set(records.flatMap((record) => [...getMathematicsFields(record)]))])
      })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [attempt])
  return { fields, error, retry: () => setAttempt((value) => value + 1) }
}
