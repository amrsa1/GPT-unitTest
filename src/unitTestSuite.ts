//IM DONE
import { expect } from 'chai';
import { compareStringWithNumber } from 'utils/utility'
import { COUNTRY_OVERSEAS, TSupportedCountry } from '../constants/countries.constant'
import { appConfig } from '~/app.config'
import { IResponseAddress, IResponseLocation } from '~/pages/my-dash/shared/dossiers.model'
import { requestFields } from '~/shared/constants/request-fields.constant'
import { ICoordinates } from '~/shared/models/geo-info.model'
import { TGeoPrecision } from '~/shared/modules/map/map-markers/map-markers.model'
import { _ } from '~/shared/utils/lodash'
import { 
  IAddress, 
  INormalizedAddress, 
  IAddressGoogle, 
  ILocation, 
  validateAddress, 
  validateCountry, 
  getCountryWithOverseas, 
  formattedAddressFromLocation, 
  getFormattedAddressString, 
  getShortFormattedAddressString, 
  spotAddressComponent, 
  normalizeAddress, 
  getAddressPrecision, 
  getLocationFromAddress, 
  stripHouseNumberAdditions, 
  sortAddressesList 
} from './src/accessibility-page.component';

describe('Accessibility Page Component', () => {
  it('should validate address', () => {
    const address: INormalizedAddress = {
      name: 'John Doe',
      country: { code: 'US', name: 'United States' },
      street: '123 Main St',
      houseNumber: 'Apt 4',
      postCode: '12345',
      city: 'Anytown'
    };
    const result = validateAddress(address);
    expect(result).to.be.true;
  });

  it('should validate country', () => {
    const result = validateCountry('US');
    expect(result).to.be.true;
  });

  it('should get country with overseas', () => {
    const result = getCountryWithOverseas('US');
    expect(result).to.deep.equal(['US']);
  });

  it('should format address from location', () => {
    const location: IResponseLocation = {
      address: {
        name: 'John Doe',
        country: { code: 'US', name: 'United States' },
        street: '123 Main St',
        houseNumber: 'Apt 4',
        postCode: '12345',
        city: 'Anytown'
      },
      coordinates: { latitude: 40.7128, longitude: -74.006 }
    };
    const result = formattedAddressFromLocation(location);
    expect(result).to.equal('123 Main St Apt 4, 12345 Anytown, United States');
  });

  it('should get formatted address string', () => {
    const address: INormalizedAddress = {
      name: 'John Doe',
      country: { code: 'US', name: 'United States' },
      street: '123 Main St',
      houseNumber: 'Apt 4',
      postCode: '12345',
      city: 'Anytown'
    };
    const result = getFormattedAddressString(address);
    expect(result).to.equal('123 Main St Apt 4, 12345 Anytown, United States');
  });

  it('should get short formatted address string', () => {
    const address: INormalizedAddress = {
      name: 'John Doe',
      country: { code: 'US', name: 'United States' },
      street: '123 Main St',
      houseNumber: 'Apt 4',
      postCode: '12345',
      city: 'Anytown'
    };
    const result = getShortFormattedAddressString(address);
    expect(result).to.equal('123 Main St Apt 4');
  });

  it('should spot address component', () => {
    const addressComponents = [
      { types: ['route'], long_name: 'Main St' },
      { types: ['street_number'], long_name: '123' },
      { types: ['locality'], long_name: 'Anytown' },
      { types: ['postal_code'], long_name: '12345' },
      { types: ['country'], short_name: 'US', long_name: 'United States' }
    ];
    const result = spotAddressComponent(addressComponents, 'route');
    expect(result).to.equal('Main St');
  });

  it('should normalize address', () => {
    const iaddress: IAddressGoogle = {
      addressComponents: [
        { types: ['route'], long_name: 'Main St' },
        { types: ['street_number'], long_name: '123' },
        { types: ['locality'], long_name: 'Anytown' },
        { types: ['postal_code'], long_name: '12345' },
        { types: ['country'], short_name: 'US', long_name: 'United States' }
      ],
      address: '123 Main St, Anytown, US',
      coordinates: { latitude: 40.7128, longitude: -74.006 }
    };
    const result = normalizeAddress(iaddress);
    expect(result).to.deep.equal({
      country: { code: 'US', name: 'United States' },
      street: 'Main St',
      houseNumber: '123',
      city: 'Anytown',
      postCode: '12345',
      formatted_address: '123 Main St, Anytown, US',
      coordinates: { latitude: 40.7128, longitude: -74.006 }
    });
  });

  it('should get address precision', () => {
    const similar = {
      geoPrecision: 'address',
      address: {
        name: 'John Doe',
        country: { code: 'US', name: 'United States' },
        street: '123 Main St',
        houseNumber: 'Apt 4',
        postCode: '12345',
        city: 'Anytown'
      }
    };
    const result = getAddressPrecision(similar);
    expect(result).to.equal('address');
  });

  it('should get location from address', () => {
    const input = {
      address: {
        name: 'John Doe',
        country: { code: 'US', name: 'United States' },
        street: '123 Main St',
        houseNumber: 'Apt 4',
        postCode: '12345',
        city: 'Anytown',
        coordinates: { latitude: 40.7128, longitude: -74.006 }
      }
    };
    const result = getLocationFromAddress(input);
    expect(result).to.deep.equal({
      address: {
        name: 'John Doe',
        country: { code: 'US', name: 'United States' },
        street: '123 Main St',
        houseNumber: 'Apt 4',
        postCode: '12345',
        city: 'Anytown'
      },
      coordinates: { latitude: 40.7128, longitude: -74.006 }
    });
  });

  it('should strip house number additions', () => {
    const processedPlace: INormalizedAddress = {
      name: 'John Doe',
      country: { code: 'NL', name: 'Netherlands' },
      street: 'Main St',
      houseNumber: '123/4',
      city: 'Anytown',
      postCode: '12345',
      formatted_address: 'Main St 123/4, 12345 Anytown, Netherlands',
      coordinates: { latitude: 40.7128, longitude: -74.006 }
    };
    const result = stripHouseNumberAdditions(processedPlace);
    expect(result).to.deep.equal({
      name: 'John Doe',
      country: { code: 'NL', name: 'Netherlands' },
      street: 'Main St',
      houseNumber: '123',
      unitIdentifier: '4',
      city: 'Anytown',
      postCode: '123