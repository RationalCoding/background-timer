var workerCode = `var timerIds = {}

self.onmessage = function (msg) {
  var id = msg.data.id
  switch (msg.data.method) {
    case 'setInterval':
      id = setInterval(self.postMessage.bind(null, id), msg.data.time)
      timerIds[msg.data.id] = id
      break;
    case 'clearInterval':
      id = clearInterval(timerIds[msg.data.id])
      delete timerIds[msg.data.id]
      break;
    case 'setTimeout':
      id = setTimeout(function () {
        self.postMessage(id)
        delete timerIds[msg.data.id] // id mapping no longer needed
      }, msg.data.time)
      timerIds[msg.data.id] = id
      break;
    case 'clearTimeout':
      id = clearTimeout(timerIds[msg.data.id])
      delete timerIds[msg.data.id]
      break;
  }
}
`

module.exports = function getWorker () {
  var blob = new Blob([workerCode], {
    type: 'application/javascript'
  })
  
  return new Worker(window.URL.createObjectURL(blob))
}