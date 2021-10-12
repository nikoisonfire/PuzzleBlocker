# PuzzleBlocker

![](source/logo.png)

Source repo for PuzzleBlocker Chrome extension

Edit: Decided to make the project open source. Why? Maybe someone wants to customize this tool to fit their personal productivity habits...

Learned many lessons building this thing, hopefully there is some wisdom for other browser extension makers in this 🤓

## Run

1. `npm run watch` - builds the extension into /distribution, watches for changes
2. `web-ext run` in distribution folder (starts firefox)

You can also test this in Chrome, Opera, Edge. Consult the [docs](https://github.com/mozilla/web-ext)

## What's in the code?

This code uses an open-source tangram generator by @Wiebke:
https://github.com/Wiebke/TangramGenerator

### background.js

background page file and redirect logic, also serves cache

### options.html/.js/.css

standard options page with @fregante's auto-sync

### redirect.js / .html, .css

page you're being redirect to when an URL is blacklisted in the options
game logic: displays puzzle and takes all the necessary steps

### /tangram

game logic files, customized to use modern JS (TangramGenerator wasn't updated since 2015)
