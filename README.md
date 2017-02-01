[![youtubehaiku.net](https://img.shields.io/badge/app-youtubehaiku.net-brightgreen.svg)](#) [![Simone Cingano](https://img.shields.io/badge/author-Simone%20Cingano-red.svg)](mailto:me@yupswing.it) [![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![HTML5](https://img.shields.io/badge/language-HTML5-orange.svg)](https://www.w3.org/TR/html5/)

```
Youtube Haiku Player 0.2.0
Author: Simone Cingano (me@yupswing.it)
Repository: https://github.com/yupswing/youtubehaiku.net
Licence: MIT
```

**NOTE: Thanks for checking out the source code :)
If you plan to fork the project I'll advise you to wait a few days (today is the 1st of February) because the code is going to be optimised soon.**

# YOUTUBEHAIKU.NET

Youtube Haiku Player is an HTML5 web application to play, continuosly, videos gathered from the Youtube Haiku subreddit ([/r/youtubehaiku](https://www.reddit.com/r/youtubehaiku)) in a nice and minimalist interface.

The app is live at <http://youtubehaiku.net>

You can choose the source of the videos (top posts, new posts...), the range (today, this week, all time...) and the tags you want to exclude (haiku, poetry, meme, nsfw).

The video list is updated while you watch (or when you change the "channel") and will play forever until the end of the reddit (which is at max 1000 posts by reddit design)

Every video shown is easily linked to the original post to allow viewers to upvote/downvote or comment.

## Licence

The project is released under the [MIT Licence](LICENCE).

You can fork, edit and distribute the app as you please, **I just kindly ask to give me credit in your derivative works.**

## Dev environment

After cloning the project you have to install the npm libraries: cd to the project root directory and then:

```
npm install
```

After that, using gulp, you can compile the code, start a watcher (recompile when you change a file) and start a minimal web server with live reload (default at <http://localhost:3000>):

```
gulp
```

Otherwise you can just build the project for production: you will find the distibution files in the `dist` folder:

```
gulp dist
```

## TODO

- [ ] optimise the code (removed unused stuff, refactor, less computation, less styles)

## Features

- [x] Load and parse data from /r/youtubehaiku

  - [x] Support "start" and "end" parameters
  - [x] Extract tags (haiku, poetry and meme, then show them with official colors)

- [x] Load and use youtube player (iframe API)

  - [x] Basic "playlist" controls (previous, next, replay)
  - [x] Sync controls with player status
  - [x] Playing progress bar (adjusted to real video length)
  - [x] Buffering progress bar (animated!)
  - [x] Play/Pause button

- [x] Show next video thumbnail and title (click play next video)
- [x] Keyboard controls
- [x] Logo links to the subreddit
- [x] Video title links to reddit post
- [x] Show upvotes and submitter
- [x] Settings in cookie (first time on site and channel preferences)
- [x] Stop next/prev when reached end/start
- [x] Better console.logs (with ascii banner!)
- [x] Channels

  - [x] Choose what tags you want in the channel (haiku, poetry, meme and nsfw)
  - [x] Choose channel (reset player)

- [x] Videos forever

  - [x] Loads 40 posts per time with filters (or until you got at least 20 valid posts)
  - [x] Loads more posts on the fly when the buffer is 10 posts away to the end
  - [x] Start the player when you have 3 valid posts in the buffer
  
- [x] favicon


## Bugfixes

- [x] All interactive UI should not get higlighted (use A+HREF+ONLICK instead of DIV+ONCLICK)
- [x] Fix sudden end of video in loaded video
- [x] Playback from mobile cannot start automatically (let the user start)
- [x] Sanitize strings in html
- [x] Remove hover effects on mobile to avoid :hover remains after a "click"
