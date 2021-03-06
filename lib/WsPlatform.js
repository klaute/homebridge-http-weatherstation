// homebridge-ws/lib/WsPlatform.js
// Copyright © 2018-2022 Erik Baauw. All rights reserved.
//
// Homebridge plugin for virtual weather station.
//
// Modified by: Kai Lauterbach (05/2022)

'use strict'

const events = require('events')
const homebridgeLib = require('homebridge-lib')
const WsAccessory = require('./WsAccessory')

class WsPlatform extends homebridgeLib.Platform {
  constructor (log, configJson, homebridge, bridge) {
    super(log, configJson, homebridge)
    this.knownLocations = {}
    this
      .on('accessoryRestored', this.accessoryRestored)
      .once('heartbeat', this.init)

    // Set default values in config
    this.config = {
      cityIds: [],
      name: 'WeatherStation',
      timeout: 15,
      locations: []
    }
    const optionParser = new homebridgeLib.OptionParser(this.config, true)
    optionParser.stringKey('name')
    optionParser.stringKey('host')
    optionParser.stringKey('path')
    optionParser.stringKey('suffix')
    optionParser.stringKey('platform')
    optionParser.listKey('cityIds')
    optionParser.stringKey('apikey', true)
    optionParser.intKey('dailyForecasts', 0, 7)
    optionParser.intKey('hourlyForecasts', 0, 47)
    optionParser.listKey('locations')
    optionParser.boolKey('noLeak')
    optionParser.intKey('timeout', 1, 60)
    optionParser.on('userInputError', (message) => {
      this.warn('config.json: %s', message)
    })
    try {
      optionParser.parse(configJson)
      this.config.locations = this.config.locations.concat(this.config.cityIds)
      if (this.config.locations.length === 0) {
        this.warn('config.json: no locations nor city ids')
      }
      this.wsAccessories = {}
      this._client = new homebridgeLib.HttpClient({
        https: false,
        host: this.config.host,
        json: true,
        maxSockets: 1,
        path: this.config.path,
        suffix: '', // will be added in async weather/onecall
        timeout: this.config.timeout,
        validStatusCodes: [200, 404]
      })
      this._client
        .on('error', (error) => {
          this.log(
            'request %d: %s %s', error.request.id,
            error.request.method, error.request.resource
          )
          this.warn(
            'request %d: %s', error.request.id, error
          )
        })
        .on('request', (request) => {
          this.debug(
            'request %d: %s %s', request.id,
            request.method, request.resource
          )
          this.vdebug(
            'request %d: %s %s', request.id,
            request.method, request.url
          )
        })
        .on('response', (response) => {
          this.vdebug(
            'request %d: response: %j', response.request.id,
            response.body
          )
          this.debug(
            'request %d: %d %s', response.request.id,
            response.statusCode, response.statusMessage
          )
        })
    } catch (error) {
      this.error(error)
    }
  }

  async init (beat) {
    const jobs = []
    for (const location of this.config.locations) {
      try {
        let name, id, lat, lon
        if (this.knownLocations[location] != null) {
          const context = this.knownLocations[location]
          name = context.location
          id = context.cityId
          lat = context.lat
          lon = context.lon
        } else {
          const { body } = await this.platform.weather(location)
          name = this.config.locations[0]
          id = 1
          lat = 0
          lon = 0
        }
        if (this.wsAccessories[name] != null) {
          this.warn('%s: ignore duplicate location %s', location, name)
          continue
        }
        const latitude = lat < 0 ? lat * -1 + '°S' : lat + '°N'
        const longitude = lon < 0 ? lon * -1 + '°W' : lon + '°E'
        this.log('%s [%s]: %s, %s', name, id, latitude, longitude)
        const params = {
          location: name,
          cityId: id,
          lon,
          lat,
          dailyForecasts: this.config.dailyForecasts,
          hourlyForecasts: this.config.hourlyForecasts,
          noLeak: this.config.noLeak
        }
        const wsAccessory = new WsAccessory(this, params)
        jobs.push(events.once(wsAccessory, 'initialised'))
        this.wsAccessories[name] = wsAccessory
      } catch (error) {
        this.error(error)
        this.warn(
          '%s: ignore unknown %s', location,
          typeof location === 'number' ? 'city id' : 'location'
        )
      }
    }
    for (const job of jobs) {
      await job
    }
    this.debug('initialised')
    this.emit('initialised')
  }

  accessoryRestored (className, version, id, name, context) {
    try {
      if (className === 'WsAccessory' && context.cityId != null) {
        this.knownLocations[context.location] = context
        this.knownLocations[context.cityId] = context
      }
    } catch (error) { this.error(error) }
  }

  // TODO One persisted logLevel for all accessories
  // get logLevel () { return 3 }

  async weather (location) {
    this.vdebug("%s : async weather call", this.config.name)
    const response = await this._client.get(this.config.suffix)
    this.vdebug("%s : async weather response = %s", this.config.name, response)
    if (response.body.cod !== 200) {
      const error = new homebridgeLib.HttpClient.HttpError(
        `status: ${response.body.cod} ${response.body.message}`,
        response.request
      )
      this.log(
        'request %d: %s %s', error.request.id,
        error.request.method, error.request.resource
      )
      this.warn(
        'request %d: %s', error.request.id, error
      )
      throw error
    }
    return response
  }

  async onecall () {
    this.vdebug("%s : onecall", this.config.name)
    this.config.recv_data = this._client.get(this.config.suffix)
    this.vdebug("%s : onecall data = %s", this.config.name, this.config.recv_data)
    return this.config.recv_data
  }
}

module.exports = WsPlatform
