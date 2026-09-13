import { NOTION_PAGES } from './client'

export interface LifeOsPrinciple {
  title: string
  description: string
  category: 'boundary' | 'rule' | 'mindset'
}

export interface LifeOsData {
  pageUrl: string
  title: string
  coreBoundaries: string[]
  operatingRules: {
    title: string
    content: string
  }[]
  lastChecked: string
}

export async function fetchLifeOsData(): Promise<LifeOsData> {
  return {
    pageUrl: `https://app.notion.com/p/Life-OS-Managing-${NOTION_PAGES.lifeOsManaging.replace(/-/g, '')}`,
    title: 'Life OS Managing',
    coreBoundaries: [
      'Nessun impegno o decisione pianificata autonomamente dall’AI senza consenso esplicito.',
      'L’umano vive la vita come persona, non come macchina iper-ottimizzata.',
      '5° anno di liceo trattato con piena normalità (nessuna ansia da esame o maturità).',
      'Modalità predefinita: leggere, proporre e consigliare liberamente senza bloccare.',
      'Gestione intelligente dello stress con emergency mode nei giorni ad alta intensità.',
    ],
    operatingRules: [
      {
        title: 'Core Operating Boundary',
        content:
          'L’AI suggerisce e supporta la gestione delle risorse (energia, tempo, corpo, mente). Non pianifica o riempie l’agenda di sua iniziativa.',
      },
      {
        title: 'Regola del 5° Anno di Liceo',
        content:
          'Trattare quest’anno con piena normalità (come 2°, 3° o 4° anno). Non introdurre urgenza artificiale o pressioni sull’esame.',
      },
      {
        title: 'Gestione Stress & Emergenze',
        content:
          'Nei giorni densi (studio ad alta priorità + allenamenti intensivi + impegni), fornire suggerimenti concreti e predittivi, riducendo il carico decisionale.',
      },
    ],
    lastChecked: new Date().toISOString(),
  }
}
