/*
Youtube Haiku Player 1.0.1
Author: Simone Cingano (me@yupswing.it)
Repository: https://github.com/yupswing/youtubehaiku.net
Licence: MIT
*/

// * The youtubehaiku.net player
var Haiku = function(_player_id) {

  // * "Constants"
  var POSTS_CACHE_PLAY = 3; // how many posts cached we need to have to start the player
  var POSTS_CACHE_TRIGGER = 10; // how many posts we have left in cache when we trigger loading new posts
  var POSTS_CACHE_READY = POSTS_CACHE_TRIGGER * 2; // how many posts we need ready in cache
  var POSTS_REQUEST_LIMIT = POSTS_CACHE_READY * 2; // how many posts we ask to reddit per request

  // * Static assets (on github to save bandwitch)
  var URL_BASE = 'https://raw.githubusercontent.com/yupswing/youtubehaiku.net/master/assets/';
  var URL_LOGO = URL_BASE + 'logo.png';
  var URL_NSFW = URL_BASE + 'nsfw.png';
  var URL_END = URL_BASE + 'end.png';
  var URL_404 = URL_BASE + '404.png';
  var URL_SPOILER = URL_BASE + 'spoiler.png';

  // * Youtube iFrame API states (like this to allow more code minimisation)
  var UNSTARTED = -1;
  var ENDED = 0;
  var PLAYING = 1;
  var PAUSED = 2;
  var BUFFERING = 3;
  var CUED = 5;

  // * Tags
  var TAGS_AVAILABLE = ['haiku', 'poetry', 'meme', 'nsfw']; // Managed tags (in the UI)
  var TAGS_ESSENTIALS = ['haiku', 'poetry', 'meme']; // At least one tag of these has to be selected in the filters

  // the player ID (element target for youtube iframe api)
  var player_id = _player_id;

  // the youtube player (YouTube iFrame API)
  var player = null;
  // the app options (stored in cookies)
  var options = null;

  // is the client a mobile browser?
  var is_mobile = false;

  // is youtube ready to play (loaded and instanciated)?
  var is_youtube_ready = false;
  // has reddit enough posts in cache? (see POSTS_CACHE_PLAY)
  var is_reddit_ready = false;
  // is reddit loading posts (avoid trigger multiple async calls to load posts)
  var is_reddit_loading = false;
  // are reddit and youtube ready?
  // (both call checkReady when they are ready, only when both are ready this is true)
  var is_ready = false;

  // the posts cache
  var posts = [];
  // the current post index (what we are playing in the cache)
  var current = -1;
  // are there any more posts to be loaded?
  var is_channel_finished = false;
  // the current volume (percentage)
  var volume = 100;

  // last post id from reddit (called 'after', used in the next paginated request)
  var last_retrived_post = null;

  // is it the first time we play something? (used to cue instead of play for mobile browsers)
  var is_first_play = true;
  // has the current video started playing?
  var has_started = false;
  // is the player buffering (or starting)?
  var is_buffering = true;

  // keep track if the progress bar is shown as buffering
  var is_ui_showing_buffering = false;
  // keep track if the overlay (splash or channel) is shown
  var is_overlay_shown = false;
  // keep track if the volume ui is showing
  var is_ui_showing_volume = false;

  // default options (used if no cookies)
  var default_options = {
    is_back: false, // is it a returning user? (to avoid showing always the splash screen)
    excluded_tags: [], // default tags exclusion
    channel: { // default channel
      category: 'hot',
      timeframe: '',
    }
  };

  // Regexp (remember to reset them before using ie: re_videoid.lastIndex = 0;)
  // videoID is usually in these formats v/XXXXXX | embed/XXXXXX | ?v=XXXXXX | &v=XXXXXX
  var re_videoid = /(?:v\/|embed\/|[\/&\?]v=)([^#\&\?]+)/gi;
  var re_start = /start=([0-9]+)/gi; // the video start second (optional)
  var re_end = /end=([0-9]+)/gi; // the video end second (optional)

  // ======================================================================== //
  // * OPTIONS *

  function setOption(key, value) {
    // Set an option to cookies
    if (!options) options = default_options;
    options[key] = value;
    Cookies.set('options', options, {
      expires: 365
    });
  }

  function loadOptions() {
    // Load all options from cookies
    options = Cookies.getJSON('options') || default_options; // if no cookie set as default
    if (!options.excluded_tags) options.excluded_tags = default_options.excluded_tags; // Be sure there are tags exclusion
    if (!options.channel) options.channel = default_options.channel; // Be sure there are channels
  }

  // ======================================================================== //

  function init() {

    // * Set the logo image
    $('.logo img').attr('src', URL_LOGO);
    hideVolume();

    // * Branding console.log
    console.log("==================================================================================\n __   __          _         _          _   _       _ _                       _   \n \\ \\ / /__  _   _| |_ _   _| |__   ___| | | | __ _(_) | ___   _   _ __   ___| |_ \n  \\ V / _ \\| | | | __| | | | '_ \\ / _ \\ |_| |/ _` | | |/ / | | | | '_ \\ / _ \\ __|\n   | | (_) | |_| | |_| |_| | |_) |  __/  _  | (_| | |   <| |_| |_| | | |  __/ |_ \n   |_|\\___/ \\__,_|\\__|\\__,_|_.__/ \\___|_| |_|\\__,_|_|_|\\_\\\\__,_(_)_| |_|\\___|\\__|\n==================================================================================\ncrafted by Simone Cingano\n");

    // * Manage mobile specific actions
    is_mobile = isMobile();
    if (is_mobile) {
      // console.log('* You are using a MOBILE browser');
      $('.no_mobile').hide(); // hide keyboard shortcuts (no need on mobile)
      $('[onclick]').addClass('no-hover'); // remove hover effects (which usually remains after a touch)
    } else {
      // console.log('* You are using a DESKTOP browser');
    }

    $('.volume').click(function(e) {
      var offset = $(this).offset();
      // var relX = e.pageX - offset.left;
      var relY = e.pageY - offset.top;

      // it floats between 0 and ~100
      var perc = 100 - relY + 10;

      // normalise action (high clicks becomes 100, low clicks become 0)
      if (perc > 90) perc = 100;
      if (perc < 20) perc = 0;

      // round volume to closest 10
      perc = parseInt(Math.round(perc / 10) * 10);

      setVolume(perc);

      // hide UI after a bit of time to allow user to see what happened
      setTimeout(hideVolume, 200);
    });

    // * Options (mainly we store channel filters in cookies)
    loadOptions();
    if (!options.is_back) {
      // First time on the website
      setOption('is_back', true);
      showSplash();
      // console.log('* First time on youtubehaiku.net');
      // } else {
      // console.log('* Welcome back to youtubehaiku.net');
    }

    renderTags(); // update UI with loaded exclusion tags
    renderChannel(); // update UI with loaded channel

    // Start loading posts
    loadReddit(true);
    // Start Youtube iFrame API
    loadYoutube();

    // Launch watcher loop (update progress bar)
    setInterval(loop, 50);

    // Keyboard shortcuts
    $(window).keydown(function(event) {
      switch (event.which) {
        case 39: // [right]
        case 78: // N
          nextVideo();
          break;
        case 37: // [left]
        case 66: // B
          prevVideo();
          break;
        case 187: // +
        case 38: // [up]
          volumeUp();
          break;
        case 189: // +
        case 40: // [down]
          volumeDown();
          break;
        case 82: // R
          repeatVideo();
          break;
        case 67: // C
        case 76: // L
          openLink(); // open to video comment page
          break;
        case 32: // space
        case 80: // P
          togglePlayback();
          break;
        case 190: // .
        case 83: // S
          showChannels();
          break;
        case 191: // ?
        case 72: // H
          showSplash();
          break;
        // default:
          // console.log('* Pressed key ' + event.which);
      }
    });

    // Hide the 'end of channel' text
    $('#end').hide();

  }

  // ======================================================================== //
  // * Loaders

  function loadYoutube() {
    // Load the Youtube iFrame API
    // (which will trigger the function in the global variable onYouTubeIframeAPIReady)
    var youtubeapi_script = document.createElement('script');
    youtubeapi_script.src = "https://www.youtube.com/iframe_api";
    var first_script = document.getElementsByTagName('script')[0];
    first_script.parentNode.insertBefore(youtubeapi_script, first_script);
  }

  // ======================================================================== //
  // * Events

  function onWindowBlur() {
    // console.log('* The window lost its focus');
    // Pause the playback when we lose focus
    pauseVideo();
  }

  // Youtube API is ready
  function onYoutubeReady() {
    // console.log('+ Youtube API is loaded');
    // Create the instance player
    player = new YT.Player(player_id, {
      height: '100%',
      width: '100%',
      playerVars: { // disable all possible UI
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        showinfo: 0,
      },
      events: { // hook the events
        onStateChange: onYoutubePlayerStateChange,
        onReady: function() {
          // Youtube player is ready
          // console.log('+ Youtube Player is ready');
          is_youtube_ready = true;
          checkReady();
        },
        onError: function(event) {
          // Shit!
          console.error('# Youtube player error [' + event.data + ']');
          nextVideo(); // let's play the next video
        }
      }
    });
  }

  // Manage Youtube Player events
  function onYoutubePlayerStateChange(event) {
    is_buffering = false;

    switch (event.data) {

      case UNSTARTED:
        // Unstarted is one of the first events in a new loadedVideo
        has_started = false;
        break;

        // PLAYING & CUED ensure the video has started (and we can play/pause), so we keep track of it
      case PLAYING:
        renderPlay();
        has_started = true;
        break;
      case CUED:
        has_started = true;
        break;

      case PAUSED:
        renderPause();
        break;

      case ENDED:
        // When the video ends we go next
        // (sometimes one video is ENDED before PLAYING, so we use
        //  has_started to be sure it has been playing before going next)
        if (has_started) nextVideo();
        break;

      case BUFFERING:
        is_buffering = true;
        break;
    }
  }

  // Called when youtube or reddit are ready
  function checkReady() {
    if (is_youtube_ready && is_reddit_ready) {
      // both are ready, so everything is ready!
      // console.log('* All ready!');
      // console.log('----------------------------------------');
      is_ready = true;
      nextVideo(); // let's play the first video
    }
  }

  function loop() {
    // the LOOP is called every 50 millisecond to update the progress bar

    // Blur youtube player (if needed) to make keyboard shortcuts always working
    if (document.activeElement) document.activeElement.blur();

    // it is buffering (or starting up)
    if (!is_ready || is_buffering) {
      if (!is_ui_showing_buffering) {
        // Show the loading bar buffering effect
        $('.loadingbar').css('width', '100%');
        $('.loadingbar').addClass('buffering');
        is_ui_showing_buffering = true;
      }
      return;
    }

    // it was buffering
    if (is_ui_showing_buffering) {
      // Remove the loading bar buffering effect
      $('.loadingbar').css('width', '0%');
      $('.loadingbar').removeClass('buffering');
      is_ui_showing_buffering = false;
    }

    var post = posts[current];
    // Get current position (from videoStart)
    var position = player.getCurrentTime() - post.videoStart;
    if (position < 0) position = 0;
    // Get total duration (range videoStart to videoEnd)
    var duration = (post.videoEnd ? post.videoEnd : player.getDuration()) - post.videoStart;
    if (duration < 0) duration = 0;
    // Percentage of video played
    var perc = 0;
    if (duration) perc = ((position / duration) * 100).toFixed(2);

    // Update the progress bar
    $('.loadingbar').css('width', perc + '%');
  }

  // ======================================================================== //
  // * UI Manipulation

  function renderTags() {
    // Render tags on interface
    var element, icon, tag;
    for (var index in TAGS_AVAILABLE) {
      tag = TAGS_AVAILABLE[index];
      element = $('#tag-' + tag);
      if (!element) continue; // this should not happen
      icon = element.find('.fa');
      if (options.excluded_tags.indexOf(tag) < 0) {
        // the tag is included
        element.removeClass('danger').addClass('success');
        icon.removeClass('fa-times').addClass('fa-check');
      } else {
        // the tag is excluded
        element.removeClass('success').addClass('danger');
        icon.removeClass('fa-check').addClass('fa-times');
      }
    }
  }

  function renderChannel() {
    // Remove class from all channels
    $('.channel').removeClass('success');
    // Set class to the current channel
    $('#channel-' + options.channel.category + '-' + options.channel.timeframe).addClass('success');
  }

  function renderPlay() {
    $('#play').removeClass('fa-play');
    $('#play').addClass('fa-pause');
    renderButtonHighlight('#button_play');
  }

  function renderPause() {
    $('#play').removeClass('fa-pause');
    $('#play').addClass('fa-play');
    renderButtonHighlight('#button_play');
  }

  function renderButtonHighlight(selector) {
    // Highlight a selector
    $(selector).flash('53,53,53', '229,45,39', 200);
  }

  function renderPost(post) {
    $('#tags').html(makeTags(post.tags));
    $('#score').text(post.score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    $('#author').text(post.author);
    $('#title').text(post.title);
  }

  function renderNextPost(next) {
    var tags, title, thumbnail;
    if (next) {
      // We have a post
      tags = makeTags(next.tags);
      title = next.title;
      thumbnail = next.thumbnail;
    } else if (is_channel_finished) {
      // It is the end of the channel (no more posts)
      tags = makeTags(['OH BOY']);
      title = 'End of the channel';
      thumbnail = URL_END;
    } else {
      // Posts are still loading (if the connection is decent this should never happen)
      tags = makeTags(['OH BOY']);
      title = 'Loading posts...';
      thumbnail = URL_404;
    }
    $('#next_tags').html(tags);
    $('#next_title').text(title);
    $('#next_thumbnail').attr('src', thumbnail);
  }

  function renderVolume() {
    // render the button class (off, low, high)
    var volumeClass = 'up';
    if (volume <= 0) volumeClass = 'off';
    if (volume > 0 && volume < 50) volumeClass = 'down';
    $('#button_volume i')
      .removeClass('fa-volume-off')
      .removeClass('fa-volume-down')
      .removeClass('fa-volume-up')
      .addClass('fa-volume-' + volumeClass);

    // render the bar
    $('.volume_bar').css('height', volume + '%');
  }

  // Prepare the HTML for the tags
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

  // ======================================================================== //
  // * Overlay

  function showOverlay(selector) {
    if (is_overlay_shown) return;
    if (is_ready) pauseVideo();
    is_overlay_shown = true;
    $(selector).show();
  }

  function hideOverlay() {
    is_overlay_shown = false;
    $('#end').hide();
    $('.overlay').hide();
  }

  function showSplash() {
    showOverlay('.splash');
  }

  function showChannels() {
    showOverlay('.channels');
  }

  function toggleVolume() {
    // show hide the volume UI
    if (is_ui_showing_volume) hideVolume();
    else showVolume();
    renderButtonHighlight('#button_volume');
  }

  function showVolume() {
    is_ui_showing_volume = true;
    volume = player.getVolume();
    renderVolume();
    $('.volume').show();
  }

  function hideVolume() {
    is_ui_showing_volume = false;
    $('.volume').hide();
  }

  function playChannel(category, timeframe) {
    options.channel.category = category;
    options.channel.timeframe = timeframe || '';
    setOption('channel', options.channel);
    renderChannel();
    loadReddit(true);
    hideOverlay();
  }

  function toggleTag(tag) {
    var index_of_tag = options.excluded_tags.indexOf(tag);
    if (index_of_tag >= 0) {
      // remove from the excluded tags
      options.excluded_tags.splice(index_of_tag, 1);
    } else {
      // add to the excluded tags
      if (TAGS_ESSENTIALS.indexOf(tag) > -1) {
        // it is one of the needed tags
        // let's check if at least one of the other essettial tags is present
        var found;
        var essential_tag;
        for (var index in TAGS_ESSENTIALS) {
          essential_tag = TAGS_ESSENTIALS[index];
          // we don't need to check the current toggled one
          if (essential_tag == tag) continue;
          if (options.excluded_tags.indexOf(essential_tag) < 0) {
            // one essential tag is not excluded
            found = true;
            break;
          }
        }
        // we did not found any essential tags so we cannot remove
        // the current one because it is essential
        if (!found) return;
      }
      // add to the excluded tags
      options.excluded_tags.push(tag);
    }
    renderTags();
    setOption('excluded_tags', options.excluded_tags);
  }

  // ======================================================================== //



  function getPlayerState() {
    if (!is_youtube_ready) return null;
    return player.getPlayerState();
  }

  function playVideoFromCurrentPost() {
    var post = posts[current];
    var next = posts[current + 1];

    if ((posts.length - (current + 1) <= POSTS_CACHE_TRIGGER)) {
      // trigger loading next batch
      // (if already queued will do nothing)
      // console.log('* Trigger load more posts');
      loadReddit();
    }

    // console.log('> Playing post ' + post.id + ' index:' + current + ' (' + post.title + ') (' + post.permalink + ')');
    // console.log(post);

    renderPost(post);
    renderNextPost(next);

    // Prepare the options for the video player (with optional start+end)
    var options = {
      'videoId': post.videoID
    };
    if (post.videoStart) options.startSeconds = post.videoStart;
    if (post.videoEnd) options.endSeconds = post.videoEnd;

    // Play/Cue the video
    if (is_overlay_shown || (is_mobile && is_first_play)) {
      // We just cue the video if there is an overlay or
      // if it is a mobile browser and the user just arrived
      // (by default you CANNOT autoplay a video on mobile to save user data)
      player.cueVideoById(options);
    } else {
      // Let's start the cycle
      player.loadVideoById(options);
      loop(); // update progress bar
      playVideo();
    }

    // We played (or cued) our first post
    if (is_first_play) is_first_play = false;
  }

  // ======================================================================== //

  function loadReddit(start_over) {

    if (!start_over) {
      // continue (using last_retrived_post) to next reddit page

      if (is_channel_finished) {
        // console.log('* We have reached the end of the channel');
        return;
      }
      if (is_reddit_loading) {
        // We avoid double $.get
        // console.log('* Already loading reddit posts');
        return;
      }
    }

    // console.log('* Start loading reddit posts');
    is_reddit_loading = true;

    if (start_over) {
      // We discard everything and start over
      // it happens when the user change channel
      pauseVideo();
      // Reset state
      posts.length = 0;
      current = -1;
      is_ready = false;
      is_reddit_ready = false;
      last_retrived_post = null;
      is_channel_finished = false;
      // console.log('* Reddit start over');
      // } else {
      // console.log('* Reddit continue from "' + last_retrived_post + '"');
    }

    // -------------------------------------------------------------------------
    // * Create the url from the current options
    var url = "https://www.reddit.com/r/youtubehaiku/";
    switch (options.channel.category) {
      case 'new':
        url += "new.json?sort=new&"; // New posts
        break;
      case 'top':
        url += "top.json?t=" + options.channel.timeframe + "&sort=top&"; // Top posts all time
        break;
      case 'rising':
        url += "rising.json?"; // Hot posts
        break;
      default: // hot
        url += "hot.json?"; // Hot posts
    }
    url += "limit=" + POSTS_REQUEST_LIMIT;
    if (last_retrived_post) {
      // If we have a post id it means we keep going with the pagination
      url += "&after=" + encodeURIComponent(last_retrived_post);
    }

    // -------------------------------------------------------------------------

    // post variables
    var post;
    var videoID, permalink, thumbnail, start, end, score, author;

    // temporary variables
    var videoSource, tmp_exec, tag_index, to_be_excluded, found;

    // -------------------------------------------------------------------------

    $.get(url, function(response) {

      // After is our pagination identifier.
      // - null it means no more pages
      // - otherwise we can use it in the request to get the next page
      // NOTE: by design max 1000 posts can be retrived from a reddit JSON api (and max 100 per page)
      last_retrived_post = response.data.after || null;

      for (var index in response.data.children) {

        if (!response.data.children[index]) continue; // no data for this post
        post = response.data.children[index].data;
        if (!post || !post.media || !post.media.oembed) continue; // no sufficient data for this post

        // reset regexp
        re_videoid.lastIndex = 0;
        re_start.lastIndex = 0;
        re_end.lastIndex = 0;

        // ---------------------------------------------------------------------
        // * Extracting the videoID
        // the url could be straight or inside a iframe html src
        // (to be sure to get the start/end (if present) we use the html version)
        videoSource = post.media.oembed.html || post.media.oembed.url;
        // we substitute the URLEncoded chars that are needed to match the videoID
        videoSource = videoSource.replace(/%2f/gi, '/').replace(/%3d/gi, '=').replace(/%26/gi, '&').replace(/%3f/gi, '?');
        tmp_exec = re_videoid.exec(videoSource);
        if (tmp_exec) {
          videoID = tmp_exec[1];
        } else {
          // console.error('* VideoID not present: ' + videoSource);
          continue; // no videoID
        }

        // ---------------------------------------------------------------------
        // * Extracting START and END (both optional)
        start = end = 0;
        tmp_exec = re_start.exec(videoSource);
        if (tmp_exec) start = parseInt(tmp_exec[1]);
        tmp_exec = re_end.exec(videoSource);
        if (tmp_exec) end = parseInt(tmp_exec[1]);

        // ---------------------------------------------------------------------
        // * Extracting other data
        title = post.title.replace(/\[[^\]]+\]/gi, '').trim();
        thumbnail = post.thumbnail;
        if (thumbnail == 'nsfw') thumbnail = URL_NSFW; // nsfw thumbnail is hidden, we use our own
        if (thumbnail == 'spoiler') thumbnail = URL_SPOILER; // spoiler thumbnail is hidden, we use our own
        permalink = 'https://www.reddit.com' + post.permalink;
        score = post.score || 0;
        author = 'u/' + post.author;

        // ---------------------------------------------------------------------
        // * Extracting tags (and checking filter)
        to_be_excluded = false;
        tags = post.title.match(/\[[^\]]+\]/gi) || ['haiku']; // default tag is haiku

        for (tag_index in tags) {
          // normalise tags (lowercase without square brackets)
          tags[tag_index] = tags[tag_index].replace(/[\]\[]/gi, '').toLowerCase();
        }

        // We check if there is at least one of the essential tags
        found = false;
        for (tag_index in TAGS_ESSENTIALS) {
          if (tags.indexOf(TAGS_ESSENTIALS[tag_index]) > -1) {
            found = true;
            break;
          }
        }
        // otherwise we add the default tag
        if (!found) tags.push('haiku');

        // Now we have the normalised tags and
        // we can check if we have to exclude the post (because of filters)
        for (tag_index in tags) {
          if (options.excluded_tags.indexOf(tags[tag_index]) > -1) {
            to_be_excluded = true;
            // console.log('* Excluded video ' + tags + ' ' + title + '" because of tag ' + tags[tag_index]);
            break;
          }
        }
        if (to_be_excluded) continue;

        // ---------------------------------------------------------------------
        // * Create our post data from the parsed post
        posts.push({
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
        });

        // ---------------------------------------------------------------------

        if (!is_reddit_ready && (posts.length >= POSTS_CACHE_PLAY || last_retrived_post === null)) {
          // reddit is ready when we have at least POSTS_CACHE_PLAY valid posts
          // console.log('+ Reddit is ready');
          is_reddit_ready = true;
          checkReady();
        }
      }

      if (last_retrived_post === null) {
        // no more posts, end of the channel
        // console.log('* We have reached the end of the channel');
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
      console.error('* Reddit error: ' + e);
    });
  }

  // ======================================================================== //
  // * Interaction

  function setVolume(value) {
    if (value < 0) value = 0;
    if (value > 100) value = 100;
    player.setVolume(value);
    volume = value;
    renderVolume();
  }

  function volumeUp() {
    if (volume >= 100) return;
    setVolume(volume + 10);
    renderButtonHighlight('#button_volume');
  }

  function volumeDown() {
    if (volume <= 0) return;
    setVolume(volume - 10);
    renderButtonHighlight('#button_volume');
  }

  function repeatVideo() {
    if (!has_started) return;
    var post = posts[current];
    var startSeconds = 0;
    if (post.videoStart) startSeconds = post.videoStart;
    player.seekTo(startSeconds);
    player.playVideo();
    renderButtonHighlight('#button_repeat');
  }

  function nextVideo() {
    if (current >= posts.length - 1) {
      // console.log("# Can't go forward, it is the last post");
      current = posts.length - 1;
      if (is_channel_finished) {
        $('#end').show();
        showChannels();
      }
      return;
    }
    current++;
    playVideoFromCurrentPost();
    renderButtonHighlight('#button_next');
  }

  function prevVideo() {
    if (current <= 0) {
      // console.log("# Can't go back, it is the first post");
      current = 0;
      return;
    }
    current--;
    playVideoFromCurrentPost();
    renderButtonHighlight('#button_prev');
  }

  function playVideo() {
    if (is_overlay_shown) hideOverlay();

    var player_state = getPlayerState();
    if (player_state == PAUSED || player_state == CUED) {
      player.playVideo();
      renderPlay();
    }
  }

  function pauseVideo() {
    if (!has_started) return;

    var player_state = getPlayerState();
    if (player_state == PLAYING) {
      player.pauseVideo();
      renderPause();
    }
  }

  function togglePlayback() {
    if (!has_started) return;

    var player_state = getPlayerState();
    if (player_state == PAUSED || player_state == CUED) {
      playVideo();
    } else if (player_state == PLAYING) {
      pauseVideo();
    }
  }

  // Open the specified url if openLink('http://...') ( or the current post url if openLink() )
  function openLink(url) {
    if (!url) url = posts[current].permalink;
    pauseVideo();
    window.open(url, "_blank");
  }

  // ======================================================================== //
  // * Utils

  // Return true if the client is a mobile browser
  function isMobile() {
    return /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(navigator.userAgent || navigator.vendor || window.opera);
  }

  // ======================================================================== //
  // * Public

  return {

    init: init,

    onWindowBlur: onWindowBlur,
    onYoutubeReady: onYoutubeReady,

    openLink: openLink,

    playVideo: playVideo,
    pauseVideo: pauseVideo,
    togglePlayback: togglePlayback,
    nextVideo: nextVideo,
    prevVideo: prevVideo,
    repeatVideo: repeatVideo,

    hideOverlay: hideOverlay,
    showSplash: showSplash,
    showChannels: showChannels,
    toggleTag: toggleTag,
    playChannel: playChannel,

    toggleVolume: toggleVolume,

  };
};
