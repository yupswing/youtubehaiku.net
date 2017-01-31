var Haiku = function(_player_id) {
  var player_id = _player_id;
  var player = null;
  var is_youtube_loaded = false;
  var is_reddit_loaded = false;
  var is_ready = false;
  var posts = [];
  var current = -1;
  var is_first_run = true;
  var is_player_playing = false;
  var has_started = false;

  function init() {
    // we should load the posts...
    loadReddit();
    // ...and startup the youtube api
    loadYoutube();

    setInterval(onUpdateTime, 50);

    $(window).keydown(function(event) {
      switch (event.which) {
        case 39: // [right]
        case 78: // P
          next();
          break;
        case 40: // [down]
        case 82: // R
          again();
          break;
        case 37: // [left]
          prev();
          break;
        case 76: // L
          openLink();
          break;
        case 32: // space
        case 80: // P
          playPause();
          break;
        default:
          console.log(event.which);
      }
    });
  };

  function onBlur() {
    console.log('blur');
    pause();
  };

  function onUpdateTime() {
    if (!is_ready) return;
    if (document.activeElement) document.activeElement.blur(); // blur youtube player if needed
    var post = posts[current];
    var time = player.getCurrentTime() - post.videoStart;
    var duration = (post.videoEnd ? post.videoEnd : player.getDuration()) - post.videoStart;
    if (time < 0) time = 0;
    if (duration < 0) duration = 0;
    var perc = 0;
    if (duration) {
      perc = ((time / duration) * 100).toFixed(2);
    }
    $('.loadingbar').css('width', perc + '%');

    is_player_playing = player.getPlayerState() != 2; //2==paused
    if (is_player_playing != is_player_playing) {
      if (is_player_playing) { //paused
        play();
      } else {
        pause();
      }
      is_player_playing = is_player_playing;
    }
  };

  function loadReddit() {
    // var url = "https://www.reddit.com/r/youtubehaiku/top.json?sort=top&t=week&limit=200";
    var url = "https://www.reddit.com/r/youtubehaiku/new.json?sort=new&limit=200";

    // videoID is usually in these formats
    // v/XXXXXX | embed/XXXXXX | ?v=XXXXXX | &v=XXXXXX
    var re_videoid = /(?:v\/|embed\/|[\/&\?]v=)([^#\&\?]+)/gi;
    var re_start = /start=([0-9]+)/gi; // the video start second (optional)
    var re_end = /end=([0-9]+)/gi; // the video end second (optional)
    var post, data;
    var videoID, permalink, thumbnail, start, end;
    var videoSource, second;

    $.get(url, function(response) {
      // console.log(response);
      for (var index in response.data.children) {

        // reset regexp
        re_videoid.lastIndex = 0;
        re_start.lastIndex = 0;
        re_end.lastIndex = 0;

        // console.log(response.data.children[index]);
        if (!response.data.children[index]) continue; // no data for this post
        post = response.data.children[index].data;
        if (!post || !post.media || !post.media.oembed) continue; // no sufficient data for this post

        // Extracting the videoID
        // the url could be straight or inside a iframe html src
        // (to be sure to get the start/end (if present) we use the html version)
        videoSource = post.media.oembed.html || post.media.oembed.url;
        // we substitute the URLEncoded chars that are needed to match the videoID
        videoSource = videoSource.replace(/%2f/gi, '/').replace(/%3d/gi, '=').replace(/%26/gi, '&').replace(/%3f/gi, '?');
        videoID = re_videoid.exec(videoSource)[1];

        // Extracting start and end (both optional)
        start = end = 0;
        second = re_start.exec(videoSource);
        if (second) start = parseInt(second[1]);
        second = re_end.exec(videoSource);
        if (second) end = parseInt(second[1]);

        // Extracting other data
        title = post.title.replace(/\[[^\]]+\]/gi, '').trim();
        tags = post.title.match(/\[[^\]]+\]/gi) || [];
        thumbnail = post.thumbnail;
        permalink = 'https://www.reddit.com' + post.permalink;

        // Create our player post from the parsed data
        data = {
          videoID: videoID,
          title: title,
          thumbnail: thumbnail,
          videoStart: start,
          videoEnd: end,
          tags: tags,
          permalink: permalink,
        };
        console.log(data);
        posts.push(data);
      }
      onRedditReady();
    });
  };

  function loadYoutube() {
    // load the iframeapi that will trigger the function in the
    // global variable onYoutubeReadyonYoutubeReady
    var youtubeapi_script = document.createElement('script');
    youtubeapi_script.src = "https://www.youtube.com/iframe_api";
    var first_script = document.getElementsByTagName('script')[0];
    first_script.parentNode.insertBefore(youtubeapi_script, first_script);
  };

  function onRedditReady() {
    is_reddit_loaded = true;
    onReady();
  };

  function onYoutubeReady() {
    console.log('Youtube Script is ready');
    player = new YT.Player(player_id, {
      height: '100%',
      width: '100%',
      playerVars: {
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        showinfo: 0,
      },
      events: {
        'onReady': onYoutubePlayerReady,
        'onStateChange': onYoutubePlayerStateChange,
        'onError': onYoutubePlayerError
      }
    });
  };

  function onYoutubePlayerReady() {
    console.log('Youtube Player is ready');
    is_youtube_loaded = true;
    onReady();
  };

  function onYoutubePlayerStateChange(event) {
    switch (event.data) {
      case YT.PlayerState.UNSTARTED:
        // Unstarted is one of the first events in a new loadedVideo
        has_started = false;
        break;
      case YT.PlayerState.PLAYING:
        // Playing ensure the video has started so we keep track of it
        has_started = true;
        break;
      case YT.PlayerState.ENDED:
        // When the video ends we go next
        // (sometimes one video is ENDED before PLAYING, so we use
        //  has_started to be sure it has been playing before going next)
        if (has_started) {
          next();
        }
        break;
        // case YT.PlayerState.BUFFERING:
        //   break;
        // case YT.PlayerState.CUED:
        //   break;
        // case YT.PlayerState.PAUSED:
        //   break;
    }
  };

  function onYoutubePlayerError(event) {
    console.log('Player error');
    console.log(event.data);
    next();
  };

  function onReady() {
    if (is_youtube_loaded && is_reddit_loaded) {
      // yes we are really ready!
      is_ready = true;

      // let's enable the page controls...
      // #TODO

      // ...and let's play the first video
      next();
    }
  };

  function makeTags(tags) {
    var output = '';
    if (!tags) return '';
    for (var index in tags) {
      tag = tags[index].replace('[', '').replace(']', '').toLowerCase();
      output += ' <span class="' + tag + '">' + tag.toUpperCase() + '</span>';
    }
    return output;
  };

  function playVideoFromCurrentPost() {
    var post = posts[current];
    var next = posts[current + 1];
    console.log('play next ' + current);
    console.log(post);
    $('#tags').html(makeTags(post.tags));
    $('#title').html(post.title);
    $('#next_tags').html(makeTags(next.tags));
    $('#next_title').html(next.title);
    $('#next_thumbnail').attr('src', next.thumbnail);
    var options = {
      'videoId': post.videoID
    };
    if (post.videoStart) options.startSeconds = post.videoStart;
    if (post.videoEnd) options.endSeconds = post.videoEnd;

    // if (isMobile() && is_first_run) {
    // if (is_first_run) {
    // console.log('mobile');
    // player.cueVideoById(options);
    // } else {
    player.loadVideoById(options);
    onUpdateTime();
    play();
    // }
    is_first_run = false;
  };

  function again() {
    if (!has_started) return;
    var post = posts[current];
    var startSeconds = 0;
    if (post.videoStart) startSeconds = post.videoStart;
    player.seekTo(startSeconds);
    player.playVideo();
    flash('#button_again');
  };

  function flash(selector) {
    $(selector).flash('53,53,53', '229,45,39', 200);
  };

  function next() {
    current++;
    playVideoFromCurrentPost();
    flash('#button_next');
  };

  function prev() {
    current--;
    playVideoFromCurrentPost();
    flash('#button_prev');
  };

  function play() {
    $('#play').removeClass('fa-play');
    $('#play').addClass('fa-pause');
    if (YT.PlayerState.PAUSED) {
      player.playVideo();
      flash('#button_play');
    }
  };

  function pause() {
    $('#play').removeClass('fa-pause');
    $('#play').addClass('fa-play');
    if (YT.PlayerState.PLAYING) {
      player.pauseVideo();
      flash('#button_play');
    }
  };

  function playPause() {
    if (!has_started) return;
    if (player.getPlayerState() == 2) { //paused
      play();
    } else {
      pause();
    }
  };

  function openLink() {
    var post = posts[current];
    window.open(post.permalink, "_blank");
    pause();
  };



  function isMobile() {
    var check = false;
    (function(a, b) {
      if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
    })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
  };

  return {
    init: init,
    openLink: openLink,
    next: next,
    playPause: playPause,
    play: play,
    pause: pause,
    again: again,
    prev: prev,
    onBlur: onBlur,
    onYoutubeReady: onYoutubeReady,
  };
};
