export interface HomeLoaders<Daily, Finance, Newsletter> {
  daily: () => Promise<Daily>
  finance: () => Promise<Finance>
  newsletter: () => Promise<Newsletter>
}

export interface HomeLoads<Daily, Finance, Newsletter> {
  daily: Promise<Daily>
  finance: Promise<Finance>
  newsletter: Promise<Newsletter>
}

export function startHomeLoads<Daily, Finance, Newsletter>(
  loaders: HomeLoaders<Daily, Finance, Newsletter>,
): HomeLoads<Daily, Finance, Newsletter> {
  return {
    daily: loaders.daily(),
    finance: loaders.finance(),
    newsletter: loaders.newsletter(),
  }
}
