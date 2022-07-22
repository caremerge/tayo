var express = require('express');
var router = express.Router();
const moment = require('moment-timezone');
const _ = require('lodash');
const axios = require('axios');

const strings = {
  INVALID_TIMESTAMP_ERROR: 'Invalid timestamp',
  NO_TIMESTAMP_FOUND_ERROR: 'No timestamps found',
  INVALID_TIMEZONE_ERROR: 'Timezone not found in moment database',
  SERVER_ERROR: 'A server error occurred',
  AQI_TOKEN: '4f39e273ebb1af2f430f0435294f6df6f23df817',
  BASE_URL: 'https://api.waqi.info/feed/',
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

const timestampIsValid = function(timestamp) {
  if (isNaN(timestamp)) {
    return false;
  }
  return moment.unix(timestamp).isValid();
};

const formatTimestamp = function(timestamp, timezone, format) {
  if (timezone == null) {
    timezone = 'America/Chicago';
  }
  if (format == null) {
    format = 'YYYY-MM-DDTHH:mm:ssZZ';
  }
  return moment.unix(timestamp).tz(timezone).format(format);
};

const formatOutput = function(timestamp, tz, includeTimestamp, format1, format2) {
  var ts1, ts2;
  if (tz == null) {
    tz = 'America/Chicago';
  }
  if (includeTimestamp == null) {
    includeTimestamp = false;
  }
  if (format1 == null) {
    format1 = 'YYYY-MM-DDTHH:mm:ssZZ';
  }
  if (format2 == null) {
    format2 = 'ddd, MMM Do YYYY, h:mm:ssa';
  }
  ts1 = formatTimestamp(timestamp, tz, format1);
  ts2 = formatTimestamp(timestamp, tz, format2);
  if (includeTimestamp) {
    return `${timestamp} / ${tz}:  ${ts1}  -  ${ts2}`;
  }
  return `${tz}:  ${ts1}  -  ${ts2}`;
};

const sendResponse = async function(req, res, msg) {
  return res.json({
    response_type: 'in_channel',
    ...msg
  });
};

const tsController = async function(req, res) {
  const text = req.body.text;
  let match;
  const tsRegex = /\b([+-]?\d+)\b/g;
  let timestamps = (function() {
    const _results = [];
    while (match = tsRegex.exec(text)) {
      _results.push(match[1]);
    }
    return _results;
  })();
  const tzRegex = /\b([A-Za-z_\/]+)\b/g;
  let timezones = (function() {
    const _results = [];
    while (match = tzRegex.exec(text)) {
      _results.push(match[1]);
    }
    return _results;
  })();
  timestamps =  _(timestamps)
    .map(ts => parseInt(ts, 10))
    .compact()
    .value();
  if (!timestamps.length) {
    return sendResponse(req, res, {text: '```' + strings.NO_TIMESTAMP_FOUND_ERROR + '```'});
  }
  if (!timezones.length) {
    timezones = [
      'America/Chicago',
      'Etc/UTC',
      'America/New_York',
      'America/Denver',
      'America/Los_Angeles',
      'US/Central',
      'Asia/Karachi'
    ];
  }
  const timezoneList = moment.tz.names();
  let timezoneMatches = _.flatten(_.map(timezones, function(timezone) {
    return _.filter(timezoneList, function(tz) {
      return tz.toLowerCase().indexOf(timezone.toLowerCase()) >= 0;
    });
  }));
  let output = _.map(timestamps, timestamp => {
    let tsOutput = [
      `${timestamp}:`
    ];
    if (!timestampIsValid(timestamp)) {
      tsOutput.push(strings.INVALID_TIMESTAMP_ERROR);
    } else if (timezoneMatches.length === 0) {
      tsOutput.push(strings.INVALID_TIMEZONE_ERROR);
    } else {
      tsOutput = tsOutput.concat(_.map(timezoneMatches, function(tz) {
        return formatOutput(timestamp, tz);
      }));
    }
    return tsOutput;
  });
  output = _.map(output, tsBlock => tsBlock.join('\n'));
  output = output.join('\n\n');
  return sendResponse(req, res, {text: '```' + output + '```'});
};

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

async function getAQI(keyword) {
  let url = strings.BASE_URL + keyword + '/?token=' + strings.AQI_TOKEN;
  try {
    const { data: result } = await axios.get(url);
    if (!result || result.status != 'ok') {
      return strings.INVALID_CITY_ERROR;
    } else if (result.data.length == 0 || result.data.aqi == '-') {
      return strings.AQI_NOT_FOUND_ERROR;
    }
    return formatAQIResponse(result.data.aqi, keyword);
  } catch (error) {
    console.log(error);
  }
};

const weatherController = async function(req, res) {
  const text = req.body.text;
  text = text.trim().toLowerCase();
  let result;
  if (text != "") {
    result = await getAQI(text);
  } else {
    result = strings.INVALID_CITY_ERROR;
  }
  return sendResponse(req, res, {text: result});
};

/* GET home page. */
router.post('/', async function(req, res) {
  try {
    console.log(req.body);
    const command = req.body.command;
    switch(command) {
      case '/ts':
        return tsController(req, res);
      case '/weather':
        return weatherController(req, res);
      default:
        return sendResponse(req, res, {text: 'Your slash command was not recognized by Tayo!'});
    }
  } catch (e) {
    console.log(e.message, e.stack);
    return sendResponse(req, res, {text: strings.SERVER_ERROR});
  }
});

module.exports = router;
