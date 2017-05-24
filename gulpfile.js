

require('source-map-support').install();

const ava = require('gulp-ava');
const clangFormat = require('clang-format');
const format = require('gulp-clang-format');
const gulp = require('gulp');
const merge = require('merge2');
const sourcemaps = require('gulp-sourcemaps');
const spawn = require('child_process').spawn;
const ts = require('gulp-typescript');

const sources = [ 'src/**/*.ts' ];
const tests = [ 'test/**/*.ts' ];
const allFiles = [ '*.js' ].concat(sources, tests);

function onError() { process.exit(1); }

gulp.task('test.check-format', () => {
  return gulp.src(allFiles)
      .pipe(format.checkFormat('file', clangFormat))
      .on('warning', onError);
});

gulp.task('format', () => {
  return gulp.src(allFiles, {base : '.'})
      .pipe(format.format('file', clangFormat))
      .pipe(gulp.dest('.'));
});

gulp.task('test.check-lint'); // TODO

gulp.task('compile', () => {
  const tsResult = gulp.src(sources)
                       .pipe(sourcemaps.init())
                       .pipe(ts.createProject('tsconfig.json')())
                       .on('error', onError);
  return merge([
    tsResult.dts.pipe(gulp.dest('build/definitions')),
    tsResult.js
        .pipe(sourcemaps.write(
            '.', {includeContent : false, sourceRoot : '../../src'}))
        .pipe(gulp.dest('build/src')),
    tsResult.js.pipe(gulp.dest('build/src'))
  ]);
});

gulp.task('test.compile', [ 'compile' ], () => {
  return gulp.src(tests, {base : '.'})
      .pipe(sourcemaps.init())
      .pipe(ts.createProject('tsconfig.json')())
      .on('error', onError)
      .pipe(
          sourcemaps.write('.', {includeContent : false, sourceRoot : '../..'}))
      .pipe(gulp.dest('build/'));
});

gulp.task('test.unit', [ 'test.compile' ], () => {
  return gulp.src([ 'build/test/**/*.js' ]).pipe(ava({verbose : true}));
});

gulp.task('test', [ 'test.unit', 'test.check-format', 'test.check-lint' ]);

gulp.task('serve', [ 'compile' ], () => {
  const child = spawn(process.execPath, ['build/src/index']);
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
});
gulp.task('default', [ 'serve' ]);