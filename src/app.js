/*
Youtube Haiku Player 1.0.1
Author: Simone Cingano (me@yupswing.it)
Repository: https://github.com/yupswing/youtubehaiku.net
Licence: MIT
*/

var haiku = null;                   // the youtubehaiku.net player
var onYouTubeIframeAPIReady = null; // called when YouTube iFrame API is loaded
var onWindowBlur = null;            // called when the window lose focus

$(function() {
  // create the instance
  haiku = new Haiku('youtube');
  // hook the events
  onYouTubeIframeAPIReady = haiku.onYoutubeReady;
  onWindowBlur = haiku.onWindowBlur;
  // rock'n'roll
  haiku.init();
});
