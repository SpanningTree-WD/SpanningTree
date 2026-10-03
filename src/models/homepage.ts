import { localizedText, type Language } from '../i18n/locale'
export const homepageFonts = {
  original: { ko: '기본 · 제목 명조 / 소개 고딕', en: 'Original · serif title / sans-serif introduction' },
  sans: { ko: '고딕 · 한국어 / 영어', en: 'Sans-serif · Korean / English' },
  serif: { ko: '명조 · 한국어 / 영어', en: 'Serif · Korean / English' },
} as const
export type HomepageFont = keyof typeof homepageFonts
export interface HomepageSettings {
  schemaVersion: 1
  hero: {
    title: { ko: string; en: string }
    description: { ko: string; en: string }
    font: HomepageFont
  }
}
export const defaultHomepage: HomepageSettings = {
  schemaVersion: 1,
  hero: {
    title: { ko: 'Spanning Tree', en: 'Spanning Tree' },
    description: {
      ko: '서울과학고등학교 수학 동아리 스패닝트리\n활동 기록과 수학 자료를 제공합니다.',
      en: 'Spanning Tree, the mathematics club at Seoul Science High School.\nExplore our activities and mathematics resources.',
    },
    font: 'original',
  },
}
export function validateHomepage(value: HomepageSettings): HomepageSettings {
  if (value?.schemaVersion !== 1 || !value.hero || !Object.hasOwn(homepageFonts, value.hero.font))
    throw new Error('올바른 홈페이지 설정을 선택해 주세요.')
  for (const [key, limit] of [['title', 160], ['description', 3000]] as const) {
    const text = value.hero[key]
    if (!text || typeof text.ko !== 'string' || typeof text.en !== 'string' ||
        text.ko.length > limit || text.en.length > limit || !(text.ko.trim() || text.en.trim()))
      throw new Error(key === 'title' ? '제목은 한 언어 이상, 언어별 160자 이내로 입력해 주세요.' : '소개는 한 언어 이상, 언어별 3000자 이내로 입력해 주세요.')
  }
  return {
    schemaVersion: 1,
    hero: {
      title: { ko: value.hero.title.ko.trim(), en: value.hero.title.en.trim() },
      description: { ko: value.hero.description.ko.trim(), en: value.hero.description.en.trim() },
      font: value.hero.font,
    },
  }
}
export function homepageCopy(settings: HomepageSettings, language: Language) {
  return {
    title: localizedText(settings.hero.title, language, defaultHomepage.hero.title[language]),
    description: localizedText(settings.hero.description, language, defaultHomepage.hero.description[language]),
  }
}
