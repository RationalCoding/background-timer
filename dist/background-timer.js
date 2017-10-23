(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.BackgroundTimer = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var getWorker = require('./worker.js')
var trueWindow

function BackgroundTimer (opts) {
  var self = this
  if (!(self instanceof BackgroundTimer)) return new BackgroundTimer(opts)
  
  opts = opts || {}
  opts.global = opts.global || false
  self._workerSupport = !!window.open
  self._callbacks = {}
  self._worker = null
  
  var methodNames = [
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'clearInterval',
    'requestAnimationFrame',
    'cancelAnimationFrame'
  ] 
  
  if (opts.global && !trueWindow) {
    // override globals (yuck, but good for monkey-patching)
    trueWindow = {}
    methodNames.forEach(function (methodName) {
      trueWindow[methodName] = window[methodName].bind(window)
      window[methodName] = self[methodName].bind(self)
    })
  } else if (!trueWindow) {
    trueWindow = window
  }
  
  if (self._workerSupport) {
    getWorker(self._onReady.bind(self))
  }
}

BackgroundTimer.prototype._onReady = function (worker) {
  var self = this
  
  self._worker = worker
  
  window.onbeforeunload = function () {
    self._worker.close()
    self._worker = null
  }

  self._worker.onmessage = self._onmessage.bind(self)
}

BackgroundTimer.prototype._onmessage = function (msg) {
  var self = this
  
  var id = msg.data
  
  if (self._callbacks[id]) self._callbacks[id]()
}

BackgroundTimer.prototype.requestAnimationFrame = function (cb) {
  var self = this
  
  var id = trueWindow.requestAnimationFrame(function () {
    if (!document.hidden || !self._worker) cb() // only use if tab is visible
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
    if (!document.hidden || !self._worker) cb() // only use if tab is visible
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
  if (!self._worker) return
  
  self._worker.postMessage({
    method: 'setInterval',
    time: time,
    id: id
  }, '*')
  
  self._callbacks[id] = cb
}

BackgroundTimer.prototype._clearWorkerInterval = function (id) {
  var self = this
  
  if (!self._workerSupport) return
  if (!self._worker) return
  
  self._worker.postMessage({
    method: 'clearInterval',
    id: id
  }, '*')
  
  delete self._callbacks[id]
}

BackgroundTimer.prototype._setWorkerTimeout = function (cb, time, id) {
  var self = this
  
  if (!self._workerSupport) return
  if (!self._worker) return
  
  self._worker.postMessage({
    method: 'setTimeout',
    time: time,
    id: id
  }, '*')
  
  self._callbacks[id] = function () {
    delete self._callbacks[id] // no longer needed
    cb()
  }
}


BackgroundTimer.prototype._clearWorkerTimeout = function (id) {
  var self = this
  
  if (!self._workerSupport) return
  if (!self._worker) return
  
  self._worker.postMessage({
    method: 'clearTimeout',
    id: id
  }, '*')
  
  delete self._callbacks[id]
}

  
module.exports = BackgroundTimer
},{"./worker.js":2}],2:[function(require,module,exports){
var workerCode = `var timerIds = {}

window.addEventListener('message', function (msg) {
  var id = msg.data.id
  switch (msg.data.method) {
    case 'setInterval':
      id = setInterval(window.opener.postMessage.bind(null, id, '*'), msg.data.time)
      timerIds[msg.data.id] = id
      break;
    case 'clearInterval':
      id = clearInterval(timerIds[msg.data.id])
      delete timerIds[msg.data.id]
      break;
    case 'setTimeout':
      id = setTimeout(function () {
        window.opener.postMessage(id, '*')
        delete timerIds[msg.data.id] // id mapping no longer needed
      }, msg.data.time)
      timerIds[msg.data.id] = id
      break;
    case 'clearTimeout':
      id = clearTimeout(timerIds[msg.data.id])
      delete timerIds[msg.data.id]
      break;
  }
})
`

module.exports = function getWorker (cb) {
  var win =  window.open('', 'timer_window'+Math.random(), 'location=no,width=1,height=1,resizable=no')
  if (!win) return // popup blocked
  
  win.document.title = 'Worker Window'
  
  var script = document.createElement('script')
  script.innerHTML = workerCode
  win.document.head.appendChild(script)
  
  cb(win)
}
},{}]},{},[1])(1)
});