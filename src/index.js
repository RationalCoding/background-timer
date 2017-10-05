var getWorker = require('./worker.js')
var trueWindow

function BackgroundTimer (opts) {
  var self = this
  if (!(self instanceof BackgroundTimer)) return new BackgroundTimer(opts)
  
  opts = opts || {}
  opts.global = opts.global || false
  self._workerSupport = !!window.Worker
  self._callbacks = {}
  
  var methodNames = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame', 'cancelAnimationFrame'] 
  
  if (opts.global) {
    // override globals (yuck, but good for monkey-patching)
    trueWindow = {}
    methodNames.forEach(function (methodName) {
      trueWindow[methodName] = window[methodName].bind(window)
      window[methodName] = self[methodName].bind(self)
    })
  } else {
    trueWindow = window
  }
  
  if (self._workerSupport) {
    self._worker = getWorker()
    
    self._worker.onmessage = self._onmessage.bind(self)
  }
}

BackgroundTimer.prototype._onmessage = function (msg) {
  var self = this
  
  var id = msg.data
  
  if (self._callbacks[id]) self._callbacks[id]()
}

BackgroundTimer.prototype.requestAnimationFrame = function (cb) {
  var self = this
  
  var id = trueWindow.requestAnimationFrame(function () {
    if (!document.hidden) cb() // only use if tab is visible
  })
  
  self._setWorkerTimeout(function () {
    if (document.hidden) cb()
  }, 50, id) // 50ms interval since workers have no requestAnimationFrame
  
  return id
}

BackgroundTimer.prototype.cancelAnimationFrame = function (id) {
  var self = this
  
  trueWindow.cancelAnimationFrame(id)
  self._clearWorkerInterval(id)
}

BackgroundTimer.prototype.setInterval = function (cb, time) {
  var self = this
  
  var id = trueWindow.setInterval(function () {
    if (!document.hidden) cb() // only use if tab is visible
  }, time)
  
  self._setWorkerInterval(function () {
    if (document.hidden) cb()
  }, time, id)
  
  return id
}

BackgroundTimer.prototype.clearInterval = function (id) {
  var self = this
  
  trueWindow.clearInterval(id)
  self._clearWorkerInterval(id)
}

BackgroundTimer.prototype.setTimeout = function (cb, time) {
  var self = this
  
  var fired = false
  var id = trueWindow.setTimeout(function () {
    if (!fired) {
      cb()
      fired = true // only the first will fire
    }
  }, time)
  
  self._setWorkerTimeout(function () {
    if (!fired) {
      cb()
      fired = true
    }
  }, time, id)
  
  return id
}

BackgroundTimer.prototype.clearTimeout = function (id) {
  var self = this
  
  trueWindow.clearTimeout(id)
  self._clearWorkerTimeout(id)
}

BackgroundTimer.prototype._setWorkerInterval = function (cb, time, id) {
  var self = this
  
  if (!self._workerSupport) return
  
  self._worker.postMessage({
    method: 'setInterval',
    time: time,
    id: id
  })
  
  self._callbacks[id] = cb
}

BackgroundTimer.prototype._clearWorkerInterval = function (id) {
  var self = this
  
  if (!self._workerSupport) return
  
  self._worker.postMessage({
    method: 'clearInterval',
    id: id
  })
  
  delete self._callbacks[id]
}

BackgroundTimer.prototype._setWorkerTimeout = function (cb, time, id) {
  var self = this
  
  if (!self._workerSupport) return
  
  self._worker.postMessage({
    method: 'setTimeout',
    time: time,
    id: id
  })
  
  self._callbacks[id] = function () {
    delete self._callbacks[id] // no longer needed
    cb()
  }
}


BackgroundTimer.prototype._clearWorkerTimeout = function (id) {
  var self = this
  
  if (!self._workerSupport) return
  
  self._worker.postMessage({
    method: 'clearTimeout',
    id: id
  })
  
  delete self._callbacks[id]
}

  
module.exports = BackgroundTimer