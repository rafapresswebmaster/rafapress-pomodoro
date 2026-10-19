/* External script: compatible with the installed NW.js extension-page CSP. */
window.FocusTimerWidget={render:function(view){RPGManagerFocus.renderReadout(document.getElementById('readout'),view);}};
document.querySelector('button').onclick=function(){window.FocusTimerWidget.hide?.();};
