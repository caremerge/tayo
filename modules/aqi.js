const axios = require("axios");

const strings = {
  AQI_TOKEN: process.env.AQI_API_TOKEN,
  BASE_URL: "https://api.waqi.info/feed/",
  INVALID_CITY_ERROR: "Invalid city/station",
  AQI_NOT_FOUND_ERROR: "Sorry, no results available for provided city/station!",
};
const aqiLevels = [
  {
    level: "Good",
    description:
      "Air quality is considered satisfactory, and air pollution poses little or no risk",
  },
  {
    level: "Moderate",
    description:
      "Air quality is acceptable; however, for some pollutants there may be a moderate health concern for a very small number of people who are unusually sensitive to air pollution.",
  },
  {
    level: "Unhealthy for Sensitive Groups",
    description:
      "Members of sensitive groups may experience health effects. The general public is not likely to be affected.",
  },
  {
    level: "Unhealthy",
    description:
      "Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects",
  },
  {
    level: "Very Unhealthy",
    description:
      "Health warnings of emergency conditions. The entire population is more likely to be affected.",
  },
  {
    level: "Hazardous",
    description:
      "Health alert: everyone may experience more serious health effects",
  },
];

const formatAQIResponse = function (result, text) {
  let aqi = parseInt(result);
  switch (true) {
    case aqi >= 0 && aqi <= 50:
      return `:large_green_circle: *${aqi}: Air Quality in ${text} is ${aqiLevels[0]["level"]}*\n\n${aqiLevels[0]["description"]}`;
    case aqi >= 51 && aqi <= 100:
      return `:large_yellow_circle: *${aqi}: Air Quality in ${text} is ${aqiLevels[1]["level"]}*\n\n${aqiLevels[1]["description"]}`;
    case aqi >= 101 && aqi <= 150:
      return `:large_orange_circle: *${aqi}: Air Quality in ${text} is ${aqiLevels[2]["level"]}*\n\n${aqiLevels[2]["description"]}`;
    case aqi >= 151 && aqi <= 200:
      return `:red_circle: *${aqi}: Air Quality in ${text} is ${aqiLevels[3]["level"]}*\n\n${aqiLevels[3]["description"]}`;
    case aqi >= 201 && aqi <= 300:
      return `:large_purple_circle: *${aqi}: Air Quality in ${text} is ${aqiLevels[4]["level"]}*\n\n${aqiLevels[4]["description"]}`;
    case aqi >= 301:
      return `:large_brown_circle: *${aqi}: Air Quality in ${text} is ${aqiLevels[5]["level"]}*\n\n${aqiLevels[5]["description"]}`;
    default:
      return strings.AQI_NOT_FOUND_ERROR;
  }
};

exports.getAQI = async function (keyword) {
  let url = strings.BASE_URL + keyword + "/?token=" + strings.AQI_TOKEN;
  try {
    const { data: result } = await axios.get(url);
    if (!result || result.status != "ok") {
      return strings.INVALID_CITY_ERROR;
    } else if (result.data.length == 0 || result.data.aqi == "-") {
      return strings.AQI_NOT_FOUND_ERROR;
    }
    return formatAQIResponse(result.data.aqi, keyword);
  } catch (error) {
    console.log(error);
  }
};
