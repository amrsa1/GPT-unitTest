import { compareStringWithNumber } from 'utils/utility'
import { COUNTRY_OVERSEAS, TSupportedCountry } from '../constants/countries.constant'
import { appConfig } from '~/app.config'
import { IResponseAddress, IResponseLocation } from '~/pages/my-dash/shared/dossiers.model'
import { requestFields } from '~/shared/constants/request-fields.constant'
import { ICoordinates } from '~/shared/models/geo-info.model'
import { TGeoPrecision } from '~/shared/modules/map/map-markers/map-markers.model'
import { _ } from '~/shared/utils/lodash'

export interface IAddress {
  name?: string
  country?: { code: string; name?: string }
  street?: string
  houseNumber?: string
  buildingName?: string
  unitIdentifier?: string
  postCode?: string
  city?: string
  formatted_address?: string
}

export interface INormalizedAddress {
  name?: string
  country: { code: string; name?: string }
  street?: string
  houseNumber?: string
  buildingName?: string
  unitIdentifier?: string
  postCode?: string
  city?: string
  uprn?: string // Special UK unit identifiers
  formatted_address?: string
  coordinates: ICoordinates
  unitChanged?: boolean
}

export interface IAddressGoogle {
  addressComponents: google.maps.GeocoderAddressComponent[]
  address: string
  coordinates: {
    latitude: number
    longitude: number
  }
}

export interface ILocation {
  address: IAddress
  coordinates?: ICoordinates
  uprn?: string
}

export const ADDRESS_ERRORS = {
  ADDRESS_INVALID: 'addressInvalid',
}

/**
 * Return true if the address is considered valid
 */
export function validateAddress (address: INormalizedAddress): boolean {
  if (!address) {
    return false
  }

  const postCode = address.postCode
  const city = address.city
  const countryCode = address.country?.code
  const isUK = countryCode === 'UK' // don't check for the city in UK

  return !!(postCode && (city || isUK) && validateCountry(countryCode))
}

/**
 * Validate country is current country of part of overseas territories
 *
 * countryCode can be represented by code or codeISO for the same country, depending on address object
 * generation source (google API returns GB as it's ISO and we use UK internally for example)
 * The best to fix this in input/output and not in validation function, but to reduce code changes and possible issues
 * we fix it like that so far
 */
export function validateCountry (countryCode?) {
  const countries = getCountryWithOverseas(appConfig.country.code) as any

  return countries.concat([appConfig.country.code, appConfig.country.codeISO]).includes(countryCode)
}

/**
 * Return a list of countries and overseas if exists
 */
export function getCountryWithOverseas (countryCode?: TSupportedCountry) {
  const overseas = countryCode && COUNTRY_OVERSEAS[countryCode]

  return overseas ? [countryCode, ...overseas] : [countryCode]
}

export function formattedAddressFromLocation (location: IResponseLocation | ILocation): string {
  const address: INormalizedAddress = {
    country: appConfig.country,
    coordinates: location.coordinates,
    ...location.address,
  }

  return getFormattedAddressString(address)
}

/**
 * Give a full address: street houseNumber, postCode city, country
 */
export function getFormattedAddressString (
  address: INormalizedAddress | IAddress | undefined,
  options: {
    includeCountry?: boolean
    includePostCode?: boolean
  } = {
    includeCountry: false,
    includePostCode: true,
  },
): string {
  if (!address) {
    return ''
  }

  const country = (_.get(address, 'country.name') && options.includeCountry) || ''
  const city = address.city || ''
  const postCode = address.postCode || ''
  const street = address.street || ''
  const houseNumber = address.houseNumber || ''
  const buildingName = address.buildingName || ''
  const unitIdentifier = address.unitIdentifier || ''

  let streetAndNumber
  let unitIdentifierString = unitIdentifier ? `-${unitIdentifier}` : ''
  const buildingNameString = buildingName ? `${buildingName}, ` : ''
  const cityString = city ? `${city}, ` : ''

  // in UK we add unit identifier in front of house number separated with a coma
  if (['UK'].includes(appConfig.country.code)) {
    unitIdentifierString = unitIdentifier ? `${unitIdentifier}, ` : ''
  }

  // in France and UK house number comes first
  if (['FR'].includes(appConfig.country.code)) {
    streetAndNumber =
      street || houseNumber ? `${houseNumber}${unitIdentifierString} ${street}, ` : ''
  } else if (['UK'].includes(appConfig.country.code)) {
    streetAndNumber =
      street || houseNumber
        ? `${unitIdentifierString}${buildingNameString}${houseNumber} ${street}, `
        : ''
  } else {
    streetAndNumber =
      street || houseNumber ? `${street} ${houseNumber}${unitIdentifierString}, ` : ''
  }

  let postCodeAndCity = postCode || city ? `${postCode} ${city}, ` : ''

  if (!options.includePostCode) {
    postCodeAndCity = city ? `${city}, ` : ''
  }

  let addressString = ''
  if (['UK'].includes(appConfig.country.code)) {
    addressString = `${streetAndNumber}${cityString}${postCode}`
  } else {
    addressString = `${streetAndNumber}${postCodeAndCity}${country}`
  }

  return addressString
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s,/g, ',')
    .replace(/^,\s?|,?\s?$/g, '')
    .replace(/,+/, ',')
}

