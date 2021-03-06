# homebridge-http-weatherstation

This is a copy of https://github.com/ebaauw/homebridge-ws

Supports http weatherstation sensor devices on the Homebridge platform.
Additional hardware required.
See project: https://git.okoyono.de/okoyono/weatherstation/src/branch/feature/InfluxDB-Connection-Update

Only updated temperature, pressure, humidity, windspeed.
All other values aren't touched.

Temperature and Humidity is available in Apple Home app.
All other values can only be shown in a app like Eve.

You can hide the values that not will change in Eve manually

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-http-weatherstation
3. Update your configuration file. See sample-config.json in this repository for a sample.

# Configuration


Configuration sample file:

```
"platforms": [
    {
        "platform":      "homebridge-http-weatherstation",
        "name":          "Windspeed",
        "host":          "192.168.0.20:8080",
        "path":          "/api/",
        "suffix":        "weatherstation",
        "locations":     [
                            "home"
                         ]
        "timeout":       60,
    }
]
```
URL that is generated to download data: http://192.168.0.20:8080/api/weatherstation

The defined endpoint will return a json looking like this
```
{
    "temperature": 18.30,
    "humidity": 53.13,
    "lightlevel": 1576,
    "windspeed": 0.25,
    "pressure": 982.48
}
```


This plugin acts as an interface between a web endpoint and homebridge. You will need additional hardware to expose the web endpoints with the wind level information.
