var gulp = require('gulp'),
  // utils
  usemin = require('gulp-usemin'),
  rename = require('gulp-rename'),
  rev = require('gulp-rev'),
  del = require('del'),
  runSequence = require('run-sequence'),
  // watcher & server
  connect = require('gulp-connect'),
  watch = require('gulp-watch'),
  // compilers
  concat = require('gulp-concat'),
  sass = require('gulp-sass'),
  replace = require('gulp-replace'),
  // min
  cleanCss = require('gulp-clean-css'),
  htmlmin = require('gulp-htmlmin'),
  uglify = require('gulp-uglify'),
  // log
  log = function(msg) {
    process.stdout.write(msg + '\n');
  };

log('============================ SOLweb GULP ============================');

// *****************************************************************************

var CONFIG = {
  minify: {
    maxLineLength: 80,
  },
  server: {
    root: 'dist',
    port: 3000,
    livereload: 35775, //default 35729
  },
};

var PATHS = {
  watch: 'src/**/*.*',
  src: {
    assets: 'assets/include/**/*',
    index: 'src/index.html',
    sass: 'src/app.scss',
    scripts: 'src/**/*.js',
  },
  tmp: {
    scripts: 'app.js', //relative, just the file name
    dir: 'tmp',
    index: 'tmp/index.html',
  },
  dist: 'dist',
};

/* ==== HELP =================================================================== */

gulp.task('help', function(done) {

  log(`
  - gulp
    DEV Execute gulp dist + watcher and livereload

  - gulp dist
    DIST put a production ready compiled app in /dist
`);

  done();
});

/* ==== DEFAULT ============================================================= */

gulp.task('default', function(done) {
  runSequence('dist', ['webserver', 'livereload', 'watch'], done);
});

/* ==== BUILD =============================================================== */

gulp.task('build', function(done) {
  runSequence(['index', 'sass', 'scripts'], done);
});

// Compile SASS into a file
gulp.task('index', function(done) {
  gulp.src(PATHS.src.index)
    .pipe(gulp.dest(PATHS.tmp.dir))
    .on('end', done);
});

// Compile SASS into a file
gulp.task('sass', function(done) {
  gulp.src([PATHS.src.sass])
    .pipe(sass({
      errLogToConsole: true
    }))
    .pipe(gulp.dest(PATHS.tmp.dir))
    .on('end', done);
});

// Concat SCRIPTS into a file and apply config
gulp.task('scripts', function(done) {
  gulp.src([PATHS.src.scripts])
    .pipe(concat(PATHS.tmp.scripts, {
      newLine: ';'
    }))
    .pipe(gulp.dest(PATHS.tmp.dir))
    .on('end', done);
});

/* ==== DIST ===================================================================
   Compile everything and pack it in dist/ */

gulp.task('dist', function(done) {
  runSequence('build', 'dist_clean', ['dist_assets', 'dist_compile'], done);
});

// Clean dist directory
gulp.task('dist_clean', function(callback) {
  return del([PATHS.dist + "**/*"], {
    force: true
  }, callback);
});

// Copy included assets
gulp.task('dist_assets', function(callback) {
  return gulp.src(PATHS.src.assets)
    .pipe(gulp.dest(PATHS.dist))
});

// Pack and move the <!-- builds --> in index.html
gulp.task('dist_compile', function() {
  return gulp.src(PATHS.tmp.index)
    .pipe(usemin({
      app_css: [
        cleanCss({
          keepSpecialComments: 0
        }),
        rev()
      ],
      app_js: [
        // commenting this will deobfuscate the code
        uglify({
          mangle: true
        }),
        rev()
      ],
      html: [
        htmlmin({
          conditionals: true,
          collapseWhitespace: true,
          spares: true,
          // maxLineLength: CONFIG.minify.maxLineLength,
          removeComments: true,
        })
      ],
      // inlinejs: [ uglify() ],
      // inlinecss: [ cleanCss(), 'concat' ]
    }))
    .pipe(gulp.dest(PATHS.dist));
});

/* ==== WATCH ==================================================================
   Look for changes in build parts */

gulp.task('watch', function() {
  gulp.watch([PATHS.watch], ['dist']);
});

/* ==== SERVER =================================================================
   Provide an HTTP server with livereload */

gulp.task('webserver', function() {
  connect.server({
    root: CONFIG.server.root,
    livereload: {
      port: CONFIG.server.livereload,
    },
    port: CONFIG.server.port
  });
});

gulp.task('livereload', function() {
  gulp.src([PATHS.dist])
    .pipe(watch([PATHS.dist]))
    .pipe(connect.reload());
});

/* ==== THE END ============================================================= */