export function getShortFormattedAddressString (
  address: INormalizedAddress | IResponseAddress,
): string {
  const street = address.street || ''
  const houseNumber = address.houseNumber || ''
  const unitIdentifier = address.unitIdentifier || ''
  const unitIdentifierString = unitIdentifier ? `-${unitIdentifier}` : ''

  let addressString = `${street} ${houseNumber}${unitIdentifierString}`

  // in France house number comes first
  if (appConfig.country.code === 'FR') {
    addressString = `${houseNumber}${unitIdentifierString} ${street}`
  }

  return addressString.trim()
}

/**
 * Spot prop at address components and return it if exist
 */
export function spotAddressComponent (
  addressComponents: google.maps.GeocoderAddressComponent[],
  propName: string,
): any {
  const spotedProp = _.find(addressComponents, (o) => {
    return o.types.includes(propName)
  })

  if (!spotedProp) {
    return ''
  }

  if (propName === 'country') {
    return {
      code: spotedProp.short_name,
      name: spotedProp.long_name,
    }
  }

  return spotedProp.long_name
}

/**
 * Normalize response address from Google geocoding service into user input model
 */
export function normalizeAddress (iaddress: IAddressGoogle) {
  const addressComponents = iaddress.addressComponents
  const address: INormalizedAddress = {} as any
  address.country = spotAddressComponent(addressComponents, 'country')

  // as Japan has no street, we create one with a subset of the info here
  if (address.country.code === 'JP') {
    const route: string[] = []
    route.push(spotAddressComponent(addressComponents, 'sublocality_level_1'))
    route.push(spotAddressComponent(addressComponents, 'sublocality_level_2'))
    route.push(spotAddressComponent(addressComponents, 'sublocality_level_3'))
    route.push(spotAddressComponent(addressComponents, 'sublocality_level_4'))
    route.push(spotAddressComponent(addressComponents, 'premise'))
    route.push(spotAddressComponent(addressComponents, 'subpremise'))
    address.street = route.join(' ').trim()
  } else {
    address.street = spotAddressComponent(addressComponents, 'route')
    address.houseNumber = spotAddressComponent(addressComponents, 'street_number')
  }

  address.city =
    spotAddressComponent(addressComponents, 'locality') ||
    spotAddressComponent(addressComponents, 'sublocality') || // for CZ
    spotAddressComponent(addressComponents, 'postal_town') // for UK

  address.postCode = spotAddressComponent(addressComponents, 'postal_code')
  address.formatted_address = getFormattedAddressString(address)
  address.coordinates = iaddress.coordinates

  return address
}

export function getAddressPrecision (similar): TGeoPrecision {
  let geoPrecision = similar.geoPrecision
  const address = similar.address || _.get(similar, 'location.address')

  if (_.isNil(geoPrecision) && address) {
    if (address.houseNumber) {
      geoPrecision = 'address'
    } else if (address.street) {
      geoPrecision = 'street'
    } else {
      geoPrecision = 'post_code'
    }
  }

  return geoPrecision
}

export function getLocationFromAddress (input): ILocation {
  const address = _.pick(input, requestFields.address).address
  const coordinates = address.coordinates || input.coordinates
  _.unset(address, 'coordinates')

  return {
    address,
    coordinates,
  }
}

export function stripHouseNumberAdditions (processedPlace: INormalizedAddress): INormalizedAddress {
  const address: INormalizedAddress = _.cloneDeep(processedPlace)

  if (!address.houseNumber || address.country.code !== 'NL') {
    return address
  }

  const houseNumber = address.houseNumber
  const houseNumberComponents = String(houseNumber).match(/^([0-9]*\/*[0-9]*)[-\s]*([a-z0-9-]*)$/i)
  const newHouseNumber = houseNumberComponents
    ? (houseNumberComponents[1] || houseNumber)?.trim()
    : ''
  const unitId = houseNumberComponents ? houseNumberComponents[2]?.trim() : null

  address.formatted_address = address.formatted_address.replace(
    `${address.street} ${houseNumber},`,
    `${address.street} ${newHouseNumber},`,
  )

  address.unitIdentifier = unitId ? unitId.toUpperCase() : null
  address.houseNumber = address.unitIdentifier
    ? `${newHouseNumber}-${address.unitIdentifier}`
    : newHouseNumber

  return address
}

export function sortAddressesList (addressList: INormalizedAddress[]) {
  return addressList.sort((a, b) => {
    const cityComparison = compareStringWithNumber(a.city, b.city)

    if (!cityComparison) {
      const streetComparison = compareStringWithNumber(a.street, b.street)

      if (!streetComparison) {
        const houseNumberComparison = compareStringWithNumber(a.houseNumber, b.houseNumber)

        if (!houseNumberComparison) {
          return compareStringWithNumber(a.unitIdentifier, b.unitIdentifier)
        } else {
          return houseNumberComparison
        }
      } else {
        return streetComparison
      }
    }

    return 0
  })
}
