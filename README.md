[![youtubehaiku.net](https://img.shields.io/badge/app-youtubehaiku.net-brightgreen.svg)](#) [![Simone Cingano](https://img.shields.io/badge/author-Simone%20Cingano-red.svg)](mailto:me@yupswing.it) [![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![HTML5](https://img.shields.io/badge/language-HTML5-orange.svg)](https://www.w3.org/TR/html5/)

```
Youtube Haiku Player 0.1
Author: Simone Cingano (me@yupswing.it)
Repository: https://github.com/yupswing/youtubehaiku.net
Licence: MIT
```

# YOUTUBEHAIKU.NET

Youtube Haiku HTML5 Player is an HTML5 web application to play, continuosly, videos gathered from the Youtube Haiku subreddit ([/r/youtubehaiku](https://www.reddit.com/r/youtubehaiku)) in a nice and minimalist interface.

The app is live at <http://youtubehaiku.net>

You can choose the source of the videos (top posts, new posts), the range (today, this week, all time...) and the tags you want to exclude (haiku, poetry, meme, nsfw, load): in the app, a combination of those is called a "channel".

The video list is updated while you watch (or when you change the "channel") and will play forever until the end of the reddit (and trust me, there are a lot of videos to watch).

Every video shown is easily linked to the original post to allow viewers to upvote/downvote or comment: this is a player but the real deal is the subreddit itself.

## Licence

The project is released with the [MIT Licence](LICENCE).

You can fork, edit and distribute the app as you please, I just kindly ask to give me credit in your derivative works.

## Dev environment

After cloning the project you have to install the npm libraries: cd to the project root directory and then:

```
npm install
```

After that, using gulp (default), you can compile the code, start a watcher (recompile when you change a file) and a minimal web server with live reload (<http://localhost:3000>):

```
gulp
```

Otherwise you can just build the project for production, finding the final product in the `dist` folder:

```
gulp dist
```

## Features

- [x] Load and parse data from /r/youtubehaiku

  - [x] Support "start" and "end" parameters
  - [x] Extract tags (haiku, poetry and meme with special colors)

- [x] Load and use youtube player (iframe API)

  - [x] Basic "playlist" controls (previous, next, replay)
  - [x] Sync controls with player status
  - [x] Playing progress bar (adjusted to real video length)
  - [x] Buffering progress bar (animated!)
  - [x] Play/Pause button (+keyboard shortcut)

- [x] Logo links to the reddit
- [x] Show next video thumbnail and title
- [x] Keyboard controls
- [x] Video title links to reddit post
- [x] Settings in cookie (first time on site?)
- [x] Stop next/prev when reach end/start
- [x] Better console.logs (with ascii banner!)
- [x] info splash only first time (or when press H)

## Bugfixes

- [x] All interactive UI should not get higlighted (use A+HREF+ONLICK instead of DIV+ONCLICK)
- [x] Fix sudden end of video in loaded video
- [x] Playback from mobile cannot start automatically (manage the cue events)

## TODO

- [ ] batches by 25 videos per time with filters (or until you got at least 20 valid videos)
- [ ] load more videos on the fly when the batch is 5 videos away to the end

- [ ] choose/change channel (reset posts)

  - [ ] top in categories [all/day/...]
  - [ ] order by [hot/top...]
  - [ ] only haiku/meme/poetry
  
- [ ] better splash introduction (what is haiku, poetry, meme and how youtubehaiku was born)
