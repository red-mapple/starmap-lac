import type { CityId, CountryId } from '../types/travel'
import { privateEditorState } from 'virtual:starmap-private-data'

export type LocalEditorCountry = {
  id: CountryId
  nameZh: string
  nameEn: string
  countryCode: string
  centerLat: number
  centerLng: number
  region?: string
  visitedDate?: string
}

export type LocalCityNameOverride = {
  nameZh?: string
  nameEn?: string
}

export type TravelAtlasEditorState = {
  schemaVersion: 1
  addedCountries: LocalEditorCountry[]
  countryOrder: CountryId[]
  hiddenCountryIds: CountryId[]
  cityOrderByCountry: Record<CountryId, CityId[]>
  hiddenCityIds: CityId[]
  cityNameOverrides: Record<CityId, LocalCityNameOverride>
  droneTitleByCity: Record<CityId, string>
  mediaOrderByCity: Record<CityId, string[]>
  hiddenMediaIds: string[]
  coverMediaByCity: Record<CityId, string>
  droneOrderByCity: Record<CityId, string[]>
  hiddenDroneMediaIds: string[]
  updatedAt?: string
}

const emptyEditorState: TravelAtlasEditorState = {
  schemaVersion: 1,
  addedCountries: [],
  countryOrder: [],
  hiddenCountryIds: [],
  cityOrderByCountry: {},
  hiddenCityIds: [],
  cityNameOverrides: {},
  droneTitleByCity: {},
  mediaOrderByCity: {},
  hiddenMediaIds: [],
  coverMediaByCity: {},
  droneOrderByCity: {},
  hiddenDroneMediaIds: [],
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')

const isStringArrayRecord = (value: unknown): value is Record<string, string[]> =>
  Boolean(value)
  && typeof value === 'object'
  && Object.values(value as Record<string, unknown>).every(isStringArray)

const isStringRecord = (value: unknown): value is Record<string, string> =>
  Boolean(value)
  && typeof value === 'object'
  && Object.values(value as Record<string, unknown>).every((item) => typeof item === 'string')

const isLocalEditorCountry = (value: unknown): value is LocalEditorCountry => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<LocalEditorCountry>
  return typeof candidate.id === 'string'
    && typeof candidate.nameZh === 'string'
    && typeof candidate.nameEn === 'string'
    && typeof candidate.countryCode === 'string'
    && typeof candidate.centerLat === 'number'
    && typeof candidate.centerLng === 'number'
}

const parseCityNameOverrides = (value: unknown): Record<string, LocalCityNameOverride> => {
  if (!value || typeof value !== 'object') return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).flatMap(([cityId, entry]) => {
      if (!entry || typeof entry !== 'object') return []
      const candidate = entry as Partial<LocalCityNameOverride>
      const nameZh = typeof candidate.nameZh === 'string' && candidate.nameZh.trim() ? candidate.nameZh.trim() : undefined
      const nameEn = typeof candidate.nameEn === 'string' && candidate.nameEn.trim() ? candidate.nameEn.trim() : undefined
      if (!nameZh && !nameEn) return []
      return [[cityId, { ...(nameZh ? { nameZh } : {}), ...(nameEn ? { nameEn } : {}) }]]
    }),
  )
}

const parseEditorState = (value: unknown): TravelAtlasEditorState | undefined => {
  if (!value || typeof value !== 'object') return undefined
  const candidate = value as Partial<TravelAtlasEditorState>
  if (candidate.schemaVersion !== 1) return undefined

  return {
    schemaVersion: 1,
    addedCountries: Array.isArray(candidate.addedCountries)
      ? candidate.addedCountries.filter(isLocalEditorCountry)
      : [],
    countryOrder: isStringArray(candidate.countryOrder) ? candidate.countryOrder : [],
    hiddenCountryIds: isStringArray(candidate.hiddenCountryIds) ? candidate.hiddenCountryIds : [],
    cityOrderByCountry: isStringArrayRecord(candidate.cityOrderByCountry) ? candidate.cityOrderByCountry : {},
    hiddenCityIds: isStringArray(candidate.hiddenCityIds) ? candidate.hiddenCityIds : [],
    cityNameOverrides: parseCityNameOverrides(candidate.cityNameOverrides),
    droneTitleByCity: isStringRecord(candidate.droneTitleByCity) ? candidate.droneTitleByCity : {},
    mediaOrderByCity: isStringArrayRecord(candidate.mediaOrderByCity) ? candidate.mediaOrderByCity : {},
    hiddenMediaIds: isStringArray(candidate.hiddenMediaIds) ? candidate.hiddenMediaIds : [],
    coverMediaByCity: isStringRecord(candidate.coverMediaByCity) ? candidate.coverMediaByCity : {},
    droneOrderByCity: isStringArrayRecord(candidate.droneOrderByCity) ? candidate.droneOrderByCity : {},
    hiddenDroneMediaIds: isStringArray(candidate.hiddenDroneMediaIds) ? candidate.hiddenDroneMediaIds : [],
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : undefined,
  }
}

export const travelAtlasEditorState = parseEditorState(privateEditorState) ?? emptyEditorState

export const orderBySavedIds = <T extends { id: string }>(items: T[], savedOrder?: string[]) => {
  if (!savedOrder?.length) return items
  const rank = new Map(savedOrder.map((id, index) => [id, index]))

  return [...items].sort((left, right) => {
    const leftRank = rank.get(left.id)
    const rightRank = rank.get(right.id)
    if (leftRank === undefined && rightRank === undefined) return 0
    if (leftRank === undefined) return 1
    if (rightRank === undefined) return -1
    return leftRank - rightRank
  })
}

export const localEditorAvailable = import.meta.env.DEV && import.meta.env.MODE === 'personal'
