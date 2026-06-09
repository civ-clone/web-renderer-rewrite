(async () => {
  const { build, context } = require('esbuild'),
    { sassPlugin } = require('esbuild-sass-plugin');

  const isWatch = process.argv.includes('watch');
  const isDev = process.argv.includes('dev');

  const buildOptions = {
    entryPoints: [
      'src/css/app.scss',
      'src/js/backend.ts',
      'src/js/frontend.ts'
    ],
    bundle: true,
    keepNames: true,
    minify: !isDev,
    sourcemap: true,
    outdir: 'dist',
    plugins: [
      sassPlugin(),
    ],
    loader: {
      '.build': 'text',
      '.jpg': 'file',
      '.png': 'dataurl',
      '.svg': 'dataurl'
    },
    entryNames: '[name]',
  };

  if (isWatch) {
    const ctx = await context(buildOptions);
    console.log('\x1b[32mWatching...\x1b[0m');
    await ctx.watch();
  } else {
    process.stdout.write('Building... ');
    await build(buildOptions)
      .then(() => console.log('\x1b[32mdone.\x1b[0m'))
      .catch((e) => {
        console.log('\x1b[31mfailed.\x1b[0m');
        console.error(e);
        process.exit(1);
      });
  }
})();