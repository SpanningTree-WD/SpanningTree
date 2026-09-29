import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Unit tests never read the production database, even when .env.local uses Firebase.
vi.stubEnv('VITE_PUBLIC_DATA_SOURCE', 'local')
vi.stubGlobal('scrollTo', vi.fn())
