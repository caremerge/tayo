const aqi = require("../modules/aqi.js");

async function postOnSlack(aqiResponse) {
  let url =
    process.env.AQI_SLACK_HOOK;
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
    aqiList += (await aqi.getAQI(city)) + "\n\n\n";
  }
  postOnSlack(aqiList);
};
