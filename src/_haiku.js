/*
Youtube Haiku Player 0.2.0
Author: Simone Cingano (me@yupswing.it)
Repository: https://github.com/yupswing/youtubehaiku.net
Licence: MIT
*/

var POSTS_CACHE_PLAY = 3; // how many posts we need to start the player

var POSTS_CACHE_TRIGGER = 10; // how many posts we have left when we trigger loading a new batch
var POSTS_CACHE_READY = POSTS_CACHE_TRIGGER * 2; // how many posts we need ready in cache
var POSTS_REQUEST_LIMIT = POSTS_CACHE_READY * 2; // how many posts we ask to reddit per request

var URL_BASE = 'https://raw.githubusercontent.com/yupswing/youtubehaiku.net/master/assets/';
var URL_LOGO = URL_BASE + 'logo.png';
var URL_NSFW = URL_BASE + 'nsfw.png';
var URL_END = URL_BASE + 'end.png';
var URL_404 = URL_BASE + '404.png';

var Haiku = function(_player_id) {
  var player_id = _player_id; // the player ID (element target for youtube iframe api)

  var player = null; // the youtube player (iframe API)
  var settings = null; // the app settings

  var is_mobile = false; // the browser is a mobile browser

  var is_youtube_ready = false; // is youtube ready to be used
  var is_reddit_ready = false; // has reddit loaded the data
  var is_reddit_loading = false; // is reddit loading data (no double calls)
  var is_ready = false; // youtube OK and reddit OK

  var posts = []; // posts
  var current = -1; // current post index

  var last_retrived_post = null; // the last post got from reddit

  var is_first_play = true; // it is the first played video of the app (used with mobile to cue instead of load)
  var has_started = false; // the current video has started (or it is cued)

  var is_buffering = true; // the player is buffering (or starting)
  var is_ui_showing_buffering = false; // keep track if the UI is showing as buffering

  var is_overlay_shown = false;

  var is_channel_finished = false;

  var default_settings = {
    is_back: false,
    no_tags: [],
    channel: {
      category: 'hot',
      timeframe: '',
    }
  };

  var available_tags = ['haiku', 'poetry', 'meme', 'nsfw', ''];
  var at_least_one_of_this_tags = ['haiku', 'poetry', 'meme'];


  function init() {

    $('.logo img').attr('src', URL_LOGO);

    console.log("==================================================================================\n __   __          _         _          _   _       _ _                       _   \n \\ \\ / /__  _   _| |_ _   _| |__   ___| | | | __ _(_) | ___   _   _ __   ___| |_ \n  \\ V / _ \\| | | | __| | | | '_ \\ / _ \\ |_| |/ _` | | |/ / | | | | '_ \\ / _ \\ __|\n   | | (_) | |_| | |_| |_| | |_) |  __/  _  | (_| | |   <| |_| |_| | | |  __/ |_ \n   |_|\\___/ \\__,_|\\__|\\__,_|_.__/ \\___|_| |_|\\__,_|_|_|\\_\\\\__,_(_)_| |_|\\___|\\__|\n==================================================================================\n");

    is_mobile = isMobile();
    if (is_mobile) {
      console.log('* You are using a MOBILE browser');
      $('.no_mobile').hide(); // hide keyboard shortcuts
      $('[onclick]').addClass('no-hover'); // remove hover effects (usually remaining after a touch)
    } else {
      console.log('* You are using a DESKTOP browser');
    }

    // Cookies.set('settings', {}); // reset settings

    // Settings (mainly we store channel filters in cookies)
    loadSettings();
    if (!settings.is_back) {
      console.log('* First time on youtubehaiku.net');
      setting('is_back', true);
      splash();
    } else {
      console.log('* Welcome back to youtubehaiku.net');
    }
    renderTags();
    renderChannel();

    // Now we should load the posts...
    loadReddit(true);
    // ...and startup the youtube api
    loadYoutube();

    setInterval(onUpdateTime, 50);

    $(window).keydown(function(event) {
      switch (event.which) {
        case 39: // [right]
        case 78: // N
          next();
          break;
        case 37: // [left]
        case 66: // B
          prev();
          break;
        case 40: // [down]
        case 82: // R
          again();
          break;
        case 67: // C
        case 76: // L
          openLink(); // open to video comment page
          break;
        case 32: // space
        case 80: // P
          playPause();
          break;
        case 190: // .
        case 83: // S
          channels();
          break;
        case 191: // ?
        case 72: // H
          splash();
          break;
        default:
          console.log('* Thanks for pressing the random key ' + event.which);
      }
    });

    $('#end').hide();

  }

  function onWindowBlur() {
    console.log('* The window lost its focus');
    pause();
  }

  function toggleTag(tag) {
    var index_of_tag = settings.no_tags.indexOf(tag);
    if (index_of_tag >= 0) {
      // remove from the excluded tags
      settings.no_tags.splice(index_of_tag, 1);
    } else {
      // add to the excluded tags
      if (at_least_one_of_this_tags.indexOf(tag) > -1) {
        // it is one of the needed tags
        // let's check if at least one of the others is present
        var found;
        var essential_tag;
        for (var index in at_least_one_of_this_tags) {
          essential_tag = at_least_one_of_this_tags[index];
          //we don't need to check the current toggled one
          if (essential_tag == tag) continue;
          if (settings.no_tags.indexOf(essential_tag) < 0) {
            // one essential tag is not excluded
            found = true;
            break;
          }
        }
        if (!found) {
          // we did not found any essential tags
          // we cannot remove the current one because it is essential
          return;
        }
      }
      settings.no_tags.push(tag);
    }
    renderTags();
    setting('no_tags', settings.no_tags);
  }

  function renderTags() {
    var element;
    var tag;
    for (var index in available_tags) {
      tag = available_tags[index];
      element = $('#tag-' + tag);
      if (!element) continue;
      icon = element.find('.fa');
      if (settings.no_tags.indexOf(tag) < 0) {
        element.removeClass('danger');
        element.addClass('success');
        icon.removeClass('fa-times');
        icon.addClass('fa-check');
      } else {
        element.removeClass('success');
        element.addClass('danger');
        icon.removeClass('fa-check');
        icon.addClass('fa-times');
      }
    }
  }

  function renderChannel() {
    $('.channel').removeClass('success');
    $('#channel-' + settings.channel.category + '-' + settings.channel.timeframe).addClass('success');
  }


  function onUpdateTime() {
    if (!is_ready || is_buffering) {
      // it is buffering
      if (!is_ui_showing_buffering) {
        // update the ui
        $('.loadingbar').css('width', '100%');
        $('.loadingbar').addClass('buffering');
        is_ui_showing_buffering = true;
      }
      return;
    }
    if (is_ui_showing_buffering) {
      // it is no buffering, so we update the ui
      $('.loadingbar').css('width', '0%');
      $('.loadingbar').removeClass('buffering');
      is_ui_showing_buffering = false;
    }
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
  }

  function loadSettings() {
    settings = Cookies.getJSON('settings') || default_settings;
    if (!settings.no_tags) settings.no_tags = default_settings.no_tags; // fix empty tags
    if (!settings.channel) settings.channel = default_settings.channel; // fix empty channel
  }

  function setting(key, value) {
    if (!settings) settings = {};
    settings[key] = value;
    Cookies.set('settings', settings, {
      expires: 365
    });
  }

  function loadReddit(start_over) {
    if (!start_over) {
      if (is_channel_finished) {
        console.log('* We have reached the end of the channel');
        return;
      }

      if (is_reddit_loading) {
        console.log('* Already loading reddit posts');
        return;
      }
    }

    console.log('* Start loading reddit posts');
    is_reddit_loading = true;

    if (start_over) {
      // we discard everything and start over
      stop();
      posts.length = 0;
      current = -1;
      is_reddit_ready = false;
      last_retrived_post = null;
      is_channel_finished = false;
      console.log('* Reddit start over');
    } else {
      console.log('* Reddit continue from "' + last_retrived_post + '"');
    }

    // console.log('* Excluded tags ' + settings.no_tags);

    var url = "https://www.reddit.com/r/youtubehaiku/";
    switch (settings.channel.category) {
      case 'new':
        url += "new.json?sort=new"; // New posts
        break;
      case 'top':
        url += "top.json?t=" + settings.channel.timeframe + "&sort=top"; // Top posts all time
        break;
      case 'rising':
        url += "rising.json?"; // Hot posts
        break;
      default: // hot
        url += "hot.json?"; // Hot posts
    }
    url += "&limit=" + POSTS_REQUEST_LIMIT;
    if (last_retrived_post) {
      // the page we want
      url += "&after=" + encodeURIComponent(last_retrived_post);
    }
    console.log('URL: ' + url);

    // videoID is usually in these formats
    // v/XXXXXX | embed/XXXXXX | ?v=XXXXXX | &v=XXXXXX
    var re_videoid = /(?:v\/|embed\/|[\/&\?]v=)([^#\&\?]+)/gi;
    var re_start = /start=([0-9]+)/gi; // the video start second (optional)
    var re_end = /end=([0-9]+)/gi; // the video end second (optional)
    var post, data;
    var videoID, permalink, thumbnail, start, end, score, author;
    var videoSource, tmp_exec, tag_index, to_be_excluded, found;
    var retrived_count, kept_count;

    $.get(url, function(response) {
      // console.log(response);
      retrived_count = response.data.children.length;
      kept_count = 0;
      // console.error('after ' + response.data.after);
      last_retrived_post = response.data.after || null;
      // console.log('Retrived: ' + retrived_count);
      for (var index in response.data.children) {

        // console.log(response.data.children[index]);
        if (!response.data.children[index]) continue; // no data for this post
        post = response.data.children[index].data;
        if (!post || !post.media || !post.media.oembed) continue; // no sufficient data for this post

        // reset regexp
        re_videoid.lastIndex = 0;
        re_start.lastIndex = 0;
        re_end.lastIndex = 0;

        // Extracting the videoID
        // the url could be straight or inside a iframe html src
        // (to be sure to get the start/end (if present) we use the html version)
        videoSource = post.media.oembed.html || post.media.oembed.url;
        // we substitute the URLEncoded chars that are needed to match the videoID
        videoSource = videoSource.replace(/%2f/gi, '/').replace(/%3d/gi, '=').replace(/%26/gi, '&').replace(/%3f/gi, '?');
        tmp_exec = re_videoid.exec(videoSource);
        if (tmp_exec) {
          videoID = tmp_exec[1];
        } else {
          console.error('* VideoID not present: ' + videoSource);
          continue; // NO VIDEO ID
        }

        // Extracting start and end (both optional)
        start = end = 0;
        tmp_exec = re_start.exec(videoSource);
        if (tmp_exec) start = parseInt(tmp_exec[1]);
        tmp_exec = re_end.exec(videoSource);
        if (tmp_exec) end = parseInt(tmp_exec[1]);

        // Extracting other data
        title = post.title.replace(/\[[^\]]+\]/gi, '').trim();
        thumbnail = post.thumbnail;
        if (thumbnail == 'nsfw') thumbnail = URL_NSFW;
        permalink = 'https://www.reddit.com' + post.permalink;
        score = post.score || 0;
        author = 'u/' + post.author;

        // Extracting tags (and checking filter)
        to_be_excluded = false;
        tags = post.title.match(/\[[^\]]+\]/gi) || ['haiku']; // default tag is haiku

        for (tag_index in tags) {
          tags[tag_index] = tags[tag_index].replace(/[\]\[]/gi, '').toLowerCase();
        }

        found = false;
        for (tag_index in at_least_one_of_this_tags) {
          if (tags.indexOf(at_least_one_of_this_tags[tag_index]) > -1) {
            found = true;
            break;
          }
        }
        if (!found) tags.push('haiku');

        for (tag_index in tags) {
          if (settings.no_tags.indexOf(tags[tag_index]) > -1) {
            to_be_excluded = true;
            // console.log('* Excluded video ' + tags + ' ' + title + '" because of tag ' + tags[tag_index]);
            break;
          }
        }
        if (to_be_excluded) continue;

        // Create our player post from the parsed data
        data = {
          id: post.id,
          videoID: videoID,
          title: title,
          thumbnail: thumbnail,
          videoStart: start,
          videoEnd: end,
          tags: tags,
          score: score,
          author: author,
          permalink: permalink,
        };
        // console.log(data);
        posts.push(data);
        kept_count++;
        if (!is_reddit_ready && (posts.length >= POSTS_CACHE_PLAY || last_retrived_post === null)) {
          // reddit is ready when we have at least two valid posts
          console.log('+ Reddit is ready');
          // console.log(posts);
          is_reddit_ready = true;
          onReady();
        }
      }

      // console.log('Kept: ' + kept_count);
      // console.log('Total: ' + posts.length + ' | Playlist: ' + (posts.length - (current + 1)));

      if (last_retrived_post === null) {
        // no more posts
        console.log('* We have reached the end of the channel');
        is_channel_finished = true;
        is_reddit_loading = false; // keep track of this
        return;
      }

      // we processed all the posts in the response
      // let's check if it is enough
      if ((posts.length - (current + 1) <= POSTS_CACHE_READY)) {
        // it is not enough
        // let's call ourself to get a new batch
        is_reddit_loading = false; // keep track of this
        loadReddit();
        return;
      }
      is_reddit_loading = false; // keep track of this

    }).fail(function(e) {
      is_reddit_loading = false; // keep track of this
      console.log('* Reddit error: ' + e);
    });
  }

  function loadYoutube() {
    // load the iframeapi that will trigger the function in the
    // global variable onYoutubeReadyonYoutubeReady
    var youtubeapi_script = document.createElement('script');
    youtubeapi_script.src = "https://www.youtube.com/iframe_api";
    var first_script = document.getElementsByTagName('script')[0];
    first_script.parentNode.insertBefore(youtubeapi_script, first_script);
  }

  function onYoutubeReady() {
    console.log('+ Youtube API is loaded');
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
  }

  function onYoutubePlayerReady() {
    console.log('+ Youtube Player is ready');
    is_youtube_ready = true;
    // player.mute(); //#DEPLY comment
    onReady();
  }

  function onYoutubePlayerStateChange(event) {
    is_buffering = false;
    switch (event.data) {
      case YT.PlayerState.UNSTARTED:
        // Unstarted is one of the first events in a new loadedVideo
        has_started = false;
        break;
      case YT.PlayerState.PLAYING:
        play_feedback();
      case YT.PlayerState.CUED:
        // Playing/Cued ensure the video has started (and we can play/pause) so we keep track of it
        has_started = true;
        break;
      case YT.PlayerState.ENDED:
        // When the video ends we go next
        // (sometimes one video is ENDED before PLAYING, so we use
        //  has_started to be sure it has been playing before going next)
        if (has_started) next();
        break;
      case YT.PlayerState.BUFFERING:
        is_buffering = true;
        break;
      case YT.PlayerState.PAUSED:
        pause_feedback();
        break;
    }
  }

  function onYoutubePlayerError(event) {
    console.log('# Player error [' + event.data + ']');
    next();
  }

  function onReady() {
    if (is_youtube_ready && is_reddit_ready) {
      console.log('* All ready!');
      console.log('----------------------------------------');
      // yes we are really ready!
      is_ready = true;
      // let's play the first video
      next();
    }
  }



  function splash() {
    if (is_overlay_shown) return;
    if (is_ready) pause();
    is_overlay_shown = true;
    $('.splash').show();
  }

  function channels() {
    if (is_overlay_shown) return;
    if (is_ready) pause();
    is_overlay_shown = true;
    $('.channels').show();
  }

  function chooseChannel(category, timeframe) {
    settings.channel.category = category;
    settings.channel.timeframe = timeframe || '';
    setting('channel', settings.channel);
    renderChannel();
    loadReddit(true);
    hideOverlay();
  }

  function hideOverlay() {
    is_overlay_shown = false;
    $('#end').hide();
    $('.overlay').hide();
  }


  function makeTags(tags) {
    var output = '';
    var tag;
    if (!tags) return '';
    for (var index in tags) {
      tag = tags[index];
      output += ' <span class="tag small bg_' + tag + '">' + tag.replace(/</g, '&lt;').replace(/>/g, '&gt;').toUpperCase() + '</span>';
    }
    return output;
  }

  function playVideoFromCurrentPost() {
    var post = posts[current];
    var next = posts[current + 1];

    if ((posts.length - (current + 1) <= POSTS_CACHE_TRIGGER)) {
      // trigger loading next batch
      // (if already queued will do nothing)
      console.log('* Trigger load more posts');
      loadReddit();
    }


    if (!post) {
      console.log('# Error: post index:' + current + ' does not exists!');
      return;
    }
    console.log('> Playing post ' + post.id + ' index:' + current + ' (' + post.title + ') (' + post.permalink + ')');
    // console.log(post);
    $('#tags').html(makeTags(post.tags));
    $('#score').text(post.score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    $('#author').text(post.author);
    $('#title').text(post.title);
    if (next) {
      $('#next_tags').html(makeTags(next.tags));
      $('#next_title').text(next.title);
      $('#next_thumbnail').attr('src', next.thumbnail);
    } else if (is_channel_finished) {
      $('#next_tags').html(makeTags(['OH BOY']));
      $('#next_title').text('End of the channel');
      $('#next_thumbnail').attr('src', is_channel_finished ? URL_END : URL_END);
    } else {
      $('#next_tags').html(makeTags(['OH BOY']));
      $('#next_title').text('Loading posts...');
      $('#next_thumbnail').attr('src', is_channel_finished ? URL_END : URL_404);
    }
    var options = {
      'videoId': post.videoID
    };
    if (post.videoStart) options.startSeconds = post.videoStart;
    if (post.videoEnd) options.endSeconds = post.videoEnd;

    if (is_overlay_shown || (is_mobile && is_first_play)) {
      player.cueVideoById(options);
    } else {
      player.loadVideoById(options);
      onUpdateTime();
      play();
    }
    is_first_play = false;
  }

  function again() {
    if (!has_started) return;
    var post = posts[current];
    var startSeconds = 0;
    if (post.videoStart) startSeconds = post.videoStart;
    player.seekTo(startSeconds);
    player.playVideo();
    flash('#button_again');
  }

  function flash(selector) {
    $(selector).flash('53,53,53', '229,45,39', 200);
  }

  function next() {
    if (current >= posts.length - 1) {
      console.log("# Can't go forward, it is the last post");
      current = posts.length - 1;
      if (is_channel_finished) {
        $('#end').show();
        channels();
      }
      return;
    }
    current++;
    playVideoFromCurrentPost();
    flash('#button_next');
  }

  function prev() {
    if (current <= 0) {
      console.log("# Can't go back, it is the first post");
      current = 0;
      return;
    }
    current--;
    playVideoFromCurrentPost();
    flash('#button_prev');
  }

  function play_feedback() {
    $('#play').removeClass('fa-play');
    $('#play').addClass('fa-pause');
    flash('#button_play');
  }

  function pause_feedback() {
    $('#play').removeClass('fa-pause');
    $('#play').addClass('fa-play');
    flash('#button_play');
  }

  function play() {
    if (is_overlay_shown) {
      hideOverlay();
    }
    player_state = player.getPlayerState();
    if (player_state == YT.PlayerState.PAUSED || player_state == YT.PlayerState.CUED) {
      player.playVideo();
      play_feedback();
    }
  }

  function pause() {
    if (!has_started) return;
    player_state = player.getPlayerState();
    if (player_state == YT.PlayerState.PLAYING) {
      player.pauseVideo();
      pause_feedback();
    }
  }

  function stop() {
    is_ready = false;
    pause();
  }

  function playPause() {
    if (!has_started) return;
    player_state = player.getPlayerState();
    if (player_state == YT.PlayerState.PAUSED || player_state == YT.PlayerState.CUED) { //paused
      play();
    } else {
      pause();
    }
  }

  function openLink(url) {
    // url or current post url
    if (!url) url = posts[current].permalink;
    window.open(url, "_blank");
    pause();
  }

  function isMobile() {
    var check = false;
    (function(a) {
      if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
    })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
  }

  // Exposes:
  return {
    init: init,
    openLink: openLink,
    next: next,
    playPause: playPause,
    play: play,
    pause: pause,
    again: again,
    prev: prev,
    splash: splash,
    onWindowBlur: onWindowBlur,
    onYoutubeReady: onYoutubeReady,
    channels: channels,
    chooseChannel: chooseChannel,
    toggleTag: toggleTag,
    hideOverlay: hideOverlay,
  };
};
