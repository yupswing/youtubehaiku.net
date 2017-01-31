var haiku = null; // our player
var onYouTubeIframeAPIReady = null; // this is called when youtubeiframeapi is ready
var onWindowBlur = null;
$(function() {
  haiku = new Haiku('youtube');
  onYouTubeIframeAPIReady = haiku.onYoutubeReady;
  onWindowBlur = haiku.onBlur;
  haiku.init();
});
