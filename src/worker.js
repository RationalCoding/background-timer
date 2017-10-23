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