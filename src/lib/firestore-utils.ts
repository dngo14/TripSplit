
import { Timestamp } from 'firebase/firestore';

// This function prepares data for Firestore by converting JS Dates to Timestamps
// and undefined values to null.
export const prepareDataForFirestore = (data: any): any => {
    if (data instanceof Timestamp || (data && typeof data === 'object' && data.constructor && data.constructor.name === 'FieldValue')) {
      return data; 
    }
    if (data instanceof Date) {
      return Timestamp.fromDate(data);
    }
    if (data === undefined) {
      return null; 
    }
    if (Array.isArray(data)) {
      return data.map(prepareDataForFirestore);
    }
    if (data && typeof data === 'object' && Object.prototype.toString.call(data) === '[object Object]' && Object.getPrototypeOf(data) === Object.prototype) {
      const res: { [key: string]: any } = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          res[key] = prepareDataForFirestore(data[key]);
        }
      }
      return res;
    }
    return data;
};

    