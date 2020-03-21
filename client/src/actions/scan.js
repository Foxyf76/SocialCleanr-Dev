import { cleanResults } from '../helpers/classificationHelper';
import axios from 'axios';
import { asyncForEach } from '../helpers/generalHelpers';
import { setAlert } from './alert';

export const runAutomatedScan = (type, data) => async dispatch => {
  try {
    let results = [];
    let count = [];

    // increment scan count by one, the rest will be determined from the scan
    let totalCount = {
      flagged_text: 0,
      flagged_clothing: 0,
      flagged_gesture: 0,
      flagged_age: 0,
      automated_scans: 1
    };

    await asyncForEach(data, async content => {
      let response = await axios({
        method: 'post',
        url: '/api/classifier/automated-scan',
        data: {
          type: type,
          data: content
        }
      });

      let filteredResults = cleanResults(response.data, content);
      results.push(filteredResults.flaggedContent);
      count.push(filteredResults.count);
    });

    const resultsFlattened = [].concat.apply([], results);
    const countFlattened = [].concat.apply([], count);

    // add each count for every scan together
    countFlattened.forEach(count => {
      for (let [key, val] of Object.entries(count)) {
        totalCount[key] += val;
      }
    });

    await axios.post('/api/classifier/write-statistics', totalCount);

    dispatch(setAlert('Scan Complete', 'success'));

    return resultsFlattened;
  } catch (err) {
    dispatch(setAlert(err.response.data.msg, 'error'));
    return [];
  }
};

// cors error when retrieving from frontend
export const getImageAsBase64 = async image => {
  let response = await axios({
    method: 'post',
    url: '/api/classifier/get-image',
    data: {
      image: image
    }
  });
  // add header to image
  let base64 = 'data:image/jpeg;base64,' + response.data.toString();

  await axios.post('/api/classifier/write-statistics', { images_cleaned: 1 });

  return base64;
};
