# NO LONGER WORKS

# background-timer
Allows timeouts, intervals and animations to continue in background tabs.

Timers will use regular methods when the tab is focused, and rely on timers within a small focused window when out of focus.

## Install

NPM:
```shell
npm install --save background-timer
```
```javascript
const BackgroundTimer = require('background-timer')
```

Script:
```html
<script src="dist/background-timer.js">
```
```javascript
window.BackgroundTimer
```

## Examples

```javascript
  element.addEventListener('click', function () { // must be triggered by user event
    BackgroundTimer({global: true}) // override globals with this option
  })

  window.requestAnimationFrame(function () {}, 50)
  window.setInterval(function () {}, 50)
  window.setTimeout(function () {}, 50)
  
  window.cancelAnimationFrame(id)
  window.clearInterval(id)
  window.clearTimeout(id) 
```

```javascript
  element.addEventListener('click', function () { // must be triggered by user event
    var backgroundTimer = new BackgroundTimer({global: false}) // it's cleaner to avoid globals
  })
  
  backgroundTimer.requestAnimationFrame(function () {}, 50)
  backgroundTimer.setInterval(function () {}, 50)
  backgroundTimer.setTimeout(function () {}, 50)
  
  backgroundTimer.cancelAnimationFrame(id)
  backgroundTimer.clearInterval(id)
  backgroundTimer.clearTimeout(id) 
```
