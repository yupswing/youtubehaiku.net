# YOUTUBEHAIKU.NET

Youtube Haiku HTML5 Player is an HTML5 web application to play, continuosly, videos gathered from the Youtube Haiku subreddit ([/r/youtubehaiku](https://www.reddit.com/r/youtubehaiku)) in a nice and minimalist interface.

You can choose the source of the videos (top posts, new posts), the range (today, this week, all time...) and the tags you want to exclude (haiku, poetry, meme, nsfw, load): in the app, a combination of those is called a "channel".

The video list is updated while you watch (or when you change the "channel") and will play forever until the end of the reddit (and trust me, there are a lot of videos to watch).

The idea came up to give myself a nice interface to enjoy the latest videos without even interacting with the computer (as a television), but it suits very good also people that don't know reddit or youtube haiku and interest them in the subreddit.

Every video shown is easily linked to the original post to allow viewers to upvote/downvote or comment: this is a player but the real thing will always be the subreddit :)

## Dev environment

After cloning the project you have to install the npm libraries: cd to the project root directory and then:
```
npm install
```

After that, using gulp (default), you can compile the code, start a watcher (recompile when you change a file) and a minimal web server with live reload (http://localhost:3000):
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
  - [x] Play/Pause button (+keyboard shortcut)
- [x] Logo links to the reddit
- [x] Show next video thumbnail and title
- [x] Keyboard controls
- [x] Video title links to reddit post

## Bugfixes
- [x] Fix sudden end of video in loaded video 

## TODO

- [ ] batches by 10 videos with filters until you got at least 10 valid videos
  - [ ] (keep last loaded for next batch)
- [ ] load more videos on the fly when the batch is 5 videos away to the end
- [ ] (keep the playlist)


- [ ] choose/change channel (reset posts)
  - [ ] top in categories (all/day/...)
  - [ ] order by hot/top...
  - [ ] only haiku/meme/poetry
- [ ] waiting screen (instead of player)
- [ ] info splash
