const axios = require('axios');

export const getUser = async () => {
  let user = await axios.get('/api/passport-auth/my-facebook');
  console.log(user);
};
