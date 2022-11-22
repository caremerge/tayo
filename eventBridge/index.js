const aqi = require("../modules/aqi.js");
const axios = require("axios");

async function postOnSlack(aqiResponse) {
  let url =
    process.env.AQI_WEBHOOK;
  
  console.log("posting to url:", url);
  console.log("messge:", aqiResponse);
  try {
    response = await axios.post(
      url,
      {
        text: `${aqiResponse}`,
      },
      {
        headers: {
          "Content-type": "application/json",
        },
      }
    );
  } catch (error) {
    console.log(error);
  }
}

exports.aqiPoster = async function (cityList) {
  let aqiList = "";
  for (let city of cityList) {
    console.log("fetching for AQI for city:", city);
    aqiList += (await aqi.getAQI(city)) + "\n\n\n";
    console.log("recieved AQI for city:", city);
  }
  postOnSlack(aqiList);
};
