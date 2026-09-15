import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HomeSectionFallback } from '@/components/home/HomeSectionFallback'

describe('HomeSectionFallback', () => {
  it('keeps a semantic page heading visible while daily data loads', () => {
    const html = renderToStaticMarkup(
      <HomeSectionFallback label="La tua giornata" heading="Ciao, Simone." tall />,
    )

    expect(html).toContain('<h1')
    expect(html).toContain('Ciao, Simone.')
  })
})
